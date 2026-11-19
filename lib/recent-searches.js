// "Recent searches": the last few things this device searched for, kept in
// localStorage (never sent anywhere). Used by components/touches/RecentSearches.js.
// Every function is safe to call on the server or when storage is blocked.

const KEY = "gfb:recent-searches";
const MAX = 8;
export const RECENT_EVENT = "gfb:recent-searches";

// The raw stored string (stable between calls, so it works as a store snapshot).
export function readRecentRaw() {
  try {
    return window.localStorage.getItem(KEY) || "[]";
  } catch {
    return "[]";
  }
}

export function parseRecent(raw) {
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((q) => typeof q === "string" && q.trim()).slice(0, MAX) : [];
  } catch {
    return [];
  }
}

function write(list) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    // Storage is full or blocked: the history just isn't kept.
  }
}

export function saveRecent(query) {
  const q = String(query || "").trim().slice(0, 80);
  if (q.length < 2) return;
  const rest = parseRecent(readRecentRaw()).filter((x) => x.toLowerCase() !== q.toLowerCase());
  write([q, ...rest]);
}

export function removeRecent(query) {
  write(parseRecent(readRecentRaw()).filter((x) => x !== query));
}

export function clearRecent() {
  write([]);
}
