import test from "node:test";
import assert from "node:assert/strict";
import { agoLong } from "../lib/time-ago.js";

const NOW = Date.UTC(2026, 10, 21, 12, 0, 0);
const ago = (ms) => agoLong(NOW - ms, NOW);
const MIN = 60_000, HOUR = 60 * MIN, DAY = 24 * HOUR;

test("reads like a person would say it", () => {
  assert.equal(ago(10_000), "just now");
  assert.equal(ago(MIN), "1 minute ago");
  assert.equal(ago(45 * MIN), "45 minutes ago");
  assert.equal(ago(HOUR), "1 hour ago");
  assert.equal(ago(5 * HOUR), "5 hours ago");
  assert.equal(ago(DAY), "1 day ago");
  assert.equal(ago(10 * DAY), "10 days ago");
  assert.equal(ago(59 * DAY), "59 days ago");
  assert.equal(ago(90 * DAY), "3 months ago");
  assert.equal(ago(400 * DAY), "1 year ago");
  assert.equal(ago(800 * DAY), "2 years ago");
});

test("a missing or future date gives nothing", () => {
  assert.equal(agoLong(0, NOW), "");
  assert.equal(agoLong(undefined, NOW), "");
  assert.equal(agoLong(NOW + HOUR, NOW), "");
});
