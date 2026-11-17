// Pure helpers for the feed cards (no React, no Firestore, no "@/" imports), so
// they can be unit tested with plain `node --test`. Anything that depends on
// the viewer's time zone takes `now` as an argument and works in local days.

const HANDLE = /(^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{3,20})/;
const HASHTAG = /(^|[^A-Za-z0-9_&#/])#([A-Za-z0-9]{1,24})(?![A-Za-z0-9_])/;
// One pass over both so a "#" or "@" inside the other kind of token is left alone.
const TOKEN = new RegExp(`${HANDLE.source}|${HASHTAG.source}`, "g");

// --- text -------------------------------------------------------------------

// Splits text into plain, @mention and #tag segments. Joining every segment's
// `raw` gives back the original string exactly.
export function tokenizeText(text) {
  const src = String(text ?? "");
  const out = [];
  let last = 0;
  const push = (type, raw, extra = {}) => {
    if (raw) out.push({ type, raw, ...extra });
  };
  for (const m of src.matchAll(TOKEN)) {
    const lead = m[1] ?? m[3] ?? "";
    const start = m.index + lead.length;
    if (m[2] !== undefined) {
      // A trailing dot is punctuation, not part of the handle.
      const handle = m[2].replace(/\.+$/, "");
      if (handle.length < 3) continue;
      push("text", src.slice(last, start));
      push("mention", `@${handle}`, { handle });
      last = start + 1 + handle.length;
    } else {
      push("text", src.slice(last, start));
      push("tag", `#${m[4]}`, { tag: m[4] });
      last = start + 1 + m[4].length;
    }
  }
  push("text", src.slice(last));
  return out;
}

export const tagHref = (tag) => `/search?q=${encodeURIComponent(`#${String(tag).replace(/^#+/, "")}`)}`;
export const profileHref = (handle) => `/u/${encodeURIComponent(handle)}`;

// A post's tags as bare names, from `tags` or the stored "#A #B" string.
export function parseTags(post) {
  const raw = Array.isArray(post?.tags) && post.tags.length
    ? post.tags
    : String(post?.tag ?? "").split(/\s+/);
  const seen = new Set();
  const out = [];
  for (const t of raw) {
    const name = String(t).replace(/^#+/, "").replace(/[^A-Za-z0-9]/g, "");
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

// Whole minutes to read, never less than 1 (200 words a minute).
export function readMinutes(text) {
  const words = String(text ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

// True when text is long enough to be worth a "Show more" button.
export function needsClamp(text, { chars = 220, lines = 4 } = {}) {
  const s = String(text ?? "");
  return s.length > chars || s.split("\n").length > lines;
}

// --- media ------------------------------------------------------------------

export function formatDuration(seconds) {
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return "";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

// The small chip laid over a post's media: { icon, label } or null.
export function mediaChip(media) {
  if (!media) return null;
  if (media.type === "images") {
    const n = Number(media.count) || media.preview?.length || 0;
    return n > 1 ? { icon: "photos", label: `${n} photos` } : null;
  }
  if (media.type === "video") {
    if (media.kind === "youtube") return { icon: "play", label: "YouTube" };
    const d = formatDuration(media.preview?.duration ?? media.seconds);
    return { icon: "play", label: d || "Video" };
  }
  return null;
}

// --- polls ------------------------------------------------------------------

export function timeLeft(endsAtMs, now) {
  if (endsAtMs == null) return "";
  const diff = endsAtMs - now;
  if (diff <= 0) return "Ended";
  const m = Math.ceil(diff / 60_000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

// What the poll header needs: totals, who leads, and whether it's a tie.
export function pollSummary(poll, now) {
  const counts = poll.counts || [];
  const lead = counts.length ? Math.max(...counts) : 0;
  const leaders = lead > 0 ? counts.flatMap((c, i) => (c === lead ? [i] : [])) : [];
  const total = poll.multi ? poll.voters : counts.reduce((a, b) => a + b, 0);
  const ended = poll.endsAtMs != null && poll.endsAtMs <= now;
  return {
    ended,
    total,
    voters: poll.voters,
    leaders,
    tie: leaders.length > 1,
    leadPct: total && lead ? Math.round((lead / total) * 100) : 0,
    left: timeLeft(poll.endsAtMs, now),
  };
}

// --- theories ---------------------------------------------------------------

export function confidenceTone(c) {
  const n = Math.min(100, Math.max(0, Number(c) || 0));
  return n < 25 ? "cap" : n < 50 ? "maybe" : n < 75 ? "likely" : "locked";
}

// --- events -----------------------------------------------------------------

// Midnight-to-midnight calendar days between two instants in the viewer's own
// time zone. Using local calendar fields (not ms / 86_400_000) keeps it right
// on 23 and 25 hour days when the clocks change.
export function localDayDiff(startMs, nowMs) {
  const a = new Date(startMs);
  const b = new Date(nowMs);
  const dayA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const dayB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((dayA - dayB) / 86_400_000);
}

// "Today", "Tomorrow", "In 5 days" for the date block. Empty after 2 weeks,
// and for anything that already started (the live / ended state says that).
export function dayChip(startMs, nowMs) {
  if (nowMs >= startMs) return "";
  const d = localDayDiff(startMs, nowMs);
  if (d <= 0) return "Today";
  if (d === 1) return "Tomorrow";
  return d <= 14 ? `In ${d} days` : "";
}

// How full an event is: { pct, tone: "open" | "filling" | "full", label }.
export function capacityState(going, capacity, { waitlist = false, waiting = 0 } = {}) {
  if (capacity == null) return { pct: 0, tone: "open", label: "No spot limit" };
  const g = Math.max(0, Number(going) || 0);
  const left = Math.max(0, capacity - g);
  const pct = Math.min(100, Math.round((g / capacity) * 100));
  if (left === 0) {
    return { pct: 100, tone: "full", label: waitlist ? `Full · ${waiting} waiting` : "Full" };
  }
  const tone = pct >= 80 || left <= 3 ? "filling" : "open";
  return { pct, tone, label: `${left} of ${capacity} spots left` };
}
