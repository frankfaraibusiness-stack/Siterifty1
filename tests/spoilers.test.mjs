import test from "node:test";
import assert from "node:assert/strict";
import {
  FLAG_THRESHOLD,
  canCarrySpoiler,
  cleanFlags,
  cleanTopic,
  readSpoilerMode,
  spoilerState,
  toggleFlag,
  topicLabel,
} from "../lib/spoilers.js";

test("topics: only known ids survive, with readable labels", () => {
  assert.equal(cleanTopic("story"), "story");
  assert.equal(cleanTopic("<b>x</b>"), "");
  assert.equal(cleanTopic(undefined), "");
  assert.equal(topicLabel("map"), "Map and places");
  assert.equal(topicLabel("nope"), "");
});

test("an author's cover wins and carries its topic", () => {
  const s = spoilerState({ type: "post", settings: { spoiler: true, spoilerTopic: "leak" } }, "u1");
  assert.deepEqual(s, { spoiler: true, topic: "leak", by: "author", flaggedByMe: false });
});

test("flags only cover a post once enough different members flagged it", () => {
  const few = Array.from({ length: FLAG_THRESHOLD - 1 }, (_, i) => `u${i}`);
  assert.equal(spoilerState({ type: "post", settings: {}, spoilerFlags: few }, "x").spoiler, false);
  const enough = [...few, "uLast"];
  const s = spoilerState({ type: "post", settings: {}, spoilerFlags: enough }, "x");
  assert.equal(s.spoiler, true);
  assert.equal(s.by, "community");
  assert.equal(s.topic, "");
});

test("duplicate flags from one member count once", () => {
  assert.deepEqual(cleanFlags(["a", "a", "b", 3, ""]), ["a", "b"]);
  const dupes = Array(FLAG_THRESHOLD).fill("same");
  assert.equal(spoilerState({ type: "post", settings: {}, spoilerFlags: dupes }, "x").spoiler, false);
});

test("a flagger always knows they flagged, even before the cover kicks in", () => {
  const s = spoilerState({ type: "post", settings: {}, spoilerFlags: ["me"] }, "me");
  assert.equal(s.flaggedByMe, true);
  assert.equal(s.spoiler, false);
  assert.equal(spoilerState({ type: "post", settings: {}, spoilerFlags: ["me"] }, null).flaggedByMe, false);
});

test("polls and events never carry a cover", () => {
  assert.equal(canCarrySpoiler("poll"), false);
  assert.equal(canCarrySpoiler("event"), false);
  assert.equal(canCarrySpoiler("theory"), true);
  const s = spoilerState({ type: "event", settings: { spoiler: true }, spoilerFlags: ["a", "b", "c", "d"] }, "a");
  assert.equal(s.spoiler, false);
});

test("toggleFlag adds, then removes, and never duplicates", () => {
  const on = toggleFlag(["a"], "b");
  assert.deepEqual(on, { flags: ["a", "b"], flagged: true });
  const off = toggleFlag(on.flags, "b");
  assert.deepEqual(off, { flags: ["a"], flagged: false });
  assert.deepEqual(toggleFlag(undefined, "z"), { flags: ["z"], flagged: true });
});

test("viewer modes fall back to cover", () => {
  assert.equal(readSpoilerMode("hide"), "hide");
  assert.equal(readSpoilerMode("show"), "show");
  assert.equal(readSpoilerMode("whatever"), "cover");
  assert.equal(readSpoilerMode(undefined), "cover");
});

test("past the flag cap nothing more is stored, but the member still counts as flagged", () => {
  const many = Array.from({ length: 25 }, (_, i) => `u${i}`);
  const r = toggleFlag(many, "late");
  assert.equal(r.flags.length, 25);
  assert.equal(r.flagged, true);
});
