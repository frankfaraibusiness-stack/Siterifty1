// The "For you" ranking, used by the home feed and the reel. Pure: no database, no
// clock of its own, so the same inputs always give the same order and the tests can
// pin it down.
//
// A post's score is built from (see scorePost in lib/interests.js for the first part):
//   taste       how well its game, hashtags, type and author match what the member
//               likes, saves, comments on, opens and finishes (fades over weeks)
//   freshness   half a point every 2 days, so new posts get seen
//   popularity  likes and comments, on a log scale so one viral post can't bury the rest
//   people      a boost for accounts the member follows
//   already     a dip for posts they already liked or saved, a bigger one for clips
//               they already finished today (`seen`)
//   shuffle     a small seeded nudge. A new seed on every visit means the feed is
//               never the same list twice, while one seed keeps paging stable.
//
// After scoring, the list is assembled one slot at a time: no author twice within
// `gap` slots, at most `authorCap` per author, and (once the member has some history)
// every `exploreEvery`th slot is something outside their usual taste, so the profile
// can discover new things instead of looping on old ones.
import { scorePost } from "./interests.js";

export const NOISE = 0.28; // the most the shuffle can move a score, up or down
export const FOLLOW_BOOST = 0.35;
export const OWN_NEW_HOURS = 2; // your own fresh post stays near the top so you see it landed

function hash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  // Final mix, so ids that differ in one character (post1, post2...) still land far apart.
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

// A new shuffle seed (one per visit). The only place this file is not deterministic.
export const makeSeed = () => 1 + Math.floor(Math.random() * 999_999_998);

// A steady number in [0, 1) for this seed + post.
export const unit = (seed, id) => hash(`${seed}:${id}`) / 4294967296;

const keyOf = (post) => String(post.user || "").toLowerCase();

// Score for one post. `seen` is a Set of post ids to push down hard.
export function feedScore(post, interests, { now = Date.now(), seed = 1, seen = null } = {}) {
  const base = scorePost(post, interests, now);
  const ageH = Math.max(0, (now - (post.createdAtMs || now)) / 3_600_000);
  let score = base.score;
  if (post.followed) score += FOLLOW_BOOST;
  if (post.likedByMe) score -= 0.3;
  else if (post.savedByMe) score -= 0.15;
  if (post.isOwner) score += ageH < OWN_NEW_HOURS ? 1 : -0.2;
  if (seen && seen.has(post.id)) score -= 1.2;
  score += (unit(seed, post.id) - 0.5) * 2 * NOISE;
  return { ...base, score };
}

// Orders `posts` for one member. Returns [{ post, why }], best first. Every post is kept
// (nothing is dropped), up to `limit`.
export function rankFeed(
  posts,
  interests,
  { now = Date.now(), seed = 1, limit = Infinity, authorCap = 3, gap = 3, seen = null, exploreEvery = 5 } = {}
) {
  const items = posts.map((post) => ({ post, ...feedScore(post, interests, { now, seed, seen }) }));
  items.sort(
    (a, b) =>
      b.score - a.score ||
      (b.post.createdAtMs || 0) - (a.post.createdAtMs || 0) ||
      (a.post.id < b.post.id ? -1 : 1)
  );

  const warm = !!interests && interests.weight > 0.5;
  const explore = warm
    ? items
        .filter((i) => i.topical < 0.05 && !i.post.isOwner)
        .map((i) => ({ i, k: i.fresh * (0.3 + i.pop) + unit(seed, `x${i.post.id}`) * 0.15 }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.i)
    : [];

  const out = [];
  const used = new Set();
  const counts = new Map();
  const recent = [];
  const room = (it) => !used.has(it.post.id) && (counts.get(keyOf(it.post)) || 0) < authorCap;
  const spaced = (it) => room(it) && !recent.includes(keyOf(it.post));

  const target = Math.min(limit, items.length);
  while (out.length < target) {
    let pick = null;
    let why = "";
    if (warm && out.length % exploreEvery === exploreEvery - 1) {
      pick = explore.find(spaced) || null;
      if (pick) why = "Something new";
    }
    if (!pick) pick = items.find(spaced) || items.find(room) || items.find((it) => !used.has(it.post.id)) || null;
    if (!pick) break;
    const k = keyOf(pick.post);
    used.add(pick.post.id);
    counts.set(k, (counts.get(k) || 0) + 1);
    recent.push(k);
    if (recent.length > gap) recent.shift();
    out.push({ post: pick.post, why: why || pick.why });
  }
  return out;
}
