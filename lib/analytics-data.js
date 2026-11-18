import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { dayKey } from "@/lib/ads";
import { verifyTrk } from "@/lib/track-token";
import { learnFromSignals } from "@/lib/interests-data";
import { signalsOf } from "@/lib/interests";

// Post analytics, written ONLY by the server.
//
//   postStats/{postId} = {
//     views, clicks,                       totals
//     vSrc: { feed, following, recommend, postrec, saved, events, direct },   views per surface
//     cSrc: { feed, ... },                 clicks per surface   (CTR = clicks / views, per surface or overall)
//     days: { d20261118: { v, c } },       per UTC day
//     updatedAt
//   }
//
// What counts:
//   view   a post the server served in a list AND that the member then actually had on screen
//          (the browser hands back the server-signed token; see lib/track-token.js), or a direct
//          visit to /p/{id} (a real browser opening the link, counted by the server, no JS needed)
//   click  the member opened the post from that list (token again)
// A post's author is never counted on their own posts (no tokens are issued for them).
//
// One write per post per request however many events it carries, and none of this reads Firestore.

const stats = (id) => getAdminDb().collection("postStats").doc(id);
const inc = FieldValue.increment;

const VIEW_WINDOW = 10 * 60_000; // the same member re-seeing the same post on the same surface counts once per 10 min
const CLICK_WINDOW = 20_000;
const recent = new Map();
function seenRecently(key, windowMs, now = Date.now()) {
  const t = recent.get(key);
  if (t && now - t < windowMs) return true;
  recent.set(key, now);
  if (recent.size > 8000) for (const [k, at] of recent) if (now - at > 15 * 60_000) recent.delete(k);
  return false;
}

// Plain per-minute cap per viewer so one client can't flood the endpoint.
const buckets = new Map();
function overLimit(viewerKey, n, now = Date.now()) {
  const b = buckets.get(viewerKey);
  if (!b || now - b.at > 60_000) { buckets.set(viewerKey, { at: now, n }); return n > 300; }
  b.n += n;
  return b.n > 300;
}

function add(map, postId) {
  let e = map.get(postId);
  if (!e) { e = { v: {}, c: {} }; map.set(postId, e); }
  return e;
}

function patchOf(e, day) {
  const v = Object.values(e.v).reduce((a, b) => a + b, 0);
  const c = Object.values(e.c).reduce((a, b) => a + b, 0);
  const p = { updatedAt: FieldValue.serverTimestamp() };
  if (v) { p.views = inc(v); p.vSrc = Object.fromEntries(Object.entries(e.v).map(([k, n]) => [k, inc(n)])); }
  if (c) { p.clicks = inc(c); p.cSrc = Object.fromEntries(Object.entries(e.c).map(([k, n]) => [k, inc(n)])); }
  p.days = { [day]: { ...(v ? { v: inc(v) } : {}), ...(c ? { c: inc(c) } : {}) } };
  return p;
}

// `seen`: tokens of posts the browser reports as on screen. `click`: the token of the post just opened.
// Everything is re-derived from the signed tokens; the request itself decides nothing.
export async function recordTrack({ seen = [], click = null, uid = null, viewerKey }) {
  const list = (Array.isArray(seen) ? seen : []).slice(0, 40);
  if (overLimit(viewerKey, list.length + (click ? 1 : 0))) return { counted: 0 };
  const agg = new Map();
  let counted = 0;

  for (const tok of list) {
    const t = verifyTrk(tok, uid);
    if (!t || seenRecently(`v|${viewerKey}|${t.postId}|${t.source}`, VIEW_WINDOW)) continue;
    add(agg, t.postId).v[t.source] = (add(agg, t.postId).v[t.source] || 0) + 1;
    counted += 1;
  }

  let learnSig = null;
  if (click) {
    const t = verifyTrk(click, uid);
    if (t && !seenRecently(`c|${viewerKey}|${t.postId}|${t.source}`, CLICK_WINDOW)) {
      const e = add(agg, t.postId);
      e.c[t.source] = (e.c[t.source] || 0) + 1;
      learnSig = t.sig;
      counted += 1;
    }
  }

  const day = dayKey();
  const writes = [...agg].map(([id, e]) => stats(id).set(patchOf(e, day), { merge: true }));
  if (uid && learnSig) writes.push(learnFromSignals(uid, [learnSig], "click"));
  await Promise.all(writes);
  return { counted };
}

// A real browser opened /p/{id} by link (shared URL, bookmark, refresh): +1 view, source "direct".
// Called by the post page itself, so there is nothing for a client to fake. Crawlers and link
// previews are skipped. `post` is the mapped post the page just loaded.
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|discord|whatsapp|telegram|slack|curl|wget|python|node-fetch|headless|lighthouse/i;
export function isRealBrowserVisit(h) {
  if ((h.get("sec-fetch-dest") || "") !== "document") return false; // in-app navigation and prefetch are not "dialled in" visits
  if ((h.get("sec-fetch-mode") || "") !== "navigate") return false;
  if (h.get("purpose") === "prefetch" || h.get("next-router-prefetch")) return false;
  return !BOT.test(h.get("user-agent") || "");
}

export async function recordDirectView({ post, uid = null, viewerKey }) {
  try {
    if (!post || post.isOwner) return;
    if (seenRecently(`v|${viewerKey}|${post.id}|direct`, VIEW_WINDOW)) return;
    const e = { v: { direct: 1 }, c: {} };
    const writes = [stats(post.id).set(patchOf(e, dayKey()), { merge: true })];
    if (uid) writes.push(learnFromSignals(uid, [signalsOf(post)], "click"));
    await Promise.all(writes);
  } catch (err) {
    console.error("[analytics] direct view failed", err);
  }
}
