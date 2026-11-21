import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { ADS_FREE_WHILE_TESTING, dayKey } from "@/lib/ads";
import { forgetAd, serveAd, syncAdIndex } from "@/lib/ads-data";
import { getUserPlan } from "@/lib/user-plan";
import { canUploadLongForm } from "@/lib/plans";
import {
  MAX_ADS, MIN_GAP_SECONDS, TOKEN_TTL_MS, WINDOW_MS,
  adSeconds, cleanAdPrefs, countsAfterSeconds, creatorMicros, isMonetizedPost, planBreaks,
} from "@/lib/instream-ads";

// In-stream ads on monetized Long form videos. Everything that matters happens HERE, on the server:
// which breaks a video has, whether a viewer may be shown one, which ad, and every cent the creator earns.
// The browser only plays what it is handed and reports back with a signed, single-use token.
//
// Firestore layout (all written only by this file)
//   adSessions/{postId}_{viewer}   one viewer's ad spots on one video within a 6 hour window:
//                                  { ws, last, br: { "0": servedAtMs, ... } }. Decides "already shown", "max 3" and
//                                  "60 seconds apart" (real time) so replays and refreshes can't farm ads.
//   adCredits/{tokenId}            the ledger: one row per paid ad view { uid, postId, adId, adType, micros, at }.
//                                  Created inside the same transaction as the counters, so a view is paid at most once.
//   postEarnings/{postId}          { uid, title, views, imageViews, videoViews, micros, days: { d2026..: { v, m } } }
//   creatorEarnings/{uid}          the same totals across all of a creator's videos
//   ads/{adId}                     the advertiser's view counter, moved in the same transaction (so a creator is never
//                                  paid for a view the advertiser wasn't charged for, and an ad never over-delivers)
//
// A view counts (and pays) once the ad has really played for min(its length, 5 seconds): the server checks the
// time that has passed since it issued the ad. The creator's own ads, and views by the creator, never count.

const db = () => getAdminDb();
const inc = FieldValue.increment;
const ID = /^[A-Za-z0-9_-]{1,100}$/;

function secret() {
  const raw = process.env.SESSION_SECRET || (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!raw) throw new Error("Set SESSION_SECRET (or FIREBASE_PRIVATE_KEY).");
  return `ins:${raw}`; // a different key from the login cookie's and the analytics tokens'
}
const sign = (body) => createHmac("sha256", secret()).update(body).digest("base64url").slice(0, 32);
const viewerHash = (key) => createHash("sha256").update(String(key || "anon")).digest("hex").slice(0, 20);

function issueToken(p, now) {
  const body = Buffer.from(JSON.stringify({ a: p.adId, p: p.postId, i: p.idx, v: p.vk, t: now })).toString("base64url");
  return `${body}.${sign(body)}`;
}

function readToken(token, vk, now) {
  if (typeof token !== "string" || token.length > 400) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = sign(body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p || !ID.test(p.a || "") || !ID.test(p.p || "") || p.v !== vk) return null;
    if (now - p.t > TOKEN_TTL_MS || p.t > now + 60_000) return null;
    return { adId: p.a, postId: p.p, idx: Number(p.i), issuedAt: p.t, tokenId: sig };
  } catch {
    return null;
  }
}

// A plain per-viewer cap so one client can't hammer the endpoint.
const buckets = new Map();
function overLimit(vk, now = Date.now()) {
  const b = buckets.get(vk);
  if (!b || now - b.at > 10 * 60_000) { buckets.set(vk, { at: now, n: 1 }); return false; }
  b.n += 1;
  if (buckets.size > 5000) for (const [k, v] of buckets) if (now - v.at > 10 * 60_000) buckets.delete(k);
  return b.n > 40;
}

// ---- who is eligible --------------------------------------------------------------------------

const planCache = new Map(); // uid -> { at, ok }
async function creatorEligible(uid) {
  const c = planCache.get(uid);
  if (c && Date.now() - c.at < 60_000) return c.ok;
  const ok = canUploadLongForm(await getUserPlan(uid));
  planCache.set(uid, { at: Date.now(), ok });
  return ok;
}

// ---- 1. a break is due: pick the ad ------------------------------------------------------------

// -> { ad, token } or { ad: null }. The viewer is only ever shown an ad when ALL of this holds:
//   the post is monetized and its creator is still on a plan that allows it; the break exists in the video's plan;
//   this viewer hasn't had that spot in the last 6 hours; fewer than the creator's limit (max 3) were shown;
//   at least 60 seconds passed since their last ad on this video; and there is a live ad of the type the creator allows.
// When any of it fails, or no ad is running, the answer is just "no ad" and the video plays on.
export async function serveInstreamAd({ postId, idx, exclude = [], viewerUid = null, viewerKey }) {
  const now = Date.now();
  const n = Number(idx);
  if (!ID.test(String(postId || "")) || !Number.isInteger(n) || n < 0 || n >= MAX_ADS) return { ad: null };
  const vk = viewerHash(viewerKey);
  if (overLimit(vk, now)) return { ad: null };

  const snap = await db().collection("posts").doc(postId).get();
  const post = snap.data();
  if (!post || viewerUid === post.uid || !isMonetizedPost(post, now)) return { ad: null };
  if (!(await creatorEligible(post.uid))) return { ad: null };

  const prefs = cleanAdPrefs(post.media.adPrefs);
  const plan = planBreaks(post.media.seconds, prefs);
  if (!plan.some((b) => b.idx === n)) return { ad: null };

  const ad = await serveAd("videos", exclude.filter((id) => ID.test(id)).slice(-3), {
    type: prefs.kind === "mixed" ? "" : prefs.kind,
    noPrefer: true,
    skipOwner: post.uid,
  });
  if (!ad) return { ad: null };

  // Reserve the spot. Done AFTER finding an ad so an empty ad inventory never uses up a viewer's spot.
  const sref = db().collection("adSessions").doc(`${postId}_${vk}`);
  const reserved = await db().runTransaction(async (tx) => {
    const s = await tx.get(sref);
    let d = s.exists ? s.data() : null;
    if (!d || !d.ws || now - d.ws > WINDOW_MS) d = { ws: now, last: 0, br: {} };
    const br = d.br || {};
    if (br[n]) return false;
    if (Object.keys(br).length >= Math.min(MAX_ADS, plan.length)) return false;
    if (d.last && now - d.last < (MIN_GAP_SECONDS - 3) * 1000) return false;
    tx.set(sref, { ws: d.ws, last: now, br: { ...br, [n]: now }, postId });
    return true;
  });
  if (!reserved) return { ad: null };

  return { ad, token: issueToken({ adId: ad.id, postId, idx: n, vk }, now), idx: n, seconds: adSeconds(ad) };
}

// ---- 2. the ad has played: count the view, pay the creator -------------------------------------------

// -> { credited: boolean }. One transaction moves the advertiser's counter and every earnings total, so the
// numbers can't drift apart. Nothing here trusts the browser beyond "this token was issued to you":
// the ad's type (and so the money) comes from the ad's own document, the creator from the post's.
export async function completeInstreamView({ token, viewerUid = null, viewerKey }) {
  const now = Date.now();
  const vk = viewerHash(viewerKey);
  const t = readToken(token, vk, now);
  if (!t) return { credited: false };

  const day = dayKey(now);
  const adRef = db().collection("ads").doc(t.adId);
  const postRef = db().collection("posts").doc(t.postId);
  const creditRef = db().collection("adCredits").doc(t.tokenId);

  const out = await db().runTransaction(async (tx) => {
    const [credit, adSnap, postSnap] = await Promise.all([tx.get(creditRef), tx.get(adRef), tx.get(postRef)]);
    if (credit.exists) return { credited: false }; // this token was already paid
    const ad = adSnap.data();
    const post = postSnap.data();
    if (!ad || !post || !isMonetizedPost(post, now)) return { credited: false };
    if (viewerUid && (viewerUid === ad.ownerUid || viewerUid === post.uid)) return { credited: false };
    if (ad.ownerUid === post.uid) return { credited: false };
    if (ad.status !== "active" || (ad.views || 0) >= (ad.viewsBought || 0)) return { credited: false };

    // Really played long enough? (a second of slack for network delay)
    const seconds = adSeconds({ media: { kind: ad.type === "video" ? "video" : "image", duration: ad.durationSec } });
    if (now - t.issuedAt < countsAfterSeconds(seconds) * 1000 - 1000) return { credited: false };

    const type = ad.type === "video" ? "video" : "image";
    const micros = creatorMicros(type);
    const exhausted = (ad.views || 0) + 1 >= (ad.viewsBought || 0);

    // advertiser side (same shape as lib/ads-data.js track)
    const adPatch = { views: inc(1), vSrc: { videos: inc(1) }, days: { [day]: { v: inc(1) } } };
    if (exhausted) adPatch.status = "exhausted";
    tx.set(adRef, adPatch, { merge: true });

    // creator side
    const typed = type === "video" ? { videoViews: inc(1) } : { imageViews: inc(1) };
    const totals = { views: inc(1), micros: inc(micros), ...typed, days: { [day]: { v: inc(1), m: inc(micros) } }, updatedAt: FieldValue.serverTimestamp() };
    tx.set(db().collection("postEarnings").doc(t.postId), { uid: post.uid, title: String(post.title || "").slice(0, 80), ...totals }, { merge: true });
    tx.set(db().collection("creatorEarnings").doc(post.uid), { uid: post.uid, ...totals }, { merge: true });

    // the ledger row (also what stops this token being paid twice)
    tx.create(creditRef, {
      uid: post.uid, postId: t.postId, adId: t.adId, adType: type, micros, idx: t.idx,
      day, at: FieldValue.serverTimestamp(),
      // Advertisers aren't charged yet while ADS_FREE_WHILE_TESTING is on (lib/ads.js). Kept per row for the books.
      advertiserCharged: !ADS_FREE_WHILE_TESTING,
    });
    return { credited: true, exhausted: exhausted ? ad.placements || [] : null };
  });

  if (out.exhausted) {
    forgetAd(t.adId);
    await syncAdIndex(t.adId, out.exhausted, false).catch(() => {});
  }
  return { credited: !!out.credited };
}

// ---- reading earnings (owner only: the callers pass the signed-in member's uid) -----------------------

const dayRows = (days, n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const key = dayKey(Date.now() - i * 86_400_000);
    out.push({ key, views: days?.[key]?.v || 0, micros: days?.[key]?.m || 0 });
  }
  return out;
};

const shape = (id, d) => ({
  id,
  title: d.title || "",
  views: d.views || 0,
  imageViews: d.imageViews || 0,
  videoViews: d.videoViews || 0,
  micros: d.micros || 0,
  last7: dayRows(d.days, 7),
});

// Earnings of ONE video, or null when it isn't the viewer's or hasn't earned anything yet.
export async function postEarnings(postId, uid) {
  if (!uid || !ID.test(String(postId || ""))) return null;
  const snap = await db().collection("postEarnings").doc(postId).get();
  const d = snap.data();
  return d && d.uid === uid ? shape(postId, d) : null;
}

// Everything a creator has earned: totals, the last 7 days and each video (best first).
export async function creatorEarnings(uid) {
  if (!uid) return { total: shape("all", {}), videos: [] };
  const [totalSnap, listSnap] = await Promise.all([
    db().collection("creatorEarnings").doc(uid).get(),
    db().collection("postEarnings").where("uid", "==", uid).limit(200).get(),
  ]);
  const videos = listSnap.docs.map((x) => shape(x.id, x.data())).sort((a, b) => b.micros - a.micros);
  return { total: shape("all", totalSnap.data() || {}), videos };
}
