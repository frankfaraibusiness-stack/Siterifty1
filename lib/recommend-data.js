import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorHides, canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { applyViewerFilters } from "@/lib/viewer-filters";
import { postImageUrl } from "@/lib/media-url";
import { schedulePollPurge } from "@/lib/poll-expiry";
import { loadInterests } from "@/lib/interests-data";
import { rankPosts } from "@/lib/interests";
import { issueTrk } from "@/lib/track-token";

// Recommendations, decided entirely on the server. Two places use them:
//   fetchRail(...)             the "Recommended for you" row on top of the home feed
//   fetchRecommendations(...)  "More to explore" under a post (/p/[id])
//
// How a post is chosen (lib/interests.js): the member's interest profile (hashtags, game, post type,
// authors, learned from what they like, save, comment on and open; fading over weeks) is matched
// against a pool of recent posts, mixed with freshness and popularity. A new member simply gets what
// is trending. Every 4th slot is deliberately something outside their usual taste, so they can find
// new things, and nobody gets more than 2 posts from one author in a row.
//
// Cost: one read for the member's profile, plus a shared pool of the newest posts that is cached in
// memory for two minutes for everybody (so a busy site pays for it once per minute, not once
// per visit). Each item carries a signed tracking token (lib/track-token.js) so views and clicks are
// counted by the server, never invented by the browser.
//
// Paging under a post: first the ranked pool ("r<offset>" cursors), then plain newest-first for
// everything older than the pool (numeric cursors, as before), so the list never runs dry.
//
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

export function toRec(post, { src = "postrec", uid = null, why = "" } = {}) {
  const hidden = !!post.settings?.spoiler;
  return {
    why,
    trk: issueTrk(post, src, uid),
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
    reel: post.media?.type === "video" && post.media?.kind === "storage", // opens in the Videos page
    likes: post.settings?.hideLikes && !post.isOwner ? null : post.likesCount,
    comments: post.settings?.comments === false ? null : post.comments,
    timeAgo: post.timeAgo,
  };
}

// ---- the shared pool of recent posts --------------------------------------------------------------

const POOL_SIZE = 150;
const POOL_TTL = 60_000;
let pool = null;
let poolLoading = null;

export async function getPool() {
  if (pool && Date.now() - pool.at < POOL_TTL) return pool;
  if (poolLoading) return poolLoading;
  poolLoading = (async () => {
    const db = getAdminDb();
    const snap = await db.collection("posts").where("createdAt", "<=", Timestamp.now()).orderBy("createdAt", "desc").limit(POOL_SIZE).get();
    const authors = await loadAuthors(db, snap.docs);
    const last = snap.docs[snap.docs.length - 1];
    pool = { at: Date.now(), docs: snap.docs, authors, full: snap.docs.length === POOL_SIZE, oldestMs: last ? last.data().createdAt?.toMillis?.() ?? null : null };
    return pool;
  })().finally(() => { poolLoading = null; });
  return poolLoading;
}

// The pool as this member may see it: visibility, private accounts, blocked people, muted words, spoilers.
function visiblePool(p, uid, prefs) {
  const live = p.docs.filter((d) => canView(d.data(), uid) && !authorHides(d.data(), p.authors, uid));
  return applyViewerFilters(live.map((d) => mapPostDoc(d, uid, p.authors)), prefs).posts;
}

// Ranked picks for this member: [{ post, why }], best first.
async function ranked({ uid, prefs, excludeId = "" }) {
  schedulePollPurge();
  const [p, interests] = await Promise.all([getPool(), loadInterests(uid)]);
  const posts = visiblePool(p, uid, prefs).filter((x) => x.id !== excludeId);
  return { list: rankPosts(posts, interests), pool: p };
}

// The row on top of the home feed.
export const RAIL_SIZE = 10;
export async function fetchRail({ currentUid = null, prefs, limit = RAIL_SIZE } = {}) {
  try {
    const { list } = await ranked({ uid: currentUid, prefs });
    return list.slice(0, limit).map((r) => toRec(r.post, { src: "recommend", uid: currentUid, why: r.why }));
  } catch (err) {
    console.error("[recommend] rail failed", err);
    return [];
  }
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

// Returns { items, next, more }. Omit `before` for the first page. `before` is "r<offset>" while
// the ranked pool is being paged, then a createdAt in ms for the newest-first tail.
export async function fetchRecommendations({ currentUid = null, prefs, excludeId = "", before = null, limit = REC_PAGE } = {}) {
  const rankedPhase = before == null || (typeof before === "string" && /^r\d+$/.test(before));
  if (rankedPhase) {
    const offset = before == null ? 0 : Number(before.slice(1));
    const { list, pool: p } = await ranked({ uid: currentUid, prefs, excludeId });
    const items = list.slice(offset, offset + limit).map((r) => toRec(r.post, { src: "postrec", uid: currentUid, why: r.why }));
    if (offset + limit < list.length) return { items, next: `r${offset + limit}`, more: true };
    // The ranked pool is used up: continue newest-first from just below the oldest post it covered.
    return { items, next: p.oldestMs, more: p.full && p.oldestMs != null };
  }

  schedulePollPurge();
  const db = getAdminDb();
  const items = [];
  let bound = Timestamp.fromMillis(before);
  let inclusive = false;
  let next = before;
  let more = true;
  for (let round = 0; round < MAX_ROUNDS && items.length < limit && more; round += 1) {
    const got = await pickCandidates(db, { bound, inclusive, currentUid });
    const { posts } = applyViewerFilters(got.posts, prefs);
    for (const post of posts) if (post.id !== excludeId) items.push(toRec(post, { src: "postrec", uid: currentUid }));
    more = got.scanned === SCAN && got.lastMs != null;
    if (got.lastMs != null) {
      next = got.lastMs;
      bound = Timestamp.fromMillis(got.lastMs);
      inclusive = false;
    }
  }
  return { items, next, more };
}
