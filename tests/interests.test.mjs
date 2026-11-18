import test from "node:test";
import assert from "node:assert/strict";
import { inferGames, signalsOf, interestDelta, mergeDeltas, readInterests, rankPosts, cleanSignals, boost } from "../lib/interests.js";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 10, 18);

test("games are inferred from tags and text", () => {
  assert.deepEqual(inferGames({ tags: ["GTA6"], text: "" }), ["gta6"]);
  assert.deepEqual(inferGames({ tags: [], text: "Driving around Los Santos in GTA Online" }), ["gta5"]);
  assert.deepEqual(inferGames({ tags: [], title: "Leonida map theory", text: "" }), ["gta6"]);
  assert.deepEqual(inferGames({ tags: ["cooking"], text: "pasta" }), []);
});

test("signals: tags are normalised, capped at 5, deduped", () => {
  const s = signalsOf({ tags: ["#Trailer", "trailer", "Vice-City", "a", "b", "c", "d"], type: "video", user: "lucia.ray" });
  assert.equal(s.tags.length, 5);
  assert.equal(s.tags[0], "trailer");
  assert.equal(s.type, "video");
  assert.equal(s.author, "lucia_ray");
});

test("browser-sent signals are cleaned", () => {
  const s = cleanSignals({ t: ["Hello!!", "x".repeat(80)], g: ["gta6", "evil"], y: "hax", u: "A.B" });
  assert.deepEqual(s.games, ["gta6"]);
  assert.equal(s.type, "post");
  assert.equal(s.author, "a_b");
  assert.ok(s.tags.every((t) => /^[a-z0-9]{1,30}$/.test(t)));
});

test("a stored profile decays: a 21-day-old interaction counts half", () => {
  const sig = { tags: ["old"], games: [], type: "post", author: "" };
  const old = interestDelta(sig, 4, NOW - 21 * DAY);
  const fresh = interestDelta({ ...sig, tags: ["new"] }, 4, NOW);
  const p = readInterests({ t: { ...old.t, ...fresh.t }, w: old.w + fresh.w }, NOW);
  assert.ok(Math.abs(p.t.old / p.t.new - 0.5) < 1e-9);
  assert.ok(Math.abs(p.t.new - 4) < 1e-9);
});

test("deltas from several interactions merge into one write", () => {
  const a = interestDelta({ tags: ["x"], games: ["gta6"], type: "post", author: "bob" }, 1, NOW);
  const b = interestDelta({ tags: ["x", "y"], games: [], type: "post", author: "bob" }, 1, NOW);
  const m = mergeDeltas([a, b]);
  assert.equal(m.n, 2);
  assert.ok(Math.abs(m.t.x - 2 * boost(1, NOW)) < 1e-6);
  assert.ok(m.t.y > 0);
});

const mk = (id, over = {}) => ({ id, user: `u${id}`, createdAtMs: NOW - 3_600_000, likesCount: 2, comments: 0, tags: [], type: "post", text: "", ...over });

test("ranking prefers the member's interests over a newer, more popular post", () => {
  const me = readInterests({ ...mergeDeltas([1, 2, 3].map(() => interestDelta({ tags: ["trailer"], games: ["gta6"], type: "post", author: "" }, 3, NOW))) }, NOW);
  const posts = [
    mk("cooking", { tags: ["pasta"], likesCount: 50, createdAtMs: NOW - 60_000 }),
    mk("trailer", { tags: ["trailer"], text: "GTA6 trailer breakdown", likesCount: 3 }),
  ];
  const out = rankPosts(posts, me, { now: NOW });
  assert.equal(out[0].post.id, "trailer");
  assert.match(out[0].why, /GTA 6|#trailer/);
});

test("new members get trending (fresh + popular), skipping their own and already-liked posts", () => {
  const posts = [mk("a", { likesCount: 1 }), mk("b", { likesCount: 40 }), mk("c", { isOwner: true, likesCount: 99 }), mk("d", { likedByMe: true, likesCount: 99 })];
  const out = rankPosts(posts, null, { now: NOW });
  assert.deepEqual(out.map((o) => o.post.id), ["b", "a"]);
  assert.equal(out[0].why, "Trending");
});

test("no more than two posts per author up front, and every 4th slot explores", () => {
  const me = readInterests(mergeDeltas([1, 2, 3, 4].map(() => interestDelta({ tags: ["trailer"], games: [], type: "post", author: "" }, 4, NOW))), NOW);
  const posts = [
    ...[1, 2, 3, 4].map((i) => mk(`t${i}`, { user: "same", tags: ["trailer"] })),
    ...[5, 6, 7].map((i) => mk(`t${i}`, { tags: ["trailer"] })),
    mk("x1", { tags: ["pasta"], likesCount: 30 }),
  ];
  const out = rankPosts(posts, me, { now: NOW, limit: 6 });
  assert.ok(out.slice(0, 6).filter((o) => o.post.user === "same").length <= 2);
  assert.equal(out[3].post.id, "x1");
});
