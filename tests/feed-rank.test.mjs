import test from "node:test";
import assert from "node:assert/strict";
import { feedScore, makeSeed, rankFeed, unit } from "../lib/feed-rank.js";
import { interestDelta, mergeDeltas, readInterests } from "../lib/interests.js";

const HOUR = 3_600_000;
const NOW = Date.UTC(2026, 10, 19, 12);

const mk = (id, over = {}) => ({
  id,
  user: `user${id}`,
  createdAtMs: NOW - 5 * HOUR,
  likesCount: 2,
  comments: 0,
  tags: [],
  type: "post",
  text: "",
  ...over,
});

const gta6Fan = () =>
  readInterests(
    mergeDeltas([1, 2, 3, 4].map(() => interestDelta({ tags: ["trailer"], games: ["gta6"], type: "post", author: "" }, 3, NOW))),
    NOW
  );

test("the shuffle is steady for one seed and different for another", () => {
  const posts = Array.from({ length: 12 }, (_, i) => mk(`p${i}`, { createdAtMs: NOW - (i + 1) * HOUR }));
  const ids = (seed) => rankFeed(posts, null, { now: NOW, seed }).map((r) => r.post.id).join(",");
  assert.equal(ids(7), ids(7));
  assert.notEqual(ids(7), ids(8));
  assert.ok(unit(1, "a") >= 0 && unit(1, "a") < 1);
  assert.ok(makeSeed() > 0);
});

test("newest is not always first: the order really changes between visits", () => {
  const posts = Array.from({ length: 10 }, (_, i) => mk(`p${i}`, { createdAtMs: NOW - (i + 1) * 3 * HOUR }));
  const firsts = new Set();
  let newestFirst = 0;
  for (let seed = 1; seed <= 60; seed += 1) {
    const top = rankFeed(posts, null, { now: NOW, seed })[0].post.id;
    firsts.add(top);
    if (top === "p0") newestFirst += 1;
  }
  assert.ok(firsts.size >= 3, `only ${firsts.size} different posts ever came first`);
  assert.ok(newestFirst < 45, `newest came first ${newestFirst} of 60 times`);
});

test("a post that matches the member's taste beats a newer, more popular one", () => {
  const posts = [
    mk("cooking", { tags: ["pasta"], likesCount: 40, createdAtMs: NOW - 60_000 }),
    mk("trailer", { tags: ["trailer"], text: "GTA6 trailer breakdown", likesCount: 3, createdAtMs: NOW - 6 * HOUR }),
  ];
  let wins = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    if (rankFeed(posts, gta6Fan(), { now: NOW, seed })[0].post.id === "trailer") wins += 1;
  }
  assert.ok(wins >= 36, `taste won ${wins} of 40`);
});

test("keeps every post, never drops one", () => {
  const posts = Array.from({ length: 25 }, (_, i) => mk(`p${i}`, { user: i < 20 ? "same" : `other${i}` }));
  const out = rankFeed(posts, gta6Fan(), { now: NOW, seed: 3 });
  assert.equal(out.length, 25);
  assert.equal(new Set(out.map((r) => r.post.id)).size, 25);
  assert.equal(rankFeed(posts, null, { now: NOW, seed: 3, limit: 10 }).length, 10);
});

test("one author can't take over: spaced out and capped while others are available", () => {
  const posts = [
    ...Array.from({ length: 8 }, (_, i) => mk(`a${i}`, { user: "spammer", likesCount: 30, createdAtMs: NOW - i * 60_000 })),
    ...Array.from({ length: 8 }, (_, i) => mk(`b${i}`, { user: `person${i}`, likesCount: 1 })),
  ];
  const out = rankFeed(posts, null, { now: NOW, seed: 5, authorCap: 3, gap: 3 });
  const top = out.slice(0, 10).map((r) => r.post.user);
  assert.ok(top.filter((u) => u === "spammer").length <= 3);
  for (let i = 1; i < 10; i += 1) assert.notEqual(top[i], top[i - 1]);
});

test("your own fresh post stays near the top, an old one doesn't", () => {
  const posts = [
    ...Array.from({ length: 9 }, (_, i) => mk(`o${i}`, { likesCount: 10 })),
    mk("mine-new", { isOwner: true, createdAtMs: NOW - 5 * 60_000, likesCount: 0 }),
  ];
  const pos = rankFeed(posts, null, { now: NOW, seed: 2 }).findIndex((r) => r.post.id === "mine-new");
  assert.ok(pos <= 2, `own fresh post at ${pos}`);
  const old = feedScore(mk("m", { isOwner: true, createdAtMs: NOW - 10 * HOUR }), null, { now: NOW, seed: 1 }).score;
  const other = feedScore(mk("m", { createdAtMs: NOW - 10 * HOUR }), null, { now: NOW, seed: 1 }).score;
  assert.ok(old < other);
});

test("people you follow rise, things you already liked or finished sink", () => {
  const base = (over) => feedScore(mk("x", over), null, { now: NOW, seed: 1 }).score;
  assert.ok(base({ followed: true }) > base({}));
  assert.ok(base({ likedByMe: true }) < base({}));
  const seen = feedScore(mk("x"), null, { now: NOW, seed: 1, seen: new Set(["x"]) }).score;
  assert.ok(seen < base({}) - 1);
});

test("a member with history gets something outside their taste now and then", () => {
  const posts = [
    ...Array.from({ length: 10 }, (_, i) => mk(`t${i}`, { tags: ["trailer"], text: "GTA6", user: `fan${i}` })),
    ...Array.from({ length: 4 }, (_, i) => mk(`n${i}`, { tags: ["cooking"], user: `chef${i}`, likesCount: 20 })),
  ];
  const out = rankFeed(posts, gta6Fan(), { now: NOW, seed: 9 });
  assert.ok(out.slice(0, 10).some((r) => r.post.id.startsWith("n")), "no discovery slot in the first 10");
  assert.ok(out.some((r) => r.why === "Something new"));
});

test("a brand-new member (no profile) still gets a sensible mix", () => {
  const posts = Array.from({ length: 6 }, (_, i) => mk(`p${i}`, { likesCount: i * 5, createdAtMs: NOW - (i + 1) * HOUR }));
  const out = rankFeed(posts, null, { now: NOW, seed: 4 });
  assert.equal(out.length, 6);
  assert.ok(out.every((r) => typeof r.why === "string" && r.why));
});
