import test from "node:test";
import assert from "node:assert/strict";
import { applyEvents, cleanEvents, emptyPlayer, liveStreak, normalizePlayer, viewOf } from "../lib/videos-engine.js";
import { DAILY_XP_CAP, STREAK_CLIPS, packageFor } from "../lib/videos-config.js";

const DAY = "2026-11-18";
const T0 = Date.UTC(2026, 10, 18, 12, 0, 0);
const clip = (over = {}) => ({ own: false, liked: false, saved: false, commented: false, duration: 10, ...over });
const facts = (map = {}) => (id) => (id in map ? map[id] : clip());
const watch = (postId, seconds = 9) => ({ type: "watch", postId, seconds, duration: 10 });
const run = (player, events, over = {}) => applyEvents(player, events, { day: DAY, nowMs: T0, facts: facts(), ...over });

test("finishing a clip pays base XP and counts toward clips", () => {
  const r = run(emptyPlayer(), [watch("a")]);
  assert.equal(r.awards.length, 1);
  assert.equal(r.awards[0].xp, 10);
  assert.equal(r.player.xp, 10);
  assert.equal(r.player.today.clips, 1);
});

test("a clip that was not watched enough pays nothing", () => {
  assert.equal(run(emptyPlayer(), [watch("a", 3)]).awards.length, 0); // 3s of 10s
  assert.equal(run(emptyPlayer(), [watch("a", 8)]).awards.length, 1); // exactly 80%
});

test("very short clips still need MIN_WATCH_SECONDS", () => {
  const f = facts({ a: clip({ duration: 1 }) });
  assert.equal(run(emptyPlayer(), [{ type: "watch", postId: "a", seconds: 1, duration: 1 }], { facts: f }).awards.length, 0);
  assert.equal(run(emptyPlayer(), [{ type: "watch", postId: "a", seconds: 2, duration: 1 }], { facts: f }).awards.length, 1);
});

test("each action on a clip pays once a day", () => {
  const first = run(emptyPlayer(), [watch("a")]);
  const again = run(first.player, [watch("a")], { nowMs: T0 + 60_000 });
  assert.equal(again.awards.length, 0);
  assert.equal(again.player.xp, first.player.xp);
});

test("combo: back-to-back clips build the multiplier, a skip breaks it", () => {
  let p = emptyPlayer();
  const gains = [];
  for (let i = 0; i < 5; i++) {
    const r = run(p, [watch(`c${i}`)], { nowMs: T0 + i * 11_000 });
    gains.push(r.awards[0].xp);
    p = r.player;
  }
  assert.deepEqual(gains, [10, 10, 20, 20, 30]);
  p = run(p, [{ type: "skip" }], { nowMs: T0 + 60_000 }).player;
  assert.equal(p.chain, 0);
  assert.equal(run(p, [watch("next")], { nowMs: T0 + 70_000 }).awards[0].xp, 10);
});

test("combo: a long pause starts the chain over", () => {
  let p = run(emptyPlayer(), [watch("a")]).player;
  p = run(p, [watch("b")], { nowMs: T0 + 11_000 }).player;
  assert.equal(p.chain, 2);
  const late = run(p, [watch("c")], { nowMs: T0 + 11_000 + 10 * 60_000 });
  assert.equal(late.awards[0].mult, 1);
});

test("watching faster than real time is refused", () => {
  // Ten 9-second claims in one request, but only 12 seconds have passed since the last one.
  let p = run(emptyPlayer(), [watch("seed")]).player;
  const burst = Array.from({ length: 10 }, (_, i) => watch(`x${i}`));
  const r = run(p, burst, { nowMs: T0 + 12_000 });
  assert.ok(r.awards.length <= 2, `paid ${r.awards.length}`);
});

test("likes, saves and comments only pay when the server saw them", () => {
  const f = facts({ a: clip({ liked: true }), b: clip(), c: clip({ saved: true, commented: true }) });
  const r = run(emptyPlayer(), [
    { type: "like", postId: "a" }, { type: "like", postId: "b" },
    { type: "save", postId: "c" }, { type: "comment", postId: "c" },
  ], { facts: f });
  assert.deepEqual(r.awards.map((a) => `${a.type}:${a.postId}`), ["like:a", "save:c", "comment:c"]);
  assert.equal(r.player.xp, 5 + 5 + 15);
});

test("your own clips never pay", () => {
  const r = run(emptyPlayer(), [watch("mine"), { type: "like", postId: "mine" }], { facts: facts({ mine: clip({ own: true, liked: true }) }) });
  assert.equal(r.awards.length, 0);
});

test("unknown clips and junk events are ignored", () => {
  const r = run(emptyPlayer(), [watch("ghost"), { type: "bogus", postId: "a" }, null, { type: "like", postId: "../x" }], { facts: (id) => (id === "ghost" ? null : clip()) });
  assert.equal(r.awards.length, 0);
  assert.deepEqual(cleanEvents("nope"), []);
  assert.equal(cleanEvents(Array.from({ length: 99 }, () => ({ type: "skip" }))).length, 20);
});

test("hidden packages: only where one really is, once per clip per day", () => {
  let withPkg = null, without = null;
  for (let i = 0; i < 200 && (!withPkg || !without); i++) {
    if (packageFor(`p${i}`, DAY)) withPkg ||= `p${i}`;
    else without ||= `p${i}`;
  }
  const r = run(emptyPlayer(), [{ type: "package", postId: without }, { type: "package", postId: withPkg }, { type: "package", postId: withPkg }]);
  assert.equal(r.awards.length, 1);
  assert.equal(r.awards[0].xp, 50);
  assert.equal(r.player.packagesTotal, 1);
  assert.deepEqual(viewOf(r.player, DAY).found, [withPkg]);
});

test("the daily cap stops action XP but missions still pay", () => {
  let p = normalizePlayer({ today: { day: DAY, actionXp: DAILY_XP_CAP - 5, clips: 9, streakCounted: true } }, DAY);
  const r = run(p, [watch("a")]);
  assert.equal(r.awards[0].xp, 5);
  assert.equal(r.awards[0].capped, true);
  assert.ok(r.missionsDone.some((m) => m.id === "binge"), "10th clip clears Binge Run");
  assert.equal(r.player.xp, 5 + 60);
  const over = run(r.player, [{ type: "share", postId: "z" }], { nowMs: T0 + 5000 });
  assert.equal(over.awards[0].xp, 0);
});

test("missions complete once and pay their bonus", () => {
  let p = emptyPlayer();
  const f = facts({ a: clip({ liked: true }), b: clip({ liked: true }), c: clip({ liked: true }) });
  const r = run(p, ["a", "b", "c"].map((postId) => ({ type: "like", postId })), { facts: f });
  assert.deepEqual(r.missionsDone.map((m) => m.id), ["fire"]);
  assert.equal(r.player.xp, 15 + 40);
  const again = run(r.player, [], { nowMs: T0 + 1000 });
  assert.equal(again.missionsDone.length, 0);
});

test("streak: finish enough clips in a day, then keep it up the next day", () => {
  let p = emptyPlayer();
  let hit = null;
  for (let i = 0; i < STREAK_CLIPS; i++) {
    const r = run(p, [watch(`c${i}`)], { nowMs: T0 + i * 11_000 });
    p = r.player;
    hit = r.streak || hit;
  }
  assert.deepEqual(hit, { days: 1, xp: 10 });
  assert.equal(viewOf(p, DAY).streak, 1);
  assert.equal(viewOf(p, DAY).streakSafe, true);

  // Next day: yesterday's streak is alive but not yet safe.
  const next = "2026-11-19";
  assert.equal(liveStreak(p, next), 1);
  assert.equal(viewOf(p, next).streakSafe, false);
  let q = p;
  for (let i = 0; i < STREAK_CLIPS; i++) {
    const r = applyEvents(q, [watch(`d${i}`)], { day: next, nowMs: T0 + 86_400_000 + i * 11_000, facts: facts() });
    q = r.player;
    if (r.streak) hit = r.streak;
  }
  assert.deepEqual(hit, { days: 2, xp: 20 });

  // Skip a day and it resets.
  assert.equal(liveStreak(q, "2026-11-21"), 0);
  let z = q;
  for (let i = 0; i < STREAK_CLIPS; i++) {
    z = applyEvents(z, [watch(`e${i}`)], { day: "2026-11-21", nowMs: T0 + 3 * 86_400_000 + i * 11_000, facts: facts() }).player;
  }
  assert.equal(z.streak, 1);
  assert.equal(z.bestStreak, 2);
});

test("rank up is reported", () => {
  const p = normalizePlayer({ xp: 115 }, DAY);
  const r = run(p, [watch("a")]);
  assert.deepEqual(r.rankUp, { level: 2, name: "Beach Bum" });
  assert.equal(run(r.player, [], { nowMs: T0 + 1000 }).rankUp, null);
});

test("a new day starts a fresh day record but keeps XP", () => {
  const old = run(emptyPlayer(), [watch("a")]).player;
  const fresh = normalizePlayer(old, "2026-11-19");
  assert.equal(fresh.xp, 10);
  assert.equal(fresh.today.clips, 0);
  assert.deepEqual(fresh.today.acts, []);
});

test("applyEvents never mutates what it was given", () => {
  const p = emptyPlayer();
  const snap = JSON.stringify(p);
  run(p, [watch("a")]);
  assert.equal(JSON.stringify(p), snap);
});

test("normalizePlayer survives garbage", () => {
  const p = normalizePlayer({ xp: "lots", streak: -4, today: { day: DAY, acts: "no", done: [1, "binge"] } }, DAY);
  assert.equal(p.xp, 0);
  assert.equal(p.streak, 0);
  assert.deepEqual(p.today.acts, []);
  assert.deepEqual(p.today.done, ["binge"]);
  assert.equal(normalizePlayer(null, DAY).today.day, DAY);
});
