import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorHides, canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { applyViewerFilters } from "@/lib/viewer-filters";
import { postImageUrl } from "@/lib/media-url";
import { schedulePollPurge } from "@/lib/poll-expiry";

// "More to explore" under a post (/p/[id]). One function decides what comes next:
//
//   fetchRecommendations({ currentUid, prefs, excludeId, before, limit })
//
// For now it is simply "every other post, newest first". When the real
// algorithm arrives (watch history, likes, who you follow), this is the only
// place to change: rank/filter the candidates inside `pickCandidates`, keep the
// { items, next, more } shape and nothing else in the app needs to know.
//
// Paging is by `before` (the createdAt, in ms, of the last post that was
// scanned), so a page never repeats or skips a post, however many are skipped
// along the way (private, blocked, muted words, the post being read).

export const REC_PAGE = 12;
const SCAN = 30; // posts read from Firestore per round
const MAX_ROUNDS = 4; // rounds per request, so a request can never run away

const clip = (s, n) => {
  const t = String(s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

// What a small card needs, and nothing more. Spoiler posts leave the server
// already hidden: the card never receives their title, text or picture.
function thumbOf(post) {
  const m = post.media;
  if (!m) return null;
  if (m.type === "images") return { src: postImageUrl(post.id, 0), count: m.count || 1 };
  if (m.type === "video") {
    if (m.kind === "youtube" && m.ytId) return { src: `https://i.ytimg.com/vi/${m.ytId}/hqdefault.jpg`, play: true };
    return m.hasPoster ? { src: postImageUrl(post.id, 0), play: true } : { play: true };
  }
  // Older posts stored plain colour tiles instead of pictures.
  const tile = m.tiles?.[0];
  return tile ? { a: tile.a, b: tile.b } : null;
}

export function toRec(post) {
  const hidden = !!post.settings?.spoiler;
  return {
    id: post.id,
    user: post.user,
    initial: post.initial,
    avatarA: post.avatarA,
    avatarB: post.avatarB,
    hasAvatar: post.hasAvatar,
    avatarV: post.avatarV,
    type: post.type,
    spoiler: hidden,
    title: hidden ? "" : clip(post.title, 110),
    text: hidden ? "" : clip(post.text, 140),
    thumb: hidden ? null : thumbOf(post),
    hasMedia: !!post.media,
    likes: post.settings?.hideLikes && !post.isOwner ? null : post.likesCount,
    comments: post.settings?.comments === false ? null : post.comments,
    timeAgo: post.timeAgo,
  };
}

// Candidates for one round: the next SCAN posts older than `bound`, already
// checked for visibility. This is where a ranking step will go.
async function pickCandidates(db, { bound, inclusive, currentUid }) {
  let q = db.collection("posts").orderBy("createdAt", "desc");
  q = inclusive ? q.where("createdAt", "<=", bound) : q.where("createdAt", "<", bound);
  const snap = await q.limit(SCAN).get();
  const live = snap.docs.filter((doc) => canView(doc.data(), currentUid));
  const authors = await loadAuthors(db, live);
  const docs = live.filter((doc) => !authorHides(doc.data(), authors, currentUid));
  return {
    scanned: snap.docs.length,
    lastMs: snap.docs.length ? snap.docs[snap.docs.length - 1].data().createdAt?.toMillis?.() ?? null : null,
    posts: docs.map((doc) => mapPostDoc(doc, currentUid, authors)),
  };
}

// Returns { items, next, more }. Omit `before` for the first page.
export async function fetchRecommendations({ currentUid = null, prefs, excludeId = "", before = null, limit = REC_PAGE } = {}) {
  schedulePollPurge();
  const db = getAdminDb();
  const items = [];
  let bound = before ? Timestamp.fromMillis(before) : Timestamp.now();
  let inclusive = !before;
  let next = before || null;
  let more = true;

  for (let round = 0; round < MAX_ROUNDS && items.length < limit && more; round += 1) {
    const got = await pickCandidates(db, { bound, inclusive, currentUid });
    const { posts } = applyViewerFilters(got.posts, prefs);
    for (const p of posts) if (p.id !== excludeId) items.push(toRec(p));
    more = got.scanned === SCAN && got.lastMs != null;
    if (got.lastMs != null) {
      next = got.lastMs;
      bound = Timestamp.fromMillis(got.lastMs);
      inclusive = false;
    }
  }
  return { items, next, more };
}
