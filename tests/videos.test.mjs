import test from "node:test";
import assert from "node:assert/strict";
import {
  RANKS, rankFor, comboMultiplier, heatLevel, heatScore, dayKey, prevDayKey, cleanTz,
  missionsFor, packageFor, hashStr, PACKAGE_ODDS,
} from "../lib/videos-config.js";

test("rankFor walks the ladder and reports progress to the next rank", () => {
  assert.equal(rankFor(0).name, "Tourist");
  assert.equal(rankFor(119).name, "Tourist");
  assert.equal(rankFor(120).name, "Beach Bum");
  const r = rankFor(220); // halfway between 120 and 320
  assert.equal(r.name, "Beach Bum");
  assert.equal(r.pct, 50);
  assert.equal(r.next, "Hustler");
  const top = rankFor(999999);
  assert.equal(top.name, RANKS.at(-1).name);
  assert.equal(top.pct, 100);
  assert.equal(top.next, null);
  assert.equal(rankFor(-5).level, 1);
  assert.equal(rankFor("junk").level, 1);
});

test("combo multiplier climbs every two clips and caps at x5", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 30].map(comboMultiplier), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  assert.equal(comboMultiplier(-3), 1);
});

test("heat: loved clips earn stars, old clips cool off", () => {
  assert.equal(heatLevel({}), 0);
  const fresh = heatLevel({ likes: 20, comments: 5, ageHours: 1 });
  const stale = heatLevel({ likes: 20, comments: 5, ageHours: 24 * 30 });
  assert.ok(fresh > stale, `${fresh} vs ${stale}`);
  assert.ok(heatLevel({ likes: 1000, comments: 500, shares: 200, ageHours: 0 }) === 5);
  assert.ok(heatScore({ likes: 10, ageHours: 0 }) > heatScore({ likes: 10, ageHours: 48 }));
});

test("dayKey uses the player's own midnight and prevDayKey steps back one day", () => {
  const t = Date.UTC(2026, 10, 18, 23, 30); // 23:30 UTC on Nov 18
  assert.equal(dayKey(t, 0), "2026-11-18");
  assert.equal(dayKey(t, 120), "2026-11-19"); // UTC+2 is already past midnight
  assert.equal(dayKey(t, -300), "2026-11-18"); // UTC-5
  assert.equal(prevDayKey("2026-03-01"), "2026-02-28");
  assert.equal(prevDayKey("2026-01-01"), "2025-12-31");
  assert.equal(cleanTz(99999), 840);
  assert.equal(cleanTz("x"), 0);
});

test("missions: always three, two fixed and one rotating wildcard", () => {
  const a = missionsFor("2026-11-18");
  assert.equal(a.length, 3);
  assert.deepEqual(a.slice(0, 2).map((m) => m.id), ["binge", "fire"]);
  assert.equal(new Set(a.map((m) => m.id)).size, 3);
  const wilds = new Set();
  for (let d = 1; d <= 28; d++) wilds.add(missionsFor(`2026-11-${String(d).padStart(2, "0")}`)[2].id);
  assert.ok(wilds.size >= 3, "the wildcard should rotate");
  assert.deepEqual(missionsFor("2026-11-18"), missionsFor("2026-11-18"));
});

test("hidden packages are deterministic, rare, and move day to day", () => {
  let hits = 0;
  const N = 3000;
  for (let i = 0; i < N; i++) {
    const p = packageFor(`post${i}`, "2026-11-18");
    assert.deepEqual(p, packageFor(`post${i}`, "2026-11-18"));
    if (p) {
      hits += 1;
      assert.ok(p.x >= 14 && p.x <= 75 && p.y >= 24 && p.y <= 65 && p.afterMs >= 1500 && p.afterMs < 4500);
    }
  }
  const rate = hits / N;
  assert.ok(Math.abs(rate - 1 / PACKAGE_ODDS) < 0.04, `rate ${rate}`);
  const today = new Set(), tomorrow = new Set();
  for (let i = 0; i < 300; i++) {
    if (packageFor(`p${i}`, "2026-11-18")) today.add(i);
    if (packageFor(`p${i}`, "2026-11-19")) tomorrow.add(i);
  }
  assert.notDeepEqual([...today], [...tomorrow]);
  assert.equal(typeof hashStr("x"), "number");
});
