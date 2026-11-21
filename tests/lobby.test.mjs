import test from "node:test";
import assert from "node:assert/strict";
import {
  OFFICIAL_ROOMS, blockedEitherWay, cleanText, isOfficialRoomId, isPresent, isRoomId, nextSessionPlan, officialRoomId,
  oneOf, sessionRules, sessionSizes, statusLabel, untilLabel, PRESENCE_MS,
} from "../lib/lobby-config.js";

test("cleanText strips brackets and control characters, collapses spaces and trims", () => {
  assert.equal(cleanText("  hi   <b>there</b>\u0007 "), "hi bthere/b");
  assert.equal(cleanText("a\n\n\n\nb"), "a\n\nb");
  assert.equal(cleanText(null), "");
  assert.equal(cleanText("x".repeat(500), 400).length, 400);
});

test("official room ids are recognised and member ids are validated", () => {
  const id = officialRoomId(OFFICIAL_ROOMS[0].id);
  assert.ok(isOfficialRoomId(id));
  assert.ok(!isOfficialRoomId("official-nope"));
  assert.ok(isRoomId(id));
  assert.ok(isRoomId("AbCdEfGhIjKlMnOpQrSt"));
  assert.ok(!isRoomId("../users/abc"));
  assert.ok(!isRoomId(""));
  assert.ok(!isRoomId(undefined));
});

test("plans decide how many sessions and how big", () => {
  assert.deepEqual(sessionRules("drifter"), { active: 1, max: 10 });
  assert.deepEqual(sessionRules("kingpin"), { active: 5, max: 50 });
  assert.deepEqual(sessionRules("unknown"), { active: 1, max: 10 });
  assert.deepEqual(sessionSizes("drifter"), [5, 10]);
  assert.deepEqual(sessionSizes("kingpin"), [5, 10, 20, 35, 50]);
  assert.equal(nextSessionPlan("drifter"), "wheelman");
  assert.equal(nextSessionPlan("kingpin"), null);
  assert.deepEqual(sessionRules("creatorplus"), { active: 5, max: 50 });
  assert.equal(nextSessionPlan("creatorplus"), null);
});

test("presence expires after the check-in window", () => {
  const now = 1_000_000;
  assert.ok(isPresent(now - 1000, now));
  assert.ok(!isPresent(now - PRESENCE_MS, now));
  assert.ok(!isPresent(0, now));
  assert.ok(!isPresent(undefined, now));
});

test("blocking works in both directions and ignores case", () => {
  const a = { username: "Lucia.Ray", blocked: ["jason.d"] };
  const b = { username: "jason.d", blocked: [] };
  const c = { username: "someone", blocked: ["lucia.ray"] };
  assert.ok(blockedEitherWay(a, b));
  assert.ok(blockedEitherWay(b, a)); // the other side of the block
  assert.ok(blockedEitherWay(a, c));
  assert.ok(!blockedEitherWay({ username: "x", blocked: [] }, { username: "y", blocked: [] }));
});

test("oneOf, statusLabel and untilLabel", () => {
  assert.equal(oneOf("b", ["a", "b"]), "b");
  assert.equal(oneOf("z", ["a", "b"], "a"), "a");
  assert.equal(statusLabel("crew"), "Looking for crew");
  assert.equal(statusLabel("nope"), "Cruising");
  const now = 0;
  assert.equal(untilLabel(-5, now), "now");
  assert.equal(untilLabel(5 * 60_000, now), "in 5m");
  assert.equal(untilLabel(125 * 60_000, now), "in 2h 5m");
  assert.equal(untilLabel(3 * 86_400_000, now), "in 3d");
});
