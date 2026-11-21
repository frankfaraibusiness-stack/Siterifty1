// Single source of truth for the ad system. Safe to import from server and
// client code. Money is always handled in whole CENTS (integers) so rounding
// is identical in the browser quote and on the server charge.

// While true, "paying" for an ad costs nothing: the order is recorded as a
// TEST order and the ad starts serving. Flip to false once checkout exists:
// app/api/ads then refuses to launch or top up ads until you add a payment
// step there (same pattern as PERKS_FREE_WHILE_TESTING in lib/perks.js).
export const ADS_FREE_WHILE_TESTING = true;

// Rates. cpmCents = price per 1,000 views. The extra charge on top is a fixed
// amount plus a percentage of the ad budget (tax for image ads, fees for video).
export const AD_RATES = {
  image: { label: "Image ad", cpmCents: 200, fixedCents: 18, pct: 5, extraLabel: "Tax" },
  video: { label: "Video ad", cpmCents: 500, fixedCents: 50, pct: 10, extraLabel: "Fees" },
};

export const BUDGET = { minCents: 500, maxCents: 500_000, stepCents: 100, sliderMaxCents: 100_000 };
export const VIDEO_MAX_SECONDS = 30;
export const VIDEO_MAX_MB = 50;
export const IMAGE_MAX_BYTES = 520_000; // after in-browser compression

export const PLACEMENTS = [
  {
    id: "feed",
    label: "Home feed",
    short: "Feed",
    note: "A full-width card after every 4 to 5 posts on the main feed.",
    format: "Large image or video card",
  },
  {
    id: "community",
    label: "Communities & groups",
    short: "Communities",
    note: "A compact card, in the community's own colours, after every 4 to 5 posts inside community pages. The whole card is tappable.",
    format: "Compact card (picture or video cover)",
  },
  {
    id: "stories",
    label: "Stories",
    short: "Stories",
    note: "A full-screen sponsored story after every 3 to 4 stories someone watches. Tall (vertical) pictures and clips fit best.",
    format: "Full-screen image or video",
  },
  {
    id: "videos",
    label: "Videos",
    short: "Videos",
    note: "A full-screen sponsored card after every 3 to 5 clips in the Videos tab, and ads that play inside monetized Long form videos. Video ads blend in best; vertical (9:16) clips and pictures fit the screen.",
    format: "Full-screen video or image",
  },
  {
    id: "messages",
    label: "Messages",
    short: "Messages",
    note: "A compact sponsored row after every 5 messages in a chat. The whole row is tappable.",
    format: "Small square thumbnail + title + description",
  },
];
export const PLACEMENT_IDS = PLACEMENTS.map((p) => p.id);
export const SOURCE_LABEL = Object.fromEntries(PLACEMENTS.map((p) => [p.id, p.label]));

// How often a slot appears.
export const FEED_GAP = [4, 5];
export const MESSAGE_GAP = 5;
export const STORY_GAP = [3, 4]; // stories watched between two story ads
export const VIDEO_GAP = [3, 5]; // clips between two ads in the Videos tab (3, 4 or 5)
export const STORY_AD_SECONDS = 6; // how long a picture ad stays up in stories (clips play to their end)

export const CTA_OPTIONS = [
  "Learn more", "Shop now", "Sign up", "Download", "Watch now",
  "Get offer", "Book now", "Join now", "Play now", "Apply now",
];

// Who an ad is meant for, by the gender picked at sign-up (Lucia = female, Jason = male).
// Saved on every ad; the default is everyone. Ad serving does not filter on it yet: every live ad is still
// shown to every viewer. To switch targeting on later, use audienceMatches() where serveAd() picks an ad
// (the viewer's gender comes from users/{uid}.gender).
export const AUDIENCES = [
  { id: "all", label: "Everyone" },
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
];
export const AUDIENCE_IDS = AUDIENCES.map((a) => a.id);
export const AUDIENCE_LABEL = Object.fromEntries(AUDIENCES.map((a) => [a.id, a.label]));

// Does an ad with this audience fit a viewer of this gender ("male" | "female" | unknown)?
// Everyone-ads fit all viewers; a viewer whose gender is unknown (older accounts, guests) only gets them.
export function audienceMatches(audience, gender) {
  return !audience || audience === "all" || audience === gender;
}

export const LIMITS = { name: 60, title: 60, description: 140, link: 600 };

export const STATUS_LABEL = { active: "Live", paused: "Paused", exhausted: "Out of balance", ended: "Ended" };

// ---- money ---------------------------------------------------------------

export function clampBudgetCents(cents) {
  const n = Math.round(Number(cents));
  if (!Number.isFinite(n)) return BUDGET.minCents;
  return Math.min(BUDGET.maxCents, Math.max(BUDGET.minCents, n));
}

// What an advertiser pays for a budget: budget + (fixed + percentage).
// views = how many views that budget buys at the type's rate.
export function quote(type, budgetCents) {
  const r = AD_RATES[type] || AD_RATES.image;
  const b = clampBudgetCents(budgetCents);
  const views = Math.floor((b * 1000) / r.cpmCents);
  const pctCents = Math.round((b * r.pct) / 100);
  const extraCents = r.fixedCents + pctCents;
  return {
    type,
    budgetCents: b,
    views,
    fixedCents: r.fixedCents,
    pct: r.pct,
    pctCents,
    extraCents,
    extraLabel: r.extraLabel,
    totalCents: b + extraCents,
    cpmCents: r.cpmCents,
  };
}

// "$1,234.50"
export const usd = (cents) =>
  `$${(Math.round(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const num = (n) => Math.round(n || 0).toLocaleString("en-US");

export const ctr = (clicks, views) => (views > 0 ? (clicks / views) * 100 : 0);
export const pctText = (v) => `${v >= 10 ? v.toFixed(1) : v.toFixed(2)}%`;

// Money already used up by delivered views (budget only, tax excluded).
export const spentCents = (type, views) => Math.round(((views || 0) * (AD_RATES[type] || AD_RATES.image).cpmCents) / 1000);

// ---- day keys (UTC), safe as Firestore field names ----------------------

export const dayKey = (ms = Date.now()) => `d${new Date(ms).toISOString().slice(0, 10).replace(/-/g, "")}`;
export function dayKeyToLabel(key) {
  const m = /^d(\d{4})(\d{2})(\d{2})$/.exec(key);
  if (!m) return key;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}
// The last `n` UTC days (oldest first) filled from an ad's `days` map.
export function lastDays(daysMaps, n) {
  const out = [];
  const now = Date.now();
  for (let i = n - 1; i >= 0; i -= 1) {
    const key = dayKey(now - i * 86_400_000);
    let v = 0;
    let c = 0;
    for (const d of daysMaps) {
      v += d?.[key]?.v || 0;
      c += d?.[key]?.c || 0;
    }
    out.push({ key, label: dayKeyToLabel(key), v, c });
  }
  return out;
}

// ---- validation ----------------------------------------------------------

const clean = (s, max) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);

// Returns a normalised http(s) URL, or "" when it isn't one.
export function cleanUrl(raw) {
  let s = String(raw ?? "").trim();
  if (!s || s.length > LIMITS.link) return "";
  if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = `https://${s}`;
  try {
    const u = new URL(s);
    if (u.protocol !== "https:" && u.protocol !== "http:") return "";
    if (u.username || u.password) return "";
    if (!u.hostname.includes(".")) return "";
    return u.toString();
  } catch {
    return "";
  }
}
export const hostOf = (url) => {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; }
};

// Validates the text fields shared by create and edit. Returns { value, errors }.
export function validateCopy(input, { partial = false } = {}) {
  const errors = {};
  const value = {};
  const has = (k) => !partial || input[k] !== undefined;
  if (has("name")) {
    value.name = clean(input.name, LIMITS.name);
    if (value.name.length < 2) errors.name = "Give the ad a name (only you see it).";
  }
  if (has("title")) {
    value.title = clean(input.title, LIMITS.title);
    if (value.title.length < 3) errors.title = "Add a headline of at least 3 characters.";
  }
  if (has("description")) {
    value.description = clean(input.description, LIMITS.description);
  }
  if (has("cta")) {
    value.cta = CTA_OPTIONS.includes(input.cta) ? input.cta : "";
    if (!value.cta) errors.cta = "Pick a button label.";
  }
  if (has("link")) {
    value.link = cleanUrl(input.link);
    if (!value.link) errors.link = "Enter a valid link, like https://yoursite.com";
  }
  if (has("placements")) {
    const list = Array.isArray(input.placements) ? input.placements.filter((p) => PLACEMENT_IDS.includes(p)) : [];
    value.placements = [...new Set(list)];
    if (value.placements.length === 0) errors.placements = "Choose at least one place for your ad to show.";
  }
  if (has("audience")) {
    value.audience = AUDIENCE_IDS.includes(input.audience) ? input.audience : "all";
  }
  return { value, errors };
}

// ---- slot spacing ---------------------------------------------------------

// How many posts to show before the next ad (4 or 5). Derived from a post id, so
// the layout stays put when the page refreshes instead of jumping around.
export function adGap(seed) {
  let h = 0;
  for (const c of String(seed ?? "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FEED_GAP[h % FEED_GAP.length];
}

// How many clips to show before the next ad in the Videos tab (3, 4 or 5). `seed` + `n` (which
// ad this is, 0, 1, 2 ...) always give the same answer, so a visit has a steady rhythm that is
// still different from one visit to the next when the seed changes.
export function videoAdGap(seed, n) {
  let h = (Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) + Math.imul(n + 1, 0xc2b2ae35)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d) >>> 0; h = (h ^ (h >>> 12)) >>> 0;
  const [lo, hi] = VIDEO_GAP;
  return lo + (h % (hi - lo + 1));
}
