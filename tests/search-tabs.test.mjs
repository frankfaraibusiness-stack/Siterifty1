import test from "node:test";
import assert from "node:assert/strict";
import { FEED_TYPES } from "../lib/feed-types.js";
import { POST_TAB_IDS, buildSearchTabs, postTypeOfTab, readSearchTab } from "../lib/search-tabs.js";

test("every post format has its own search tab id", () => {
  assert.deepEqual(POST_TAB_IDS, FEED_TYPES.filter((t) => t.id !== "all").map((t) => t.id));
  for (const id of ["post", "video", "poll", "theory", "event"]) assert.ok(POST_TAB_IDS.includes(id));
});

test("readSearchTab accepts all, people and each format; anything else is all", () => {
  for (const t of ["all", "people", ...POST_TAB_IDS]) assert.equal(readSearchTab(t), t);
  assert.equal(readSearchTab("POLL"), "poll");
  assert.equal(readSearchTab(["video", "poll"]), "video");
  for (const bad of [undefined, null, "", "posts", "story", "<script>", 5]) assert.equal(readSearchTab(bad), "all");
});

test("postTypeOfTab filters posts only on a format tab", () => {
  assert.equal(postTypeOfTab("poll"), "poll");
  assert.equal(postTypeOfTab("people"), "all");
  assert.equal(postTypeOfTab("all"), "all");
});

test("tabs: All first, only formats with results, counts add up", () => {
  const tabs = buildSearchTabs({ peopleTotal: 3, typeCounts: { post: 5, poll: 2, theory: 0, video: 4 } });
  assert.deepEqual(tabs.map((t) => t.id), ["all", "people", "post", "video", "poll"]);
  assert.equal(tabs[0].count, 3 + 5 + 2 + 4);
  assert.equal(tabs.find((t) => t.id === "poll").count, 2);
});

test("no people -> no People tab; the tab you are on stays even when empty", () => {
  assert.deepEqual(buildSearchTabs({ typeCounts: { video: 1 } }).map((t) => t.id), ["all", "video"]);
  assert.deepEqual(buildSearchTabs({ typeCounts: { video: 1 }, active: "event" }).map((t) => t.id), ["all", "video", "event"]);
  assert.deepEqual(buildSearchTabs({ typeCounts: { video: 1 }, active: "people" }).map((t) => t.id), ["all", "people", "video"]);
});
