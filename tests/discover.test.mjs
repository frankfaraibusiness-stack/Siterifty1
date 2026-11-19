import test from "node:test";
import assert from "node:assert/strict";
import { DOORS, SPOTS, doorsFor } from "../lib/discover.js";

test("every door has a title, a pitch, a local link, a tone and an icon", () => {
  for (const [id, d] of Object.entries(DOORS)) {
    assert.equal(d.id, id);
    assert.ok(d.title && d.short, `${id} needs words`);
    assert.match(d.href, /^\/[a-z]+$/, `${id} should link to a top-level page`);
    assert.ok(d.tone && d.icon, `${id} needs a tone and an icon`);
  }
});

test("every spot lists real doors, with no repeats", () => {
  for (const [spot, ids] of Object.entries(SPOTS)) {
    assert.ok(ids.length > 0, `${spot} is empty`);
    assert.equal(new Set(ids).size, ids.length, `${spot} repeats a door`);
    for (const id of ids) assert.ok(DOORS[id], `${spot} lists unknown door ${id}`);
  }
});

test("a page never promotes itself", () => {
  for (const [spot, ids] of Object.entries(SPOTS)) {
    if (DOORS[spot]) assert.ok(!ids.includes(spot), `${spot} lists itself`);
  }
});

test("the three shops and Advertise are reachable from settings, the profile and the feed end", () => {
  for (const spot of ["settings", "profile", "feedEnd"]) {
    for (const id of ["perks", "gifts", "advertise"]) {
      assert.ok(SPOTS[spot].includes(id), `${spot} should show ${id}`);
    }
  }
});

test("doorsFor returns full objects, applies notes and survives an unknown spot", () => {
  const list = doorsFor("settings", { perks: "3 owned" });
  assert.equal(list[0].id, "perks");
  assert.equal(list[0].short, "3 owned");
  assert.equal(list[1].short, DOORS.gifts.short);
  assert.deepEqual(doorsFor("nowhere"), []);
});

test("the Advertise pitch follows the real image-ad rate", () => {
  assert.match(DOORS.advertise.short, /^Reach fans from \$\d+(\.\d\d)? per 1,000 views$/);
});
