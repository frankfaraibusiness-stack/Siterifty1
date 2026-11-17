// Vibe's whole library in one place: every question, its answer, and the
// lookups the chat needs. Plain data and functions (safe on server and client).
//
// To add a topic: write a new file next to these (same shape as start.js),
// import it below and add it to CATEGORIES and ALL. Answers that point at an
// id that doesn't exist yet are quietly left out of "Ask next" and the buttons,
// so the library can grow one topic at a time without dead ends.

import start from "./start";
import gta6 from "./gta6";
import series from "./series";

// A "district" is a topic. The order here is the order of the topic chips.
export const CATEGORIES = [
  { id: "start", label: "Start here" },
  { id: "gta6", label: "GTA 6" },
  { id: "series", label: "GTA series" },
];

export const ENTRIES = [...start, ...gta6, ...series];
const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const getEntry = (id) => BY_ID.get(id) || null;
export const categoryLabel = (id) => CATEGORIES.find((c) => c.id === id)?.label || id;

export function entriesIn(cat) {
  return cat ? ENTRIES.filter((e) => e.cat === cat) : ENTRIES;
}

// The "Ask next" chips: only questions that exist, at most three.
export function nextFor(entry) {
  return (entry.next || []).map(getEntry).filter(Boolean).slice(0, 3);
}

// The answer as blocks. Buttons that ask a question we don't have are dropped.
export function answerFor(id, ctx = { now: Date.now() }) {
  const entry = getEntry(id);
  if (!entry) return [];
  let blocks;
  try {
    blocks = entry.a(ctx);
  } catch {
    return [{ t: "p", x: "Something went wrong while I was looking that up. Try another question." }];
  }
  return blocks
    .map((b) => (b.t === "actions" ? { ...b, items: b.items.filter((it) => !it.ask || BY_ID.has(it.ask)) } : b))
    .filter((b) => b.t !== "actions" || b.items.length);
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// Typing a few words finds questions by their wording and keywords.
export function search(query, limit = 12) {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(" ").filter((w) => w.length > 1 || /\d/.test(w));
  const scored = [];
  for (const e of ENTRIES) {
    const text = norm(e.q);
    const kws = (e.kw || []).map(norm);
    let score = 0;
    if (text.includes(q)) score += 8;
    if (kws.some((k) => k === q)) score += 6;
    for (const w of words) {
      if (text.split(" ").includes(w)) score += 3;
      else if (text.includes(w)) score += 1;
      if (kws.some((k) => k === w)) score += 3;
      else if (kws.some((k) => k.includes(w))) score += 1;
    }
    if (score > 0) scored.push([score, e]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, e]) => e);
}
