import test from "node:test";
import assert from "node:assert/strict";
import { RP, cleanWatchEntries, maxSecondsFor, qualityOf, retentionOf, rpScore, watchDelta } from "../lib/video-stats.js";
import { feedScore, isNewVoice, rankFeed } from "../lib/feed-rank.js";

test("a view needs 2 real seconds, and nothing counts before it", () => {
  assert.equal(watchDelta({ seconds: 1.5, duration: 30, viewed: true }).views, 0);
  assert.equal(watchDelta({ seconds: 5, duration: 30, viewed: false }).views, 0);
  const d = watchDelta({ seconds: 5, duration: 30, viewed: true });
  assert.deepEqual([d.views, d.watchSecs, d.rp], [1, 5, RP.view]);
});

test("a 90 second clip watched fully adds 90 seconds and the finish bonus, in one entry", () => {
  const d = watchDelta({ seconds: 90, duration: 90, viewed: true });
  assert.equal(d.watchSecs, 90);
  assert.equal(d.finished, true);
  assert.equal(d.rp, RP.view + RP.half + RP.finish);
});

test("seconds are capped by the clip's length (a few loops at most)", () => {
  const d = watchDelta({ seconds: 500, duration: 20, viewed: true });
  assert.equal(d.watchSecs, maxSecondsFor(20));
  assert.equal(maxSecondsFor(20), 60);
});

test("entries for the same clip merge, junk is dropped", () => {
  const list = cleanWatchEntries([
    { postId: "a1", seconds: 4, duration: 10, viewed: true },
    { postId: "a1", seconds: 3, duration: 10, viewed: false },
    { postId: "bad id!", seconds: 3 },
    null,
    { postId: "b2", seconds: -5, duration: 9999 },
  ]);
  assert.equal(list.length, 2);
  assert.deepEqual(list[0], { postId: "a1", seconds: 7, duration: 10, viewed: true });
  assert.equal(list[1].seconds, 0);
  assert.equal(list[1].duration, 600);
});

test("retention is pulled toward neutral while a clip has few views", () => {
  const lucky = retentionOf({ reelViews: 1, watchSecs: 30, duration: 30 });
  const proven = retentionOf({ reelViews: 400, watchSecs: 400 * 27, duration: 30 });
  assert.ok(proven > lucky);
  assert.ok(lucky < 0.5);
});

test("rp score is log scaled and bounded", () => {
  assert.equal(rpScore(0), 0);
  assert.ok(rpScore(10) < rpScore(100));
  assert.equal(rpScore(1e9), 1);
});

const clip = (id, extra = {}) => ({
  id, user: `u_${id}`, type: "video", media: { type: "video", seconds: 30 }, createdAtMs: Date.now() - 3_600_000,
  likesCount: 0, comments: 0, ...extra,
});

test("a clip people watch through and engage with outranks a flat one, but isn't guaranteed first", () => {
  const flat = clip("flat");
  const loved = clip("loved", { rp: 400, reelViews: 300, watchSecs: 300 * 27 });
  assert.ok(qualityOf(loved).boost > qualityOf(flat).boost);
  let lovedFirst = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const [top] = rankFeed([flat, loved], null, { seed });
    if (top.post.id === "loved") lovedFirst += 1;
  }
  assert.ok(lovedFirst > 40, `loved first ${lovedFirst}/60`);
});

test("people you follow are lifted", () => {
  const a = feedScore(clip("x"), null, { seed: 1 }).score;
  const b = feedScore({ ...clip("x"), followed: true }, null, { seed: 1 }).score;
  assert.ok(b - a > 0.5);
});

test("new accounts you never engaged with get reserved slots in For you", () => {
  const now = Date.now();
  const old = Array.from({ length: 20 }, (_, i) => clip(`old${i}`, { user: `old${i}`, authorSinceMs: now - 400 * 86_400_000, likesCount: 50, comments: 10 }));
  const fresh = clip("new1", { user: "newbie", authorSinceMs: now - 2 * 86_400_000 });
  assert.equal(isNewVoice(fresh, null, now), true);
  assert.equal(isNewVoice({ ...fresh, followed: true }, null, now), false);
  assert.equal(isNewVoice(fresh, { au: { newbie: 3 } }, now), false);
  const out = rankFeed([...old, fresh], null, { seed: 7, now, limit: 8 });
  const idx = out.findIndex((r) => r.post.id === "new1");
  assert.ok(idx >= 0 && idx <= 3, `new voice at ${idx}`);
});

test("a creator you keep watching comes back, but never back to back", () => {
  const now = Date.now();
  const mine = Array.from({ length: 6 }, (_, i) => clip(`m${i}`, { user: "rockstar" }));
  const others = Array.from({ length: 10 }, (_, i) => clip(`o${i}`, { user: `o${i}` }));
  const interests = { t: {}, g: {}, ty: { video: 5 }, au: { rockstar: 10 }, totals: { t: 0, g: 0, ty: 5, au: 10 }, weight: 20, n: 10 };
  const out = rankFeed([...mine, ...others], interests, { seed: 3, now, authorCap: 4, gap: 5 });
  // (rankFeed keeps every post, so leftovers only pile up at the very end; the cap holds while others remain.)
  const names = out.slice(0, 12).map((r) => r.post.user);
  assert.ok(names.slice(0, 8).includes("rockstar"));
  assert.ok(names.filter((n) => n === "rockstar").length <= 4);
  for (let i = 1; i < names.length; i += 1) if (names[i] === "rockstar") assert.notEqual(names[i - 1], "rockstar");
});
