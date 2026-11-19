// Everything a member can configure, in one place. Shared by the server (which
// validates and stores it on users/{uid}.prefs) and the browser (which renders
// the panels). Anything missing or invalid falls back to the defaults, so older
// accounts with no settings behave exactly as the site did before.
import { sanitizeLook } from "@/lib/look";
import { DEFAULT_ACCESS, sanitizeAccess } from "@/lib/access";
import { DEFAULT_REELS, sanitizeReels } from "@/lib/reels-prefs";
import { DEFAULT_STORIES, sanitizeStories } from "@/lib/stories-prefs";
import { cleanCurrencyChoice } from "@/lib/currency";
import { DEFAULT_AUDIENCE, MESSAGE_AUDIENCE_IDS } from "@/lib/chat-config";

export const LIMITS = {
  mutedWords: 30,
  wordMin: 2,
  wordMax: 40,
  blocked: 100,
};

export const VISIBILITY_CHOICES = ["public", "private", "ask"];
export const SPOILER_MODES = ["cover", "show", "hide"];
export const FEED_ORDERS = ["foryou", "newest", "hot"];
export const FEED_LENGTHS = [15, 30, 60];
export const USERNAME_RE = /^[a-zA-Z0-9_.]{3,20}$/;

const bool = (v, d) => (typeof v === "boolean" ? v : d);
const oneOf = (v, list, d) => (list.includes(v) ? v : d);

export function cleanWords(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const w = String(raw ?? "")
      .replace(/[\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
    if (w.length < LIMITS.wordMin || w.length > LIMITS.wordMax || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= LIMITS.mutedWords) break;
  }
  return out;
}

export function cleanNames(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of list) {
    const n = String(raw ?? "").trim().toLowerCase();
    if (!USERNAME_RE.test(n) || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= LIMITS.blocked) break;
  }
  return out;
}

export const DEFAULT_PREFS = Object.freeze({
  account: { isPrivate: false },
  content: {
    visibility: "public",
    comments: true,
    hideLikes: false,
    allowShare: true,
    spoiler: false,
    autosave: true,
  },
  safety: {
    discoverable: true,
    whoCanComment: "everyone",
    // Messages: who can start a chat with you, plus two receipts toggles.
    whoCanMessage: DEFAULT_AUDIENCE,
    readReceipts: true,
    showOnline: true,
    blocked: [],
  },
  feed: {
    spoilers: "cover",
    mutedWords: [],
    stories: true,
    composer: true,
    order: "foryou",
    length: 30,
  },
  // Vice Reel (see lib/reels-prefs.js) and Access (see lib/access.js).
  reels: { ...DEFAULT_REELS },
  access: { ...DEFAULT_ACCESS },
  // Story Maker defaults (lib/stories-prefs.js) and the price currency ("auto" = by country).
  stories: { ...DEFAULT_STORIES },
  region: { currency: "auto" },
});

export const SECTIONS = ["account", "content", "safety", "feed", "look", "reels", "access", "stories", "region"];

// Turns whatever is stored (or sent) into a complete, valid prefs object.
export function normalizePrefs(raw) {
  const r = raw && typeof raw === "object" ? raw : {};
  const d = DEFAULT_PREFS;
  const c = r.content || {};
  const s = r.safety || {};
  const f = r.feed || {};
  return {
    account: { isPrivate: bool(r.account?.isPrivate, d.account.isPrivate) },
    content: {
      visibility: oneOf(c.visibility, VISIBILITY_CHOICES, d.content.visibility),
      comments: bool(c.comments, d.content.comments),
      hideLikes: bool(c.hideLikes, d.content.hideLikes),
      allowShare: bool(c.allowShare, d.content.allowShare),
      spoiler: bool(c.spoiler, d.content.spoiler),
      autosave: bool(c.autosave, d.content.autosave),
    },
    safety: {
      discoverable: bool(s.discoverable, d.safety.discoverable),
      whoCanComment: oneOf(s.whoCanComment, ["everyone", "nobody"], d.safety.whoCanComment),
      whoCanMessage: oneOf(s.whoCanMessage, MESSAGE_AUDIENCE_IDS, d.safety.whoCanMessage),
      readReceipts: bool(s.readReceipts, d.safety.readReceipts),
      showOnline: bool(s.showOnline, d.safety.showOnline),
      blocked: cleanNames(s.blocked),
    },
    feed: {
      spoilers: oneOf(f.spoilers, SPOILER_MODES, d.feed.spoilers),
      mutedWords: cleanWords(f.mutedWords),
      stories: bool(f.stories, d.feed.stories),
      composer: bool(f.composer, d.feed.composer),
      order: oneOf(f.order, FEED_ORDERS, d.feed.order),
      length: FEED_LENGTHS.includes(Number(f.length)) ? Number(f.length) : d.feed.length,
    },
    look: sanitizeLook(r.look),
    reels: sanitizeReels(r.reels),
    access: sanitizeAccess(r.access),
    stories: sanitizeStories(r.stories),
    region: { currency: cleanCurrencyChoice(r.region?.currency) },
  };
}

// Applies a partial change to one section and returns the cleaned section.
export function mergeSection(prefs, section, patch) {
  const next = normalizePrefs({
    ...prefs,
    [section]: { ...prefs[section], ...(patch && typeof patch === "object" ? patch : {}) },
  });
  return next[section];
}

// Wanted Level: how exposed an account is, 0 to 5 stars. More stars = more of
// the city knows you.
export function exposureStars(prefs) {
  const open = !prefs.account.isPrivate;
  let stars = 0;
  if (open) stars += 2;
  if (open && prefs.safety.discoverable) stars += 1;
  if (prefs.safety.whoCanComment === "everyone") stars += 1;
  if (prefs.content.visibility === "public") stars += 1;
  return stars;
}

export const EXPOSURE_LABELS = [
  ["Off the radar", "Nobody can find you or see your posts."],
  ["Low profile", "Only a few doors are open."],
  ["Local face", "A handful of people can reach you."],
  ["Known around town", "Plenty of ways for people to find you."],
  ["Hot on the street", "Almost everything about you is open."],
  ["Everybody knows your name", "Public, searchable and open to comments."],
];
