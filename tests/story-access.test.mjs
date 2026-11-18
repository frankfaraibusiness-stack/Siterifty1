import test from "node:test";
import assert from "node:assert/strict";
import { canWatchStory, cleanAudience, repliesAreOn, STORY_AUDIENCES } from "../lib/story-schema.js";

const none = { isFriend: false, isFollower: false };
const friend = { isFriend: true, isFollower: false };
const follower = { isFriend: false, isFollower: true };

test("there is no 'only me' audience", () => {
  assert.deepEqual(STORY_AUDIENCES.map((a) => a.id), ["public", "connections", "friends", "followers"]);
});

test("older stories without an audience are public; junk is the strictest", () => {
  assert.equal(cleanAudience(undefined), "public");
  assert.equal(cleanAudience(""), "public");
  assert.equal(cleanAudience("followers"), "followers");
  assert.equal(cleanAudience("everyone-ish"), "friends");
});

test("public: anyone, signed in or not", () => {
  assert.equal(canWatchStory({ audience: "public", ...none }), true);
});

test("friends & followers: either tie works, strangers don't", () => {
  assert.equal(canWatchStory({ audience: "connections", ...friend }), true);
  assert.equal(canWatchStory({ audience: "connections", ...follower }), true);
  assert.equal(canWatchStory({ audience: "connections", ...none }), false);
});

test("friends only: followers are not enough", () => {
  assert.equal(canWatchStory({ audience: "friends", ...friend }), true);
  assert.equal(canWatchStory({ audience: "friends", ...follower }), false);
});

test("followers only: friends who don't follow are not enough", () => {
  assert.equal(canWatchStory({ audience: "followers", ...follower }), true);
  assert.equal(canWatchStory({ audience: "followers", ...friend }), false);
});

test("the owner always sees their own story", () => {
  for (const a of ["public", "connections", "friends", "followers"]) {
    assert.equal(canWatchStory({ audience: a, isOwner: true, ...none }), true);
  }
});

test("replies are on unless switched off", () => {
  assert.equal(repliesAreOn({}), true);
  assert.equal(repliesAreOn({ repliesOn: true }), true);
  assert.equal(repliesAreOn({ repliesOn: false }), false);
});
