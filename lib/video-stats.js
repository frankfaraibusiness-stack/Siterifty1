// Watch time, views and RP ("rank power") for posts and reels. Pure: no database, no clock, so
// tests/video-stats.test.mjs can pin it down and the browser and the server share the same rules.
//
// Stored on the post doc itself (so ranking needs no extra reads):
//   reelViews    +1 once a viewer has really watched 2 seconds
//   watchSecs    total seconds watched, added ONCE per viewing when the viewer swipes away or leaves
//                (the browser counts the time in memory, so a 90 s clip watched to the end is one
//                write of +90, never 90 writes)
//   rp           rank power. Every kind of engagement adds some. It only makes a post MORE LIKELY to
//                be shown: the feed still shuffles (lib/feed-rank.js), so the top one isn't always first.

export const VIEW_AFTER_SECONDS = 2; // a view counts after this much real play time
export const MAX_ENTRIES = 20; // watch entries accepted per request
export const MAX_CLIP_SECONDS = 600; // the longest upload (Long form)
export const FINISH_RATIO = 0.8; // "watched it" = this much of the clip played
export const HALF_RATIO = 0.5;

// RP added per kind of engagement. Likes, saves and comments are taken back when undone.
export const RP = {
  view: 1,
  half: 1, // watched at least half
  finish: 2, // watched (nearly) all of it, on top of `half`
  like: 3,
  save: 4,
  comment: 5,
  share: 6,
};

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const num = (v, max) => Math.max(0, Math.min(max, Number(v) || 0));

// What a browser may report about one viewing: { postId, seconds, duration, viewed }.
export function cleanWatchEntries(list) {
  if (!Array.isArray(list)) return [];
  const out = new Map();
  for (const e of list.slice(0, MAX_ENTRIES)) {
    if (!e || typeof e !== "object") continue;
    const postId = String(e.postId || "");
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(postId)) continue;
    const duration = num(e.duration, MAX_CLIP_SECONDS);
    const seconds = num(e.seconds, MAX_CLIP_SECONDS * 3);
    const prev = out.get(postId);
    // Two entries for the same clip (watched, left, came back) are one viewing batch.
    out.set(postId, {
      postId,
      seconds: (prev?.seconds || 0) + seconds,
      duration: Math.max(prev?.duration || 0, duration),
      viewed: !!(prev?.viewed || e.viewed),
    });
  }
  return [...out.values()];
}

// The most seconds one viewing of a clip can honestly add: a few loops, never more.
export const maxSecondsFor = (duration) => Math.min(MAX_CLIP_SECONDS * 3, Math.max(10, Math.ceil(duration || 0) * 3));

// One viewing -> what to add to the post. `duration` is the server's own number (the real clip length).
// Returns { views, watchSecs, rp, ratio, finished }.
export function watchDelta({ seconds, duration, viewed }) {
  const d = Math.max(0, Number(duration) || 0);
  const secs = Math.floor(Math.min(num(seconds, MAX_CLIP_SECONDS * 3), maxSecondsFor(d)));
  const counted = viewed === true && secs >= VIEW_AFTER_SECONDS;
  if (!counted) return { views: 0, watchSecs: 0, rp: 0, ratio: 0, finished: false };
  const ratio = d > 0 ? Math.min(1, secs / d) : 0;
  let rp = RP.view;
  if (ratio >= HALF_RATIO) rp += RP.half;
  if (ratio >= FINISH_RATIO) rp += RP.finish;
  return { views: 1, watchSecs: secs, rp, ratio, finished: ratio >= FINISH_RATIO };
}

// ---- ranking -----------------------------------------------------------------------------

// Average share of a clip that viewers play, pulled toward a neutral 0.35 while a clip has few views
// (so 1 view that watched all of it can't outrank a clip 400 people mostly finished).
export function retentionOf({ reelViews = 0, watchSecs = 0, duration = 0 }) {
  const PRIOR = 0.35;
  const PRIOR_VIEWS = 8;
  const v = Math.max(0, Number(reelViews) || 0);
  const d = Math.max(0, Number(duration) || 0);
  if (!v || !d) return PRIOR;
  const avg = clamp01((Math.max(0, Number(watchSecs) || 0) / (v * d)));
  return (avg * v + PRIOR * PRIOR_VIEWS) / (v + PRIOR_VIEWS);
}

// 0..1 from RP on a log scale: 10 RP ~ 0.33, 100 RP ~ 0.67, 1000 RP = 1.
export const rpScore = (rp) => clamp01(Math.log10(1 + Math.max(0, Number(rp) || 0)) / 3);

// How good a post is, from how people treat it. { rp: 0..1, retention: 0..1, boost } where `boost` is what
// the feed adds to a post's score. Retention only counts for videos with enough watch history.
export function qualityOf(post) {
  const isVideo = post?.type === "video" && post?.media?.type === "video";
  const rp = rpScore(post?.rp);
  const duration = Number(post?.media?.seconds) || 0;
  const retention = isVideo ? retentionOf({ reelViews: post.reelViews, watchSecs: post.watchSecs, duration }) : 0.35;
  const boost = 0.55 * rp + (isVideo ? 0.6 * (retention - 0.35) : 0);
  return { rp, retention, boost };
}
