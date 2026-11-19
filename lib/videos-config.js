// The rules of the Videos tab ("Vice Reel"), shared by the server (which awards
// XP and checks every claim) and the browser (which draws the HUD). Plain data
// and pure functions only, so it is covered by tests/videos.test.mjs.
//
// The game in one breath: watch clips to the end to earn XP, chain clips into a
// combo, light up the WANTED stars on clips you love, find Hidden Packages,
// clear 3 daily missions and keep your daily streak alive to climb the ranks.

// ---------------------------------------------------------------- XP values
export const XP = {
  watch: 10, // finished a clip (x combo)
  like: 5, // gave a clip heat
  comment: 15,
  save: 5,
  share: 10,
  package: 50, // found a Hidden Package
};
export const DAILY_XP_CAP = 700; // actions stop paying out past this (missions still pay)
export const WATCH_FRACTION = 0.8; // a clip counts once this much of it has played
export const MIN_WATCH_SECONDS = 2; // ...and at least this long, so 1s loops can't farm it
export const STREAK_CLIPS = 5; // finish this many clips in a day to keep the streak
export const STREAK_BONUS = 10; // x streak days, capped below
export const STREAK_BONUS_MAX = 100;
export const MAX_EVENTS = 20; // per request
export const MAX_ACTS = 160; // per day: remembered "already paid" actions

// ---------------------------------------------------------------- ranks
// Not the plan names (Drifter / Wheelman / Mastermind / Kingpin): these are
// earned by watching, plans are bought.
export const RANKS = [
  { name: "Tourist", xp: 0 },
  { name: "Beach Bum", xp: 120 },
  { name: "Hustler", xp: 320 },
  { name: "Smuggler", xp: 650 },
  { name: "Enforcer", xp: 1200 },
  { name: "Underboss", xp: 2200 },
  { name: "Mogul", xp: 3800 },
  { name: "Vice Legend", xp: 6000 },
];

// xp -> { level (1-based), name, into, span, pct, next (name or null) }
export function rankFor(xp) {
  const total = Math.max(0, Math.floor(Number(xp) || 0));
  let i = 0;
  while (i + 1 < RANKS.length && total >= RANKS[i + 1].xp) i += 1;
  const cur = RANKS[i];
  const nxt = RANKS[i + 1];
  if (!nxt) return { level: i + 1, name: cur.name, into: total - cur.xp, span: 0, pct: 100, next: null };
  const span = nxt.xp - cur.xp;
  const into = total - cur.xp;
  return { level: i + 1, name: cur.name, into, span, pct: Math.min(100, Math.round((into / span) * 100)), next: nxt.name };
}

// ---------------------------------------------------------------- combo
// Finish clips back to back and the multiplier climbs: x1 x1 x2 x2 x3 x3 x4 x4 x5.
export const COMBO_MAX = 5;
export function comboMultiplier(chain) {
  const n = Math.max(0, Math.floor(Number(chain) || 0));
  return Math.min(COMBO_MAX, 1 + Math.floor(n / 2));
}

// ---------------------------------------------------------------- heat (wanted stars)
// 0-5 stars from how much a clip is loved, fading as it ages so new clips can rise.
export function heatScore({ likes = 0, comments = 0, shares = 0, ageHours = 0 }) {
  const raw = likes * 3 + comments * 4 + shares * 5;
  return raw / Math.pow(1 + Math.max(0, ageHours) / 24, 0.6);
}
const HEAT_STEPS = [2, 8, 20, 45, 90]; // score needed for 1..5 stars
export function heatLevel(input) {
  const s = heatScore(input);
  let stars = 0;
  for (const step of HEAT_STEPS) if (s >= step) stars += 1;
  return stars;
}

// ---------------------------------------------------------------- days
// A "day" is the player's own calendar day (tz = minutes east of UTC, i.e.
// -new Date().getTimezoneOffset()), so missions reset at THEIR midnight.
export function cleanTz(tz) {
  const n = Math.round(Number(tz));
  return Number.isFinite(n) ? Math.max(-14 * 60, Math.min(14 * 60, n)) : 0;
}
export function dayKey(nowMs, tz = 0) {
  const d = new Date(nowMs + cleanTz(tz) * 60_000);
  return d.toISOString().slice(0, 10);
}
export function prevDayKey(key) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------- missions
// Two fixed missions plus one "wildcard" that rotates daily.
// `stat` is a counter kept on the player's day record.
const FIXED = [
  { id: "binge", stat: "clips", goal: 10, xp: 60, title: "Binge Run", text: "Finish 10 clips" },
  { id: "fire", stat: "likes", goal: 3, xp: 40, title: "Stoke the Fire", text: "Give heat to 3 clips" },
];
const WILD = [
  { id: "talk", stat: "comments", goal: 1, xp: 40, title: "Street Talk", text: "Comment on a clip" },
  { id: "crate", stat: "packages", goal: 1, xp: 50, title: "Package Hunter", text: "Find a Hidden Package" },
  { id: "stash", stat: "saves", goal: 2, xp: 40, title: "Stash It", text: "Save 2 clips" },
  { id: "spread", stat: "shares", goal: 1, xp: 40, title: "Spread the Word", text: "Share a clip" },
  { id: "marathon", stat: "clips", goal: 20, xp: 90, title: "Marathon", text: "Finish 20 clips" },
];

export function hashStr(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function missionsFor(day) {
  return [...FIXED, WILD[hashStr(`wild:${day}`) % WILD.length]];
}

// ---------------------------------------------------------------- hidden packages
// Roughly one clip in six hides a package on any given day. Where it floats and
// when it shows up is derived from the clip id + the day, so the server can
// check a claim without storing anything, and it is a different clip each day.
export const PACKAGE_ODDS = 6;
export function packageFor(postId, day) {
  const h = hashStr(`pkg:${postId}:${day}`);
  if (h % PACKAGE_ODDS !== 0) return null;
  const g = hashStr(`pos:${postId}:${day}`);
  return {
    x: 14 + (g % 62), // % from the left
    y: 24 + ((g >>> 8) % 42), // % from the top
    afterMs: 1500 + ((g >>> 16) % 3000), // appears this long after the clip starts
  };
}

// ---------------------------------------------------------------- misc
export const POST_ID = /^[A-Za-z0-9_-]{1,100}$/;
export const EVENT_TYPES = ["watch", "like", "comment", "save", "share", "package"];
