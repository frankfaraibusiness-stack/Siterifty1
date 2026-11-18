import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { HttpError } from "@/lib/chat-social";
import { authorHides, canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { commentsRef } from "@/lib/comments-data";
import { getFollowingUids } from "@/lib/social-data";
import { getPrefs } from "@/lib/user-prefs";
import { postImageUrl } from "@/lib/media-url";
import { cleanTz, dayKey, heatLevel, heatScore, hashStr, packageFor } from "@/lib/videos-config";
import { applyEvents, cleanEvents, normalizePlayer, viewOf } from "@/lib/videos-engine";

// The Videos tab on Firestore.
//
//   videoPlayers/{uid}   one small doc per member: XP, streak, today's counters and
//                        the list of actions already paid today (see videos-engine.js)
//
// The feed itself is just the `posts` collection filtered to uploaded video
// clips. Like the main feed, every query uses ONE field (createdAt), so no
// composite index is needed; filtering and ranking happen in memory.
const PLAYERS = "videoPlayers";
const SCAN_BATCH = 100;
const SCAN_MAX = 300; // newest posts looked at per request
const PAGE = 12;
const HOT_KEEP = 48; // "Hot" is the hottest this many clips of the newest few hundred posts

export const FEED_MODES = ["hot", "new", "following"];

const isClip = (d) => d.type === "video" && d.media?.type === "video" && d.media?.kind === "storage";

// ------------------------------------------------------------- the feed
async function scanClips(db, { uid, beforeMs, want, maxDocs = SCAN_MAX, only }) {
  const found = [];
  let cursor = beforeMs;
  let scanned = 0;
  let last = 0;
  let more = false;
  while (found.length < want && scanned < maxDocs) {
    let q = db.collection("posts").orderBy("createdAt", "desc");
    q = cursor ? q.where("createdAt", "<", Timestamp.fromMillis(cursor)) : q.where("createdAt", "<=", Timestamp.now());
    const snap = await q.limit(SCAN_BATCH).get();
    for (const doc of snap.docs) {
      scanned += 1;
      const d = doc.data();
      last = d.createdAt?.toMillis?.() ?? last;
      if (isClip(d) && canView(d, uid) && (!only || only(d))) found.push(doc);
    }
    more = snap.size === SCAN_BATCH;
    if (!more) break;
    cursor = last;
  }
  return { docs: found, last, more };
}

function toClip(doc, { uid, authors, day, found }) {
  const post = mapPostDoc(doc, uid, authors);
  const m = post.media;
  const ageHours = post.createdAtMs ? (Date.now() - post.createdAtMs) / 3_600_000 : 0;
  const hideLikes = post.settings.hideLikes === true && !post.isOwner;
  const heatIn = { likes: post.likesCount, comments: post.comments, shares: post.shares, ageHours };
  const pkg = !post.isOwner && !found.has(post.id) ? packageFor(post.id, day) : null;
  return {
    id: post.id,
    user: post.user,
    initial: post.initial,
    avatarA: post.avatarA,
    avatarB: post.avatarB,
    hasAvatar: post.hasAvatar,
    avatarV: post.avatarV,
    plan: post.plan,
    title: post.title || "",
    text: post.text,
    tags: post.tags || [],
    src: `/video/${post.id}`,
    poster: m.hasPoster ? postImageUrl(post.id, 0) : null,
    seconds: m.seconds || 0,
    timeAgo: post.timeAgo,
    likes: hideLikes ? null : post.likesCount,
    likedByMe: post.likedByMe,
    savedByMe: post.savedByMe,
    comments: post.comments,
    commentsOff: post.settings.comments === false,
    heat: heatLevel(heatIn),
    own: post.isOwner,
    spoiler: post.settings.spoiler === true,
    pkg,
    _score: heatScore(heatIn),
  };
}

// One clip by id, shaped like the feed's, or null when it isn't a playable clip for this person.
async function loadLead(db, id, { uid, day, found, blocked }) {
  try {
    const snap = await db.collection("posts").doc(id).get();
    if (!snap.exists) return null;
    const d = snap.data();
    if (!isClip(d) || !canView(d, uid)) return null;
    if (blocked.size && blocked.has(String(d.user || "").toLowerCase())) return null;
    const authors = await loadAuthors(db, [snap]);
    if (authorHides(d, authors, uid)) return null;
    return toClip(snap, { uid, authors, day, found });
  } catch (err) {
    console.error("videos: could not load the opened clip", err);
    return null;
  }
}

// GET /api/videos: one page of clips. `cursor` is opaque (`t:<ms>` for time
// order, `h:<offset>` for Hot). Hot sorts by heat, with clips you have not
// finished today first, and breaks ties the same way all day so paging is stable.
export async function getFeed(user, { mode = "hot", cursor = "", tz = 0, start = "" } = {}) {
  if (!FEED_MODES.includes(mode)) throw new HttpError(400, "Unknown feed.");
  const db = getAdminDb();
  const uid = user?.uid;
  if (mode === "following" && !uid) return { items: [], next: null, empty: "login" };
  const day = dayKey(Date.now(), cleanTz(tz));

  const [prefs, player, following] = await Promise.all([
    uid ? getPrefs(uid).catch(() => null) : null,
    uid ? readPlayer(db, uid) : null,
    mode === "following" ? getFollowingUids(uid).catch(() => []) : null,
  ]);
  const blocked = new Set(prefs?.safety?.blocked || []);
  const todays = normalizePlayer(player, day).today;
  const found = new Set(todays.acts.filter((a) => a.startsWith("package:")).map((a) => a.slice(8)));
  const finished = new Set(todays.acts.filter((a) => a.startsWith("watch:")).map((a) => a.slice(6)));
  const followSet = following ? new Set(following) : null;

  const only = (d) => {
    if (followSet && !followSet.has(d.uid)) return false;
    if (blocked.size && blocked.has(String(d.user || "").toLowerCase())) return false;
    return true;
  };
  const shape = async (docs) => {
    const authors = await loadAuthors(db, docs);
    return docs
      .filter((doc) => !authorHides(doc.data(), authors, uid))
      .map((doc) => toClip(doc, { uid, authors, day, found }));
  };
  const strip = ({ _score, ...clip }) => clip;

  // A clip opened from elsewhere (/videos?v=ID) goes first on the first page, if this person may watch it.
  const lead =
    !cursor && /^[A-Za-z0-9_-]{1,100}$/.test(start)
      ? await loadLead(db, start, { uid, day, found, blocked })
      : null;
  const withLead = (page) =>
    lead ? { ...page, items: [strip(lead), ...page.items.filter((c) => c.id !== lead.id)] } : page;

  if (mode === "hot") {
    const offset = cursor.startsWith("h:") ? Math.max(0, Number(cursor.slice(2)) || 0) : 0;
    const { docs } = await scanClips(db, { uid, want: 400, only });
    const clips = await shape(docs);
    clips.sort((a, b) => {
      const fa = finished.has(a.id) ? 1 : 0;
      const fb = finished.has(b.id) ? 1 : 0;
      if (fa !== fb) return fa - fb;
      return b._score - a._score || hashStr(`${day}:${a.id}`) - hashStr(`${day}:${b.id}`);
    });
    const ranked = clips.slice(0, HOT_KEEP);
    const items = ranked.slice(offset, offset + PAGE).map(strip);
    const end = offset + PAGE;
    return withLead({ items, next: end < ranked.length ? `h:${end}` : null });
  }

  const beforeMs = cursor.startsWith("t:") ? Math.max(0, Number(cursor.slice(2)) || 0) || undefined : undefined;
  const { docs, last, more } = await scanClips(db, { uid, beforeMs, want: PAGE, only });
  const clips = await shape(docs);
  return withLead({ items: clips.map(strip), next: more && docs.length >= PAGE ? `t:${last}` : null });
}

// ------------------------------------------------------------- the player
async function readPlayer(db, uid) {
  const snap = await db.collection(PLAYERS).doc(uid).get();
  return snap.exists ? snap.data() : null;
}

export async function getProgress(user, { tz = 0 } = {}) {
  const day = dayKey(Date.now(), cleanTz(tz));
  const raw = await readPlayer(getAdminDb(), user.uid);
  return { view: viewOf(raw, day), serverNow: Date.now() };
}

// What the server itself can see about each clip a claim names.
async function loadFacts(db, user, events, { day, tz }) {
  const ids = [...new Set(events.filter((e) => e.postId).map((e) => e.postId))];
  const facts = new Map();
  if (!ids.length) return facts;
  const snaps = await db.getAll(...ids.map((id) => db.collection("posts").doc(id)), {
    fieldMask: ["uid", "type", "media", "likedBy", "savedBy", "settings", "createdAt", "poll"],
  });
  const dayStart = Date.parse(`${day}T00:00:00Z`) - cleanTz(tz) * 60_000;
  const wantsComment = new Set(events.filter((e) => e.type === "comment").map((e) => e.postId));
  await Promise.all(
    snaps.map(async (snap) => {
      const d = snap.exists ? snap.data() : null;
      if (!d || !isClip(d) || !canView(d, user.uid)) return;
      let commented = false;
      if (wantsComment.has(snap.id)) {
        const mine = await commentsRef(db, snap.id).where("uid", "==", user.uid).limit(10).get();
        commented = mine.docs.some((c) => (c.data().createdAt?.toMillis?.() ?? 0) >= dayStart);
      }
      facts.set(snap.id, {
        own: d.uid === user.uid,
        liked: (d.likedBy || []).includes(user.uid),
        saved: (d.savedBy || []).includes(user.uid),
        commented,
        duration: Number(d.media?.seconds) || 0,
      });
    })
  );
  return facts;
}

// POST /api/videos/progress { events, tz }. Claims in, verdicts out.
export async function submitEvents(user, rawEvents, { tz = 0 } = {}) {
  const db = getAdminDb();
  const events = cleanEvents(rawEvents);
  const day = dayKey(Date.now(), cleanTz(tz));
  const facts = events.length ? await loadFacts(db, user, events, { day, tz }) : new Map();
  const ref = db.collection(PLAYERS).doc(user.uid);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const out = applyEvents(snap.exists ? snap.data() : null, events, {
      day,
      nowMs: Date.now(),
      facts: (id) => facts.get(id) || null,
    });
    if (events.length) tx.set(ref, { ...out.player, uid: user.uid, username: user.username });
    return out;
  });

  return {
    view: viewOf(result.player, day),
    awards: result.awards,
    missionsDone: result.missionsDone,
    streak: result.streak,
    rankUp: result.rankUp,
    serverNow: Date.now(),
  };
}
