import test from "node:test";
import assert from "node:assert/strict";
import { SAVED_TABS, countSaved, filterSaved, readSavedTab, savedHref, savedTabInfo, savedTabOf } from "../lib/saved-tabs.js";

const reel = { id: "r1", type: "video", media: { type: "video", kind: "storage" } };
const yt = { id: "y1", type: "video", media: { type: "video", kind: "youtube" } };
const photo = { id: "p1", type: "post", media: { type: "1x1" } };
const legacy = { id: "p2" }; // an old post with no type at all
const poll = { id: "q1", type: "poll" };
const theory = { id: "t1", type: "theory" };
const event = { id: "e1", type: "event" };
const all = [reel, yt, photo, legacy, poll, theory, event, { ...reel, id: "r2" }];

test("savedTabOf: uploaded clips are reels, linked videos are YouTube, old posts are posts", () => {
  assert.equal(savedTabOf(reel), "reel");
  assert.equal(savedTabOf(yt), "youtube");
  assert.equal(savedTabOf({ id: "v", type: "video" }), "youtube");
  assert.equal(savedTabOf(photo), "post");
  assert.equal(savedTabOf(legacy), "post");
  assert.equal(savedTabOf(poll), "poll");
  assert.equal(savedTabOf(theory), "theory");
  assert.equal(savedTabOf(event), "event");
  assert.equal(savedTabOf({ type: "something-new" }), "post");
});

test("countSaved: every bookmark is in exactly one tab, and All adds them up", () => {
  const c = countSaved(all);
  assert.deepEqual(c, { all: 8, post: 2, reel: 2, youtube: 1, poll: 1, theory: 1, event: 1 });
  const parts = SAVED_TABS.filter((t) => t.id !== "all").reduce((n, t) => n + c[t.id], 0);
  assert.equal(parts, c.all);
  assert.deepEqual(countSaved([]), { all: 0, post: 0, reel: 0, youtube: 0, poll: 0, theory: 0, event: 0 });
});

test("filterSaved keeps order; All returns the same list", () => {
  assert.equal(filterSaved(all, "all"), all);
  assert.deepEqual(filterSaved(all, "reel").map((p) => p.id), ["r1", "r2"]);
  assert.deepEqual(filterSaved(all, "post").map((p) => p.id), ["p1", "p2"]);
  assert.deepEqual(filterSaved([photo], "poll"), []);
});

test("readSavedTab: valid ids only, anything else is All", () => {
  for (const t of SAVED_TABS) assert.equal(readSavedTab(t.id), t.id);
  assert.equal(readSavedTab("REEL"), "reel");
  assert.equal(readSavedTab(["poll", "event"]), "poll");
  for (const bad of [undefined, null, "", "video", "banana", 3]) assert.equal(readSavedTab(bad), "all");
});

test("savedHref drops the default and tab info falls back to All", () => {
  assert.equal(savedHref(), "/saved");
  assert.equal(savedHref("all"), "/saved");
  assert.equal(savedHref("reel"), "/saved?tab=reel");
  assert.equal(savedTabInfo("nope").id, "all");
  assert.equal(savedTabInfo("theory").singular, "theory");
});

test("every tab has the words the page needs", () => {
  for (const t of SAVED_TABS) assert.ok(t.label && t.singular && t.plural && t.hint, t.id);
});
