import test from "node:test";
import assert from "node:assert/strict";
import { CHAT_GATE_MESSAGE, checkChatPrivacy, lockedChatChanges } from "../lib/chat-gate.js";

const open = { whoCanMessage: "friendsfollowers", readReceipts: true };

test("chat gate: free accounts can't pick No one or turn read receipts off", () => {
  assert.deepEqual(lockedChatChanges(open, { whoCanMessage: "nobody" }), ["whoCanMessage"]);
  assert.deepEqual(lockedChatChanges(open, { readReceipts: false }), ["readReceipts"]);
  assert.deepEqual(lockedChatChanges(open, { whoCanMessage: "nobody", readReceipts: false }), ["whoCanMessage", "readReceipts"]);
  const r = checkChatPrivacy({ paid: false, current: open, patch: { whoCanMessage: "nobody" } });
  assert.equal(r.ok, false);
  assert.equal(r.error, CHAT_GATE_MESSAGE);
});

test("chat gate: every other chat setting stays free", () => {
  for (const patch of [
    { whoCanMessage: "everyone" },
    { whoCanMessage: "friends" },
    { whoCanMessage: "followers" },
    { readReceipts: true },
    { showOnline: false },
    { discoverable: false },
  ]) {
    assert.equal(checkChatPrivacy({ paid: false, current: open, patch }).ok, true, JSON.stringify(patch));
  }
});

test("chat gate: paid accounts can use both", () => {
  const patch = { whoCanMessage: "nobody", readReceipts: false };
  assert.equal(checkChatPrivacy({ paid: true, current: open, patch }).ok, true);
});

test("chat gate: settings a free account already had are not blocked", () => {
  const old = { whoCanMessage: "nobody", readReceipts: false };
  assert.equal(checkChatPrivacy({ paid: false, current: old, patch: { showOnline: false } }).ok, true);
  assert.equal(checkChatPrivacy({ paid: false, current: old, patch: { whoCanMessage: "nobody" } }).ok, true);
  // ...but once they switch away, getting back to it is the paid part.
  assert.equal(checkChatPrivacy({ paid: false, current: { ...old, whoCanMessage: "everyone" }, patch: { whoCanMessage: "nobody" } }).ok, false);
});

test("chat gate: junk input is harmless", () => {
  assert.deepEqual(lockedChatChanges(null, null), []);
  assert.equal(checkChatPrivacy({ paid: false, current: undefined, patch: "nobody" }).ok, true);
});
