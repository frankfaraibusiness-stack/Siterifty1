// The tabs on /search: All, People, and one tab for every post format
// (Posts, Videos, Polls, Theories, Events: the same list as the feed's type
// chips, so a new format added to lib/feed-types.js gets its own search tab).
// Pure (no server code), so the page and the tests share it.
//
// The tab lives in the URL: /search?q=gta&type=poll. "all" is left out.

import { FEED_TYPES } from "./feed-types.js";

const POST_TABS = FEED_TYPES.filter((t) => t.id !== "all");
export const POST_TAB_IDS = POST_TABS.map((t) => t.id);

// Anything from the URL -> a valid tab id. Old links (?type=posts) mean "all".
export function readSearchTab(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw ?? "").toLowerCase();
  if (v === "people" || POST_TAB_IDS.includes(v)) return v;
  return "all";
}

// What the post-format filter of the search should use for a tab.
export const postTypeOfTab = (tab) => (POST_TAB_IDS.includes(tab) ? tab : "all");

// [{ id, label, count }]: All first, then only the tabs that have results.
// The tab you are on always stays, even when it is empty, so you can see where you are.
export function buildSearchTabs({ peopleTotal = 0, typeCounts = {}, active = "all" } = {}) {
  const total = peopleTotal + POST_TAB_IDS.reduce((n, id) => n + (typeCounts[id] || 0), 0);
  const tabs = [{ id: "all", label: "All", count: total }];
  if (peopleTotal > 0 || active === "people") tabs.push({ id: "people", label: "People", count: peopleTotal });
  for (const t of POST_TABS) {
    const count = typeCounts[t.id] || 0;
    if (count > 0 || active === t.id) tabs.push({ id: t.id, label: t.label, count });
  }
  return tabs;
}
