import test from "node:test";
import assert from "node:assert/strict";
import {
  tokenizeText, tagHref, parseTags, readMinutes, needsClamp, formatDuration, mediaChip,
  timeLeft, pollSummary, confidenceTone, localDayDiff, dayChip, capacityState,
} from "../lib/card-helpers.js";

const kinds = (t) => tokenizeText(t).map((s) => `${s.type}:${s.raw}`);

test("tokenizeText finds mentions and tags and round-trips the text", () => {
  const t = "Meet @lucia.ray at #ViceCity, then #Trailer2! email a@b.com & x#nope";
  assert.deepEqual(kinds(t), [
    "text:Meet ", "mention:@lucia.ray", "text: at ", "tag:#ViceCity", "text:, then ",
    "tag:#Trailer2", "text:! email a@b.com & x#nope",
  ]);
  assert.equal(tokenizeText(t).map((s) => s.raw).join(""), t);
});

test("tokenizeText trims a trailing dot off a handle and skips short ones", () => {
  assert.deepEqual(kinds("hi @jason.") , ["text:hi ", "mention:@jason", "text:."]);
  assert.deepEqual(kinds("hi @ab"), ["text:hi @ab"]);
  assert.deepEqual(kinds("line one\n#Map"), ["text:line one\n", "tag:#Map"]);
  assert.deepEqual(tokenizeText(""), []);
  assert.deepEqual(tokenizeText(null), []);
});

test("tokenizeText ignores html entities, urls fragments and over-long tags", () => {
  assert.deepEqual(kinds("&#39; ok"), ["text:&#39; ok"]);
  assert.deepEqual(kinds("see https://x.com/a#frag"), ["text:see https://x.com/a#frag"]);
  assert.equal(tokenizeText(`#${"a".repeat(25)}`).some((s) => s.type === "tag"), false);
});

test("tagHref encodes the hash", () => {
  assert.equal(tagHref("Map"), "/search?q=%23Map");
  assert.equal(tagHref("#Map"), "/search?q=%23Map");
});

test("parseTags prefers the array, falls back to the string, dedupes", () => {
  assert.deepEqual(parseTags({ tags: ["Map", "#map", "Cars"], tag: "#Other" }), ["Map", "Cars"]);
  assert.deepEqual(parseTags({ tags: [], tag: "#ViceCity #Lucia" }), ["ViceCity", "Lucia"]);
  assert.deepEqual(parseTags({ tag: null }), []);
  assert.deepEqual(parseTags(null), []);
});

test("readMinutes / needsClamp", () => {
  assert.equal(readMinutes(""), 1);
  assert.equal(readMinutes("word ".repeat(200)), 1);
  assert.equal(readMinutes("word ".repeat(201)), 2);
  assert.equal(needsClamp("short"), false);
  assert.equal(needsClamp("x".repeat(221)), true);
  assert.equal(needsClamp("a\nb\nc\nd"), false);
  assert.equal(needsClamp("a\nb\nc\nd\ne"), true);
  assert.equal(needsClamp(undefined), false);
});

test("formatDuration and mediaChip", () => {
  assert.equal(formatDuration(0), "");
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatDuration(3725), "1:02:05");
  assert.equal(mediaChip(null), null);
  assert.equal(mediaChip({ type: "images", count: 1 }), null);
  assert.deepEqual(mediaChip({ type: "images", count: 3 }), { icon: "photos", label: "3 photos" });
  assert.deepEqual(mediaChip({ type: "images", preview: ["a", "b"] }), { icon: "photos", label: "2 photos" });
  assert.deepEqual(mediaChip({ type: "video", kind: "youtube" }), { icon: "play", label: "YouTube" });
  assert.deepEqual(mediaChip({ type: "video", kind: "storage", seconds: 134 }), { icon: "play", label: "2:14" });
  assert.deepEqual(mediaChip({ type: "video", kind: "storage", seconds: 0 }), { icon: "play", label: "Video" });
  assert.equal(mediaChip({ type: "16x9" }), null);
});

test("timeLeft boundaries", () => {
  const now = 1_000_000;
  assert.equal(timeLeft(null, now), "");
  assert.equal(timeLeft(now, now), "Ended");
  assert.equal(timeLeft(now + 1, now), "1m left");
  assert.equal(timeLeft(now + 59 * 60_000, now), "59m left");
  assert.equal(timeLeft(now + 60 * 60_000, now), "1h left");
  assert.equal(timeLeft(now + 49 * 3_600_000, now), "2d left");
});

test("pollSummary: leader, tie, multi-choice and ended", () => {
  const now = 5000;
  const a = pollSummary({ counts: [3, 1], voters: 4, multi: false, endsAtMs: now + 3_600_000 }, now);
  assert.deepEqual([a.leaders, a.tie, a.leadPct, a.total, a.ended, a.left], [[0], false, 75, 4, false, "1h left"]);
  const b = pollSummary({ counts: [2, 2], voters: 4, multi: false, endsAtMs: null }, now);
  assert.deepEqual([b.leaders, b.tie, b.ended], [[0, 1], true, false]);
  // Multi-choice percentages are out of voters, so they can pass 50% together.
  const c = pollSummary({ counts: [3, 3], voters: 4, multi: true, endsAtMs: now - 1 }, now);
  assert.deepEqual([c.leadPct, c.total, c.ended, c.left], [75, 4, true, "Ended"]);
  const d = pollSummary({ counts: [0, 0], voters: 0, multi: false, endsAtMs: null }, now);
  assert.deepEqual([d.leaders, d.tie, d.leadPct], [[], false, 0]);
});

test("confidenceTone matches the label bands", () => {
  assert.deepEqual([0, 24, 25, 49, 50, 74, 75, 100].map(confidenceTone),
    ["cap", "cap", "maybe", "maybe", "likely", "likely", "locked", "locked"]);
  assert.equal(confidenceTone(undefined), "cap");
  assert.equal(confidenceTone(500), "locked");
});

test("capacityState", () => {
  assert.deepEqual(capacityState(5, null), { pct: 0, tone: "open", label: "No spot limit" });
  assert.deepEqual(capacityState(5, 20), { pct: 25, tone: "open", label: "15 of 20 spots left" });
  assert.equal(capacityState(16, 20).tone, "filling");
  assert.equal(capacityState(18, 100).tone, "open");
  assert.equal(capacityState(97, 100).tone, "filling"); // 3 left
  assert.equal(capacityState(4, 5).tone, "filling");
  assert.deepEqual(capacityState(20, 20), { pct: 100, tone: "full", label: "Full" });
  assert.deepEqual(capacityState(25, 20, { waitlist: true, waiting: 4 }), { pct: 100, tone: "full", label: "Full · 4 waiting" });
});

// These build instants from LOCAL calendar fields, so they hold in any zone.
// Run the file under several TZ values (see the "test" script): a helper that
// sneaks in UTC or a fixed 86_400_000 ms day fails in at least one of them.
const L = (y, mo, d, h = 0, mi = 0) => new Date(y, mo - 1, d, h, mi).getTime();

test("localDayDiff counts local calendar days, not 24h blocks", () => {
  assert.equal(localDayDiff(L(2026, 11, 17, 0, 5), L(2026, 11, 17, 23, 55)), 0);
  assert.equal(localDayDiff(L(2026, 11, 18, 0, 5), L(2026, 11, 17, 23, 55)), 1);
  assert.equal(localDayDiff(L(2026, 11, 17, 23, 55), L(2026, 11, 18, 0, 5)), -1);
  assert.equal(localDayDiff(L(2026, 12, 31, 12), L(2026, 11, 17, 12)), 44);
});

test("localDayDiff is right across daylight-saving changes", () => {
  // US ends DST 1 Nov 2026 (25h day); NZ starts it 27 Sep 2026 (23h day);
  // the EU ends it 25 Oct 2026. Midnight to midnight is still whole days.
  for (const [from, to, days] of [
    [[2026, 10, 31, 22], [2026, 11, 2, 9], 2],
    [[2026, 11, 1, 0, 30], [2026, 11, 2, 0, 30], 1],
    [[2026, 9, 26, 23], [2026, 9, 28, 1], 2],
    [[2026, 10, 24, 23], [2026, 10, 26, 1], 2],
  ]) {
    assert.equal(localDayDiff(L(...to), L(...from)), days, `${from} -> ${to}`);
  }
});

test("dayChip labels", () => {
  const now = L(2026, 11, 17, 21, 30);
  assert.equal(dayChip(L(2026, 11, 17, 23, 0), now), "Today");
  assert.equal(dayChip(L(2026, 11, 18, 0, 10), now), "Tomorrow"); // 2h40m away but a new day
  assert.equal(dayChip(L(2026, 11, 18, 20), now), "Tomorrow");
  assert.equal(dayChip(L(2026, 11, 22, 9), now), "In 5 days");
  assert.equal(dayChip(L(2026, 12, 1, 9), now), "In 14 days");
  assert.equal(dayChip(L(2026, 12, 2, 9), now), "");
  assert.equal(dayChip(now, now), ""); // already started
  assert.equal(dayChip(L(2026, 11, 17, 8), now), "");
});

// ---- poll expiry (lib/poll-rules.js) ----------------------------------------
import { pollExpired, pollHours, POLL_HOURS } from "../lib/poll-rules.js";

const at = (ms) => ({ toMillis: () => ms });

test("a poll with no end time never expires", () => {
  assert.equal(pollExpired({ poll: { kind: "poll", endsAt: null } }, 9e15), false);
  assert.equal(pollExpired({ poll: { kind: "poll" } }, 9e15), false);
  assert.equal(pollExpired({}, 9e15), false);
  assert.equal(pollExpired(null), false);
});

test("a poll expires the moment its end time passes", () => {
  const data = { poll: { kind: "poll", endsAt: at(1000) } };
  assert.equal(pollExpired(data, 999), false);
  assert.equal(pollExpired(data, 1000), true);
  assert.equal(pollExpired(data, 5000), true);
});

test("a theory verdict never expires, whatever its end time", () => {
  assert.equal(pollExpired({ poll: { kind: "verdict", endsAt: at(1) } }, 5000), false);
});

test("poll length defaults to no expiry", () => {
  assert.deepEqual(POLL_HOURS, [0, 1, 24, 72, 168]);
  assert.equal(pollHours(undefined), 0);
  assert.equal(pollHours(5), 0);
  assert.equal(pollHours("24"), 0);
  assert.equal(pollHours(72), 72);
  assert.equal(pollHours(0), 0);
});
