import test from "node:test";
import assert from "node:assert/strict";
import {
  INFO_AUDIENCE_IDS,
  INFO_GATE_MESSAGE,
  canSeeInfo,
  checkProfilePrivacy,
  cleanInfoPatch,
  countryAudienceOf,
  genderAudienceOf,
  lockedInfoChanges,
  needsRelationship,
} from "../lib/profile-privacy.js";

const strangers = { isFriend: false, followsOwner: false };

test("profile privacy: public by default, for gender and country", () => {
  assert.equal(genderAudienceOf(undefined), "public");
  assert.equal(countryAudienceOf(undefined), "public");
  assert.equal(genderAudienceOf({}), "public");
  assert.equal(countryAudienceOf({ countryAudience: "bogus" }), "public");
});

test("profile privacy: the old Show my gender switch carries over", () => {
  assert.equal(genderAudienceOf({ showGender: false }), "nobody");
  assert.equal(genderAudienceOf({ showGender: true }), "public");
  // a saved choice wins over the old switch
  assert.equal(genderAudienceOf({ showGender: false, genderAudience: "friends" }), "friends");
});

test("profile privacy: who sees what", () => {
  const cases = [
    ["public", strangers, true],
    ["public", { isFriend: true }, true],
    ["friendsfollowers", strangers, false],
    ["friendsfollowers", { isFriend: true }, true],
    ["friendsfollowers", { followsOwner: true }, true],
    ["friends", { followsOwner: true }, false],
    ["friends", { isFriend: true }, true],
    ["followers", { isFriend: true }, false],
    ["followers", { followsOwner: true }, true],
    ["nobody", { isFriend: true, followsOwner: true }, false],
    ["nobody", strangers, false],
  ];
  for (const [audience, who, want] of cases) {
    assert.equal(canSeeInfo({ audience, ...who }), want, `${audience} ${JSON.stringify(who)}`);
  }
});

test("profile privacy: junk is hidden, never shown", () => {
  for (const audience of [undefined, null, "", "everyone", 5]) {
    assert.equal(canSeeInfo({ audience, ...strangers }), false, String(audience));
  }
});

test("profile privacy: the owner sees their own unless they chose No one", () => {
  for (const audience of ["public", "friendsfollowers", "friends", "followers"]) {
    assert.equal(canSeeInfo({ audience, isOwner: true }), true, audience);
  }
  assert.equal(canSeeInfo({ audience: "nobody", isOwner: true }), false);
});

test("profile privacy: only friend/follower choices need the relationship lookup", () => {
  assert.equal(needsRelationship("public"), false);
  assert.equal(needsRelationship("nobody"), false);
  for (const a of ["friendsfollowers", "friends", "followers"]) assert.equal(needsRelationship(a), true, a);
  assert.deepEqual(INFO_AUDIENCE_IDS, ["public", "friendsfollowers", "friends", "followers", "nobody"]);
});

test("profile privacy gate: No one is paid-only, everything else is free", () => {
  const open = { genderAudience: "public", countryAudience: "public" };
  assert.deepEqual(lockedInfoChanges(open, { genderAudience: "nobody" }), ["genderAudience"]);
  assert.deepEqual(lockedInfoChanges(open, { countryAudience: "nobody" }), ["countryAudience"]);
  assert.deepEqual(lockedInfoChanges(open, { genderAudience: "nobody", countryAudience: "nobody" }), ["genderAudience", "countryAudience"]);
  const r = checkProfilePrivacy({ paid: false, current: open, patch: { countryAudience: "nobody" } });
  assert.equal(r.ok, false);
  assert.equal(r.error, INFO_GATE_MESSAGE);
  for (const patch of [{ genderAudience: "friends" }, { countryAudience: "followers" }, { genderAudience: "friendsfollowers" }, { isPrivate: true }]) {
    assert.equal(checkProfilePrivacy({ paid: false, current: open, patch }).ok, true, JSON.stringify(patch));
  }
  assert.equal(checkProfilePrivacy({ paid: true, current: open, patch: { genderAudience: "nobody", countryAudience: "nobody" } }).ok, true);
});

test("profile privacy gate: a free account that already has No one keeps it", () => {
  const hidden = { genderAudience: "nobody", countryAudience: "public" };
  assert.equal(checkProfilePrivacy({ paid: false, current: hidden, patch: { genderAudience: "nobody" } }).ok, true);
  assert.equal(checkProfilePrivacy({ paid: false, current: hidden, patch: { genderAudience: "public" } }).ok, true);
  assert.equal(checkProfilePrivacy({ paid: false, current: hidden, patch: { countryAudience: "nobody" } }).ok, false);
});

test("profile privacy patch: old pages and bad values can't widen or bypass anything", () => {
  assert.deepEqual(cleanInfoPatch({ showGender: false }), { genderAudience: "nobody" });
  assert.deepEqual(cleanInfoPatch({ showGender: true }), { genderAudience: "public" });
  assert.deepEqual(cleanInfoPatch({ genderAudience: "friends", showGender: false }), { genderAudience: "friends" });
  assert.deepEqual(cleanInfoPatch({ countryAudience: "everyone", isPrivate: true }), { isPrivate: true });
  assert.deepEqual(cleanInfoPatch(null), {});
  // the old switch still goes through the paid lock
  const gate = checkProfilePrivacy({ paid: false, current: { genderAudience: "public" }, patch: cleanInfoPatch({ showGender: false }) });
  assert.equal(gate.ok, false);
});
