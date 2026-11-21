import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVITY_KINDS,
  MIN_WITHDRAW_MILLS,
  MIN_WITHDRAW_USD,
  activityKind,
  greetingName,
  withdrawProgress,
} from "../lib/wallet.js";

test("minimum withdrawal is $50.00 in mills", () => {
  assert.equal(MIN_WITHDRAW_USD, 50);
  assert.equal(MIN_WITHDRAW_MILLS, 50_000);
});

test("greeting: Mr for male, Mrs for female, plain name when gender is unknown", () => {
  assert.equal(greetingName({ gender: "male", displayName: "Tony" }), "Mr. Tony");
  assert.equal(greetingName({ gender: "female", displayName: "Lucia" }), "Mrs. Lucia");
  assert.equal(greetingName({ gender: null, displayName: "Sam" }), "Sam");
  assert.equal(greetingName({ gender: "male", displayName: "", username: "jay" }), "Mr. jay");
  assert.equal(greetingName({}), "");
});

test("withdraw progress: empty, partway, exactly the minimum, over it", () => {
  assert.deepEqual(withdrawProgress(0), { reached: false, pct: 0, remainingMills: 50_000 });
  assert.deepEqual(withdrawProgress(12_500), { reached: false, pct: 25, remainingMills: 37_500 });
  assert.deepEqual(withdrawProgress(50_000), { reached: true, pct: 100, remainingMills: 0 });
  assert.deepEqual(withdrawProgress(90_000), { reached: true, pct: 100, remainingMills: 0 });
  assert.equal(withdrawProgress(-5).pct, 0);
  assert.equal(withdrawProgress(NaN).pct, 0);
});

test("activity kinds: deposits and withdrawals group for the tabs, unknown types fall back", () => {
  assert.equal(activityKind("deposit").group, "deposit");
  assert.equal(activityKind("withdraw_request").group, "withdraw");
  assert.equal(activityKind("withdraw").group, "withdraw");
  assert.equal(activityKind("gift_send").group, "other");
  assert.equal(activityKind("something_new").label, "Wallet activity");
  assert.ok(Object.keys(ACTIVITY_KINDS).length >= 5);
});
