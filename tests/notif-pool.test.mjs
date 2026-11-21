import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_POOLS, NOTIF_KEY, PAGE_POOLS, POOL_SIZE, TEXT_MAX,
  makeNotification, pagePools, planWrites, poolOf, previewOf, storyIsLive,
} from "../lib/notif-pool.js";

const mike = { uid: "u_mike", username: "mike" };

test("the chat key can never be a member's handle", () => {
  // Handles are 3-20 letters, digits, "_" or "." (USERNAME_RE in lib/settings.js).
  assert.ok(!/^[a-zA-Z0-9_.]{3,20}$/.test(NOTIF_KEY));
});

test("notification number N lives in pool floor(N / POOL_SIZE)", () => {
  assert.equal(poolOf(0), 0);
  assert.equal(poolOf(POOL_SIZE - 1), 0);
  assert.equal(poolOf(POOL_SIZE), 1);
});

test("planWrites fills pools in order and splits a batch across a pool boundary", () => {
  assert.deepEqual([...planWrites(0, 1).pools], [[0, 1]]);
  const split = planWrites(POOL_SIZE - 1, 2);
  assert.deepEqual([...split.pools], [[0, 1], [1, 1]]);
  assert.equal(split.next, POOL_SIZE + 1);
  assert.deepEqual(split.prune, []);
});

test("starting a new pool retires the pool MAX_POOLS behind it", () => {
  const edge = planWrites(MAX_POOLS * POOL_SIZE - 1, 2);
  assert.deepEqual([...edge.pools], [[MAX_POOLS - 1, 1], [MAX_POOLS, 1]]);
  assert.deepEqual(edge.prune, [0]);
  // Writing into the middle of a pool never prunes.
  assert.deepEqual(planWrites(MAX_POOLS * POOL_SIZE + 5, 1).prune, []);
});

test("a member never keeps more than MAX_POOLS pools, however much they receive", () => {
  const live = new Set();
  let seq = 0;
  for (let i = 0; i < 5000; i++) {
    const plan = planWrites(seq, 1);
    for (const p of plan.pools.keys()) live.add(p);
    for (const p of plan.prune) live.delete(p);
    seq = plan.next;
    assert.ok(live.size <= MAX_POOLS, `${live.size} pools after ${i + 1} notifications`);
  }
  assert.equal(live.size, MAX_POOLS);
  assert.ok(live.has(poolOf(seq - 1)));
});

test("pagePools reads the newest pools first and never reaches pools that were retired", () => {
  assert.deepEqual(pagePools(0), { pools: [], more: false });
  assert.deepEqual(pagePools(1), { pools: [0], more: false });
  assert.deepEqual(pagePools(250), { pools: [2, 1], more: true });
  assert.deepEqual(pagePools(250, 1), { pools: [0], more: false });

  // A long history: following the cursor visits exactly the pools that still exist, newest to oldest.
  const seq = 5000; // head pool 49, so pools 38..49 remain
  const seen = [];
  let before = null;
  for (let guard = 0; guard < 20; guard++) {
    const page = pagePools(seq, before);
    assert.ok(page.pools.length <= PAGE_POOLS);
    seen.push(...page.pools);
    if (!page.more) break;
    before = page.pools[page.pools.length - 1];
  }
  assert.deepEqual(seen, Array.from({ length: MAX_POOLS }, (_, i) => poolOf(seq - 1) - i));
});

test("a repeated action overwrites itself instead of piling up", () => {
  const a = makeNotification("like", mike, { pid: "p1", x: "Hello" }, 1000);
  const b = makeNotification("like", mike, { pid: "p1", x: "Hello" }, 2000);
  assert.equal(a.key, b.key);
  assert.notEqual(a.key, makeNotification("like", mike, { pid: "p2" }).key);
  assert.notEqual(a.key, makeNotification("like", { uid: "u_other", username: "other" }, { pid: "p1" }).key);
  assert.equal(makeNotification("follow", mike).key, "fw_u_mike");
});

test("every notification keeps only a short slice of the words, so a pool stays small", () => {
  const n = makeNotification("comment", mike, { pid: "p1", cid: "c1", x: "word ".repeat(200) });
  assert.ok(n.item.x.length <= TEXT_MAX);
  assert.ok(JSON.stringify(n.item).length < 400);
});

test("bad input makes no notification", () => {
  assert.equal(makeNotification("like", { uid: "x" }, { pid: "p" }), null); // no handle
  assert.equal(makeNotification("nonsense", mike, {}), null);
  assert.equal(makeNotification("comment", mike, { pid: "p" }), null); // no comment id
});

test("story replies carry what is needed to tell later whether the story is still up", () => {
  const n = makeNotification("story", mike, { rid: "r1", sid: "s1", sk: "image", se: 5000, x: "this is fun" }, 1000);
  assert.deepEqual({ sid: n.item.sid, sk: n.item.sk, se: n.item.se }, { sid: "s1", sk: "image", se: 5000 });
  assert.equal(storyIsLive(true, "image", 5001, 5000), true);
  assert.equal(storyIsLive(true, "video", 5000, 5000), false);
  assert.equal(storyIsLive(false, "image", 9999, 5000), false);
  assert.equal(storyIsLive(true, "gradient", null, 5000), true);
});

test("the chat-list preview reads like the notification", () => {
  assert.equal(previewOf({ t: "like", u: "mike" }), "mike liked your post");
  assert.equal(previewOf({ t: "follow", u: "mike" }), "mike started following you");
  assert.equal(previewOf({ t: "story", u: "mike", x: "this is fun" }), "mike: this is fun");
  assert.equal(previewOf({ t: "friend_ok", u: "mike" }), "mike accepted your friend request");
});
