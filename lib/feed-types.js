// "Show me only videos / polls / ...": the post-type filter on the home feed and on Saved.
// Pure (no imports), so the server pages, the chip row and the tests all share it.
//
// The choice lives in the URL (/?type=poll, /saved?type=video), so it can be shared and
// the back button works. "all" is the default and is left out of the URL.

export const FEED_TYPES = [
  { id: "all", label: "All", plural: "posts" },
  { id: "post", label: "Posts", plural: "photo posts" },
  { id: "video", label: "Videos", plural: "videos" },
  { id: "poll", label: "Polls", plural: "polls" },
  { id: "theory", label: "Theories", plural: "theories" },
  { id: "event", label: "Events", plural: "events" },
];

const IDS = new Set(FEED_TYPES.map((t) => t.id));

// Anything from the URL (a string, an array when the param is repeated, nothing) -> a valid id.
export function readFeedType(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const id = String(v ?? "").toLowerCase();
  return IDS.has(id) ? id : "all";
}

export const feedTypeInfo = (id) => FEED_TYPES.find((t) => t.id === id) || FEED_TYPES[0];

// Works on a mapped post or a raw Firestore document's data: both keep the format in
// `type`, and older posts that have none are photo posts.
export const matchesType = (item, type) => type === "all" || (item?.type || "post") === type;

export const filterByType = (posts, type) => (type === "all" ? posts : posts.filter((p) => matchesType(p, type)));

// Firestore can't filter by type and sort by date without a composite index (this app
// avoids those), so a filtered feed reads a bigger slice of the newest posts and filters it.
export const fetchSize = (limit, type) => (type === "all" ? limit : Math.min(limit * 4, 200));

// "/", "/?type=poll", "/?feed=following&type=video", "/saved?type=event".
export function feedHref({ base = "/", feed = null, type = "all" } = {}) {
  const p = new URLSearchParams();
  if (feed === "following") p.set("feed", "following");
  if (type && type !== "all") p.set("type", type);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}
