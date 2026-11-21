import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_STORIES, sanitizeStories } from "../lib/stories-prefs.js";

test("story defaults: nothing saved reads as public with replies on", () => {
  assert.deepEqual(sanitizeStories(undefined), DEFAULT_STORIES);
  assert.deepEqual(sanitizeStories({}), DEFAULT_STORIES);
});

test("story defaults: valid choices are kept", () => {
  assert.deepEqual(sanitizeStories({ audience: "friends", replies: false }), { audience: "friends", replies: false });
  assert.equal(sanitizeStories({ audience: "connections" }).audience, "connections");
});

test("story defaults: an unknown audience becomes the strictest one, never public", () => {
  assert.equal(sanitizeStories({ audience: "everybody!!" }).audience, "friends");
  assert.equal(sanitizeStories({ replies: "no" }).replies, true);
});
