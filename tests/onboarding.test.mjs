import test from "node:test";
import assert from "node:assert/strict";
import { gateRedirect, isGateExempt, needsOnboarding } from "../lib/onboarding.js";

test("onboarding: only an explicit false means the tour is pending", () => {
  assert.equal(needsOnboarding({ onboarded: false }), true);
  assert.equal(needsOnboarding({ onboarded: true }), false);
  assert.equal(needsOnboarding({}), false); // older accounts
  assert.equal(needsOnboarding(null), false);
});

test("onboarding: pending members are sent to /welcome, except on info pages", () => {
  assert.equal(gateRedirect(true, "/"), "/welcome");
  assert.equal(gateRedirect(true, "/messages"), "/welcome");
  assert.equal(gateRedirect(true, "/welcome"), null);
  assert.equal(gateRedirect(true, "/terms"), null);
  assert.equal(gateRedirect(true, "/help/anything"), null);
  assert.equal(gateRedirect(false, "/"), null);
  assert.equal(isGateExempt("/welcomefoo"), false);
});
