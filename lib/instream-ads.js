// In-stream ads on monetized Long form videos: the rules, shared by the server (which decides every
// break, every view and every cent) and the browser (which only draws what the server handed it).
// Plain data and pure functions, so tests/instream-ads.test.mjs covers it.
//
// The money in one breath
//   Advertisers pay per view: $2 per 1,000 photo-ad views, $5 per 1,000 video-ad views (AD_RATES in
//   lib/ads.js). The creator keeps 30% of whatever the ad that was really shown cost:
//     photo ad view  ->  $0.0006  ($0.60 per 1,000 ad views)
//     video ad view  ->  $0.0015  ($1.50 per 1,000 ad views)
//   Earnings are always paid per ad that was actually shown, so a "both" video simply earns more on the
//   video ads and less on the photo ads. The RPM we show for "both" is the average of the two ($1.05).
//
// Money is counted in micro-dollars (1,000,000 = $1) because one view is a fraction of a cent.

import { AD_RATES } from "./ads.js";

export const CREATOR_SHARE_PCT = 30;
export const MAX_ADS = 3; // per video, whatever the creator picks
export const MIN_GAP_SECONDS = 60; // between two ads in the same video
export const SKIP_AFTER_SECONDS = 5; // an ad longer than this can be skipped once it has played this long
export const IMAGE_AD_SECONDS = 5; // a photo ad stays up this long, then ends by itself
export const WINDOW_MS = 6 * 3_600_000; // one viewer sees (and earns for) each ad spot of a video once per window
export const TOKEN_TTL_MS = 30 * 60_000;

export const AD_KINDS = ["video", "image", "mixed"];
export const AD_SPOTS = ["start", "mid", "end"];

export const KIND_LABEL = { video: "Video ads", image: "Photo ads", mixed: "Photo and video ads" };
export const SPOT_LABEL = { start: "Start", mid: "Middle", end: "End" };

export const DEFAULT_PREFS = { kind: "mixed", spots: ["mid"], count: 1 };

// ---- money -------------------------------------------------------------------

// What the creator earns for ONE view of an ad of this type, in micro-dollars.
// cpmCents is the advertiser's price per 1,000 views, so one view costs cpmCents * 10 micro-dollars.
export function creatorMicros(adType) {
  const r = AD_RATES[adType === "video" ? "video" : "image"];
  return Math.round((r.cpmCents * 10 * CREATOR_SHARE_PCT) / 100);
}

// The RPM shown to creators: dollars earned per 1,000 ad views.
export function rpmDollars(kind) {
  const image = creatorMicros("image") / 1000;
  const video = creatorMicros("video") / 1000;
  if (kind === "image") return image;
  if (kind === "video") return video;
  return (image + video) / 2;
}

export const microsToDollars = (micros) => (Number(micros) || 0) / 1_000_000;

// "$12.34", or "$0.0025" while the amount is still a tiny fraction of a cent.
export function moneyText(micros) {
  const d = microsToDollars(micros);
  if (d === 0) return "$0.00";
  if (d < 0.01) return `$${d.toFixed(4)}`;
  return `$${d.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ---- the creator's choices ----------------------------------------------------------

// A trusted copy of whatever the browser sent. Anything unknown falls back to the default.
export function cleanAdPrefs(input) {
  const raw = input && typeof input === "object" ? input : {};
  const kind = AD_KINDS.includes(raw.kind) ? raw.kind : DEFAULT_PREFS.kind;
  const picked = Array.isArray(raw.spots) ? raw.spots.filter((s) => AD_SPOTS.includes(s)) : [];
  const spots = AD_SPOTS.filter((s) => picked.includes(s)); // fixed order, no duplicates
  const n = Math.round(Number(raw.count));
  const count = Number.isFinite(n) ? Math.min(MAX_ADS, Math.max(1, n)) : DEFAULT_PREFS.count;
  return { kind, spots: spots.length ? spots : [...DEFAULT_PREFS.spots], count };
}

// ---- where the ads go ----------------------------------------------------------------

// The ad breaks of one video: [{ idx, at (seconds into the video), kind: "start" | "mid" | "end" }].
//
//   start  plays before the video (at 0)         end  plays after the last second (at the duration)
//   mid    plays part-way through, spread evenly between the other ads
//
// Rules: never more than `count` (itself at most 3) ads, and always at least 60 seconds of video between
// two ads. When the video is too short to fit everything the creator asked for, mid-roll ads are dropped
// first, then the end ad. The creator's count is a ceiling: a video never gets more ads than they asked for.
export function planBreaks(durationSeconds, prefsInput) {
  const prefs = cleanAdPrefs(prefsInput);
  const dur = Math.floor(Number(durationSeconds));
  if (!Number.isFinite(dur) || dur < MIN_GAP_SECONDS) return [];

  let left = prefs.count;
  const wantStart = prefs.spots.includes("start");
  const wantMid = prefs.spots.includes("mid");
  const wantEnd = prefs.spots.includes("end");

  const start = wantStart && left > 0;
  if (start) left -= 1;

  let end = false;
  let mids = 0;
  if (wantMid && wantEnd) {
    if (left >= 2) { end = true; mids = left - 1; }
    else if (left === 1) mids = 1;
  } else if (wantMid) mids = left;
  else if (wantEnd && left > 0) end = true;

  // Fewer mid-roll ads until they fit with a full gap around each one.
  const place = (m) => {
    const at = [];
    for (let i = 1; i <= m; i += 1) at.push(Math.round((dur * i) / (m + 1)));
    const pts = [...(start ? [0] : []), ...at, ...(end ? [dur] : [])];
    for (let i = 1; i < pts.length; i += 1) if (pts[i] - pts[i - 1] < MIN_GAP_SECONDS) return null;
    // Never a mid-roll in the first or last minute, even with no start or end ad.
    if (at.length && (at[0] < MIN_GAP_SECONDS || dur - at[at.length - 1] < MIN_GAP_SECONDS)) return null;
    return at;
  };
  let mid = [];
  for (let m = mids; m >= 0; m -= 1) {
    const at = place(m);
    if (at) { mid = at; break; }
  }

  // The start and end ads need a full gap to the mid-roll ads too; if the video is so short that start
  // and end alone are under a minute apart, the end ad is dropped.
  const breaks = [];
  if (start) breaks.push({ at: 0, kind: "start" });
  mid.forEach((at) => breaks.push({ at, kind: "mid" }));
  if (end && dur - (breaks.length ? breaks[breaks.length - 1].at : -Infinity) >= MIN_GAP_SECONDS) breaks.push({ at: dur, kind: "end" });
  return breaks.slice(0, MAX_ADS).map((b, idx) => ({ idx, ...b }));
}

// ---- how an ad behaves in the player ---------------------------------------------------

// How long this ad runs, in seconds. A photo ad has a fixed length; a video ad is as long as its clip.
export function adSeconds(ad) {
  const m = ad?.media || {};
  if (m.kind === "video") return Math.max(1, Math.round((Number(m.duration) || 15) * 10) / 10);
  return IMAGE_AD_SECONDS;
}

// Longer than 5 seconds: the viewer may skip once it has played 5 seconds. Otherwise it ends by itself.
// Nothing ever skips automatically at 5 seconds: a long ad runs to its end unless the viewer taps Skip.
export const isSkippable = (seconds) => seconds > SKIP_AFTER_SECONDS;

// How long an ad must have really played before it counts as a view (and pays the creator).
export const countsAfterSeconds = (seconds) => Math.min(seconds, SKIP_AFTER_SECONDS);

// ---- which posts run ads --------------------------------------------------------------------

// A post that may run ads: an uploaded Long form video, switched on by its author, public and live.
// (Whether the author is still on a plan that allows it is checked by the server when an ad is served.)
export function isMonetizedPost(data, now = Date.now()) {
  const m = data?.media;
  return !!(
    data && data.type === "video" && m?.kind === "storage" && m.form === "long" && m.monetized === true &&
    data.settings?.visibility !== "private" && (data.createdAt?.toMillis?.() ?? 0) <= now
  );
}

// The ad breaks a viewer's player gets with a post, decided on the server and sent along with the post:
// [{ idx, at, kind }]. `null` when the post doesn't run ads or the viewer is its author (authors never see,
// or earn from, ads on their own video). The player can only ask for these breaks; the server re-checks each one.
export function breaksFor(data, viewerUid) {
  if (!isMonetizedPost(data)) return null;
  if (viewerUid && data.uid === viewerUid) return null;
  const breaks = planBreaks(data.media.seconds, data.media.adPrefs);
  return breaks.length ? breaks : null;
}
