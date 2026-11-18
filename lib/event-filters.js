// Filtering and sorting for the Events page. Pure functions (no Firestore, no
// React), so the server page and any future client view share one set of rules.

import { eventPhase } from "@/lib/event-rules";

const DAY = 86_400_000;

// [id, label] in the order the tabs are shown.
export const EVENT_WHEN = [
  ["upcoming", "Upcoming"],
  ["live", "Live now"],
  ["week", "This week"],
  ["going", "I’m going"],
  ["hosting", "Hosting"],
  ["past", "Past"],
];

export const isWhen = (v) => EVENT_WHEN.some(([id]) => id === v);

function haystack(p) {
  const e = p.event;
  return [p.title, p.text, p.user, e.category, e.venue, e.address, e.spot, ...(p.tags || [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesWhen(p, phase, when, now) {
  const e = p.event;
  switch (when) {
    case "live":
      return phase === "live";
    case "week":
      return phase !== "ended" && e.startsAtMs < now + 7 * DAY;
    case "going":
      return phase !== "ended" && e.mine?.status === "going";
    case "hosting":
      return !!p.isOwner;
    case "past":
      return phase === "ended";
    default:
      return phase !== "ended";
  }
}

// Returns the matching posts, soonest first (past events: most recent first).
export function filterEvents(posts, { when = "upcoming", mode = "", category = "", q = "", now = Date.now() } = {}) {
  const term = String(q || "").trim().toLowerCase();
  const rows = [];
  for (const p of posts) {
    if (!p.event) continue;
    const phase = eventPhase(p.event.startsAtMs, p.event.endsAtMs, now, p.event.closedAtMs ?? null);
    if (!matchesWhen(p, phase, when, now)) continue;
    if (mode && p.event.mode !== mode) continue;
    if (category && p.event.category !== category) continue;
    if (term && !term.split(/\s+/).every((w) => haystack(p).includes(w))) continue;
    rows.push({ p, phase });
  }
  const start = (r) => r.p.event.startsAtMs;
  rows.sort((a, b) => {
    // Hosting mixes past and future: what's still ahead comes first.
    if (when === "hosting" && (a.phase === "ended") !== (b.phase === "ended")) return a.phase === "ended" ? 1 : -1;
    const desc = when === "past" || (when === "hosting" && a.phase === "ended");
    return desc ? start(b) - start(a) : start(a) - start(b);
  });
  return rows.map((r) => r.p);
}

// How many events each tab would show with the other filters applied.
export function countByWhen(posts, filters = {}) {
  const out = {};
  for (const [id] of EVENT_WHEN) out[id] = filterEvents(posts, { ...filters, when: id }).length;
  return out;
}
