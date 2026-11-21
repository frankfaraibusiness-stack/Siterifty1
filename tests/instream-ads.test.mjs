import test from "node:test";
import assert from "node:assert/strict";
import {
  creatorMicros, rpmDollars, moneyText, cleanAdPrefs, planBreaks, adSeconds, isSkippable, countsAfterSeconds,
  MAX_ADS, MIN_GAP_SECONDS,
} from "../lib/instream-ads.js";

test("creators keep 30%: video ad view 1,500 micro-dollars, photo ad view 600", () => {
  assert.equal(creatorMicros("video"), 1500);
  assert.equal(creatorMicros("image"), 600);
  // 1,000 video ad views = $1.50 (30% of $5), 1,000 photo ad views = $0.60 (30% of $2)
  assert.equal(creatorMicros("video") * 1000 / 1_000_000, 1.5);
  assert.equal(creatorMicros("image") * 1000 / 1_000_000, 0.6);
});

test("RPM: video only 1.50, photo only 0.60, both is the average 1.05", () => {
  assert.equal(rpmDollars("video"), 1.5);
  assert.equal(rpmDollars("image"), 0.6);
  assert.equal(rpmDollars("mixed"), 1.05);
});

test("money text keeps fractions of a cent visible", () => {
  assert.equal(moneyText(0), "$0.00");
  assert.equal(moneyText(1500), "$0.0015");
  assert.equal(moneyText(2_500_000), "$2.50");
});

test("prefs are cleaned: unknown values fall back, count is 1 to 3", () => {
  assert.deepEqual(cleanAdPrefs(null), { kind: "mixed", spots: ["mid"], count: 1 });
  assert.deepEqual(cleanAdPrefs({ kind: "x", spots: ["end", "start", "start", "nope"], count: 99 }), { kind: "mixed", spots: ["start", "end"], count: MAX_ADS });
  assert.equal(cleanAdPrefs({ count: 0 }).count, 1);
  assert.equal(cleanAdPrefs({ count: "abc" }).count, 1);
  assert.equal(cleanAdPrefs({ kind: "video", spots: [] }).spots[0], "mid");
});

function gaps(b) {
  return b.slice(1).map((x, i) => x.at - b[i].at);
}

test("breaks never exceed the count or 3, and are always 60s+ apart", () => {
  for (const dur of [60, 90, 120, 180, 181, 240, 300, 420, 600]) {
    for (const spots of [["start"], ["mid"], ["end"], ["start", "mid"], ["start", "end"], ["mid", "end"], ["start", "mid", "end"]]) {
      for (const count of [1, 2, 3, 7]) {
        const b = planBreaks(dur, { spots, count });
        assert.ok(b.length <= Math.min(count, MAX_ADS), `${dur} ${spots} ${count}`);
        assert.ok(gaps(b).every((g) => g >= MIN_GAP_SECONDS), `${dur} ${spots} ${count}: ${JSON.stringify(b)}`);
        b.forEach((x, i) => assert.equal(x.idx, i));
        assert.ok(b.every((x) => x.at >= 0 && x.at <= dur));
      }
    }
  }
});

test("start plays at 0, end at the duration, mid-rolls spread evenly between", () => {
  assert.deepEqual(planBreaks(300, { spots: ["start", "mid", "end"], count: 3 }).map((b) => [b.kind, b.at]), [["start", 0], ["mid", 150], ["end", 300]]);
  assert.deepEqual(planBreaks(300, { spots: ["mid"], count: 2 }).map((b) => b.at), [100, 200]);
  assert.deepEqual(planBreaks(300, { spots: ["start"], count: 3 }).map((b) => b.kind), ["start"]);
});

test("a short video drops mid-rolls instead of breaking the 60s rule", () => {
  // 3 minutes, three mid-rolls would sit 45s apart: only two fit (at 60 and 120)
  assert.deepEqual(planBreaks(180, { spots: ["mid"], count: 3 }).map((b) => b.at), [60, 120]);
  // never a mid-roll in the first or last minute
  assert.deepEqual(planBreaks(100, { spots: ["mid"], count: 1 }), []);
});

test("count is a ceiling when more spots are ticked", () => {
  assert.deepEqual(planBreaks(300, { spots: ["start", "mid", "end"], count: 2 }).map((b) => b.kind), ["start", "mid"]);
  assert.deepEqual(planBreaks(300, { spots: ["start", "mid", "end"], count: 1 }).map((b) => b.kind), ["start"]);
  assert.deepEqual(planBreaks(300, { spots: ["mid", "end"], count: 1 }).map((b) => b.kind), ["mid"]);
});

test("too-short or bad durations give no ads", () => {
  assert.deepEqual(planBreaks(0, {}), []);
  assert.deepEqual(planBreaks(NaN, {}), []);
  assert.deepEqual(planBreaks(30, { spots: ["start"] }), []);
});

test("ad length: photo ads 5s, video ads their own length; skip only when longer than 5s", () => {
  assert.equal(adSeconds({ media: { kind: "image" } }), 5);
  assert.equal(adSeconds({ media: { kind: "video", duration: 17.5 } }), 17.5);
  assert.equal(isSkippable(5), false);
  assert.equal(isSkippable(5.1), true);
  assert.equal(isSkippable(adSeconds({ media: { kind: "image" } })), false);
  // an ad counts as a view after 5s, or when it ends if it is shorter
  assert.equal(countsAfterSeconds(30), 5);
  assert.equal(countsAfterSeconds(4), 4);
});

import { breaksFor, isMonetizedPost } from "../lib/instream-ads.js";

const ts = (ms) => ({ toMillis: () => ms });
const post = (over = {}) => ({
  uid: "creator", type: "video", createdAt: ts(Date.now() - 1000), settings: {},
  media: { type: "video", kind: "storage", form: "long", monetized: true, seconds: 300, adPrefs: { kind: "video", spots: ["start", "mid", "end"], count: 3 } },
  ...over,
});

test("only live, public, monetized Long form uploads run ads", () => {
  assert.equal(isMonetizedPost(post()), true);
  assert.equal(isMonetizedPost(post({ media: { ...post().media, monetized: false } })), false);
  assert.equal(isMonetizedPost(post({ media: { ...post().media, form: "short" } })), false);
  assert.equal(isMonetizedPost(post({ media: { ...post().media, kind: "youtube" } })), false);
  assert.equal(isMonetizedPost(post({ settings: { visibility: "private" } })), false);
  assert.equal(isMonetizedPost(post({ createdAt: ts(Date.now() + 60_000) })), false);
  assert.equal(isMonetizedPost(null), false);
});

test("the creator never gets ad breaks on their own video; everyone else does", () => {
  assert.equal(breaksFor(post(), "creator"), null);
  assert.deepEqual(breaksFor(post(), "someone").map((b) => b.kind), ["start", "mid", "end"]);
  assert.deepEqual(breaksFor(post(), null).map((b) => b.at), [0, 150, 300]);
  assert.equal(breaksFor(post({ media: { ...post().media, monetized: false } }), "someone"), null);
});
