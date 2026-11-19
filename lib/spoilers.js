// Spoiler Shield: the rules for covering spoilers, in one place so the server,
// the cards and the tests all agree. Pure: nothing here touches the database.
//
// A post is covered when its author marked it, or when enough members flagged
// it as "needs a spoiler cover". Each viewer then chooses how covers behave
// for them (Settings > Leak Filter): cover them, show them, or hide them.

export const SPOILER_TOPICS = [
  { id: "story", label: "Story" },
  { id: "characters", label: "Characters" },
  { id: "map", label: "Map and places" },
  { id: "gameplay", label: "Gameplay" },
  { id: "leak", label: "Leak" },
];

export const SPOILER_MODES = ["cover", "show", "hide"];

// How many different members must flag a post before it is covered for everyone.
export const FLAG_THRESHOLD = 3;

// Poll and event cards have nothing to hide, so they can't carry a spoiler cover.
export function canCarrySpoiler(type) {
  return type !== "poll" && type !== "event";
}

export function cleanTopic(v) {
  return SPOILER_TOPICS.some((t) => t.id === v) ? v : "";
}

export function topicLabel(id) {
  return SPOILER_TOPICS.find((t) => t.id === id)?.label || "";
}

export function cleanFlags(v) {
  if (!Array.isArray(v)) return [];
  return [...new Set(v.filter((x) => typeof x === "string" && x))];
}

// What a viewer sees for one stored post.
// { spoiler, topic, by: "author" | "community" | null, flaggedByMe }
export function spoilerState(data, viewerUid) {
  const type = data?.type || "post";
  if (!canCarrySpoiler(type)) return { spoiler: false, topic: "", by: null, flaggedByMe: false };
  const flags = cleanFlags(data?.spoilerFlags);
  const byAuthor = !!data?.settings?.spoiler;
  const byCommunity = flags.length >= FLAG_THRESHOLD;
  return {
    spoiler: byAuthor || byCommunity,
    topic: byAuthor ? cleanTopic(data?.settings?.spoilerTopic) : "",
    by: byAuthor ? "author" : byCommunity ? "community" : null,
    flaggedByMe: !!viewerUid && flags.includes(viewerUid),
  };
}

// Flag on, or flag off again if this member already flagged it. Past `max`
// flags the post is long covered, so nothing more is stored.
export function toggleFlag(flags, uid, max = 25) {
  const list = cleanFlags(flags);
  const has = list.includes(uid);
  if (!has && list.length >= max) return { flags: list, flagged: true };
  return { flags: has ? list.filter((x) => x !== uid) : [...list, uid], flagged: !has };
}

export function readSpoilerMode(v) {
  return SPOILER_MODES.includes(v) ? v : "cover";
}

// The member's choice lives in their account, and in a cookie so every page,
// including search and communities, paints the right way on first load.
export const SPOILER_COOKIE = "gta6fb_spoilers";

// Browser only.
export function rememberSpoilerMode(mode) {
  const m = readSpoilerMode(mode);
  document.documentElement.dataset.spoilers = m;
  document.cookie =
    m === "cover"
      ? `${SPOILER_COOKIE}=; path=/; max-age=0; samesite=lax`
      : `${SPOILER_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
}
