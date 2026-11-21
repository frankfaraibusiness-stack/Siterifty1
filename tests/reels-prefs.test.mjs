import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_REELS, preloadReach, sanitizeReels, startingMode } from "../lib/reels-prefs.js";

test("reels: defaults and bad values", () => {
  assert.deepEqual(sanitizeReels(undefined), DEFAULT_REELS);
  assert.deepEqual(sanitizeReels({ sound: "yes", dataSaver: 1, startOn: "following" }), DEFAULT_REELS);
  assert.deepEqual(sanitizeReels({ sound: true, dataSaver: true, startOn: "new" }), {
    sound: true,
    dataSaver: true,
    startOn: "new",
  });
});

test("reels: data saver loads only the active clip", () => {
  assert.equal(preloadReach({ dataSaver: true }), 0);
  assert.equal(preloadReach({ dataSaver: false }), 1);
  assert.equal(preloadReach(undefined), 1);
});

test("reels: a clip opened from elsewhere always opens on For you", () => {
  assert.equal(startingMode({ startOn: "new" }, ""), "new");
  assert.equal(startingMode({ startOn: "new" }, "abc123"), "foryou");
  assert.equal(startingMode(undefined, ""), "foryou");
});
