import test from "node:test";
import assert from "node:assert/strict";
import { FEED_TYPES, fetchSize, feedHref, feedTypeInfo, filterByType, matchesType, readFeedType } from "../lib/feed-types.js";

test("readFeedType accepts real formats, anything else is all", () => {
  for (const t of ["post", "video", "poll", "theory", "event", "all"]) assert.equal(readFeedType(t), t);
  assert.equal(readFeedType("POLL"), "poll");
  assert.equal(readFeedType(["video", "poll"]), "video");
  for (const bad of [undefined, null, "", "story", "<script>", "polls", 5]) assert.equal(readFeedType(bad), "all");
});

test("every format the composer can make has a chip, with All first", async () => {
  // post-schema.js uses the app's "@/" import alias, which plain Node can't resolve, so read the
  // format ids out of its TYPES block instead of importing it.
  const { readFileSync } = await import("node:fs");
  const src = readFileSync(new URL("../lib/post-schema.js", import.meta.url), "utf8");
  const block = src.slice(src.indexOf("export const TYPES = {"), src.indexOf("export const LIMITS"));
  const ids = [...block.matchAll(/^  (\w+): \{$/gm)].map((m) => m[1]);
  assert.ok(ids.length >= 5);
  assert.equal(FEED_TYPES[0].id, "all");
  assert.deepEqual(FEED_TYPES.slice(1).map((t) => t.id).sort(), ids.sort());
});

test("matchesType: older posts with no type are photo posts", () => {
  assert.ok(matchesType({}, "post"));
  assert.ok(!matchesType({}, "video"));
  assert.ok(matchesType({ type: "poll" }, "poll"));
  assert.ok(matchesType({ type: "event" }, "all"));
  assert.ok(!matchesType({ type: "poll" }, "theory"));
});

test("filterByType keeps order and returns the same list for all", () => {
  const list = [{ id: 1, type: "video" }, { id: 2, type: "poll" }, { id: 3, type: "video" }, { id: 4 }];
  assert.equal(filterByType(list, "all"), list);
  assert.deepEqual(filterByType(list, "video").map((p) => p.id), [1, 3]);
  assert.deepEqual(filterByType(list, "post").map((p) => p.id), [4]);
  assert.deepEqual(filterByType(list, "theory"), []);
});

test("fetchSize reads more when filtering, but never unbounded", () => {
  assert.equal(fetchSize(30, "all"), 30);
  assert.equal(fetchSize(30, "poll"), 120);
  assert.equal(fetchSize(100, "poll"), 200);
});

test("feedHref builds clean URLs and drops defaults", () => {
  assert.equal(feedHref(), "/");
  assert.equal(feedHref({ type: "all" }), "/");
  assert.equal(feedHref({ type: "poll" }), "/?type=poll");
  assert.equal(feedHref({ feed: "following" }), "/?feed=following");
  assert.equal(feedHref({ feed: "following", type: "video" }), "/?feed=following&type=video");
  assert.equal(feedHref({ base: "/saved", type: "event" }), "/saved?type=event");
  assert.equal(feedHref({ feed: "other", type: "all" }), "/");
});

test("feedTypeInfo falls back to All", () => {
  assert.equal(feedTypeInfo("video").label, "Videos");
  assert.equal(feedTypeInfo("nope").id, "all");
});
