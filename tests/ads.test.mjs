import test from "node:test";
import assert from "node:assert/strict";
import { quote, usd, cleanUrl, validateCopy, adGap, lastDays, dayKey, clampBudgetCents, ctr } from "../lib/ads.js";

test("image ads: $2 per 1k views + $0.18 + 5% tax", () => {
  const q = quote("image", 2000);
  assert.equal(q.views, 10000);
  assert.equal(q.extraCents, 18 + 100);
  assert.equal(q.totalCents, 2118);
  assert.equal(usd(q.totalCents), "$21.18");
});

test("video ads: $5 per 1k views + $0.50 + 10% fees", () => {
  const q = quote("video", 10000);
  assert.equal(q.views, 20000);
  assert.equal(q.extraCents, 50 + 1000);
  assert.equal(q.totalCents, 11050);
});

test("budget is clamped to $5 - $5,000", () => {
  assert.equal(clampBudgetCents(1), 500);
  assert.equal(clampBudgetCents(99999999), 500000);
  assert.equal(clampBudgetCents("abc"), 500);
});

test("links: https/http only, no credentials, scheme added when missing", () => {
  assert.equal(cleanUrl("example.com/a"), "https://example.com/a");
  assert.equal(cleanUrl("javascript:alert(1)"), "");
  assert.equal(cleanUrl("https://user:pw@example.com"), "");
  assert.equal(cleanUrl("localhost"), "");
});

test("copy validation", () => {
  const ok = validateCopy({ name: "Ad", title: "Hello", description: "", cta: "Shop now", link: "site.com", placements: ["feed", "x"] });
  assert.deepEqual(ok.errors, {});
  assert.deepEqual(ok.value.placements, ["feed"]);
  const bad = validateCopy({ name: "", title: "", cta: "nope", link: "", placements: [] });
  assert.equal(Object.keys(bad.errors).length, 5);
});

test("slot gap is always 4 or 5 and stable per id", () => {
  for (const id of ["a", "b", "post123", "zzz"]) {
    assert.ok([4, 5].includes(adGap(id)));
    assert.equal(adGap(id), adGap(id));
  }
});

test("lastDays fills missing days and ctr handles zero views", () => {
  const days = lastDays([{ [dayKey()]: { v: 10, c: 2 } }], 7);
  assert.equal(days.length, 7);
  assert.equal(days[6].v, 10);
  assert.equal(days[0].v, 0);
  assert.equal(ctr(2, 0), 0);
  assert.equal(ctr(2, 10), 20);
});

test("videos tab: its own placement, and an ad every 3 to 5 clips", async () => {
  const { PLACEMENT_IDS, videoAdGap } = await import("../lib/ads.js");
  assert.ok(PLACEMENT_IDS.includes("videos"));
  const seen = new Set();
  for (let seed = 1; seed < 400; seed += 1) {
    for (let n = 0; n < 12; n += 1) {
      const g = videoAdGap(seed, n);
      assert.ok(g >= 3 && g <= 5, `gap ${g}`);
      assert.equal(g, videoAdGap(seed, n)); // same answer every time
      seen.add(g);
    }
  }
  assert.deepEqual([...seen].sort(), [3, 4, 5]);
});
