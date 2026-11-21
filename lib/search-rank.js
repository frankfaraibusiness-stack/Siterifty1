import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { normalizeKeyword } from "@/lib/search-keyword";

// SEARCH RANK ("sr")
// ------------------------------------------------------------------------
// Every search that finds something adds +1 to its keyword. The counts for a
// whole day live in ONE document, never one document per search:
//
//   searchRank/{YYYY-MM-DD}  ->  { terms: { "gta 6 trailer": 41, "vice city": 17, ... },
//                                  day, updatedAt, expireAt }
//
// 10,000 searches in a day is still 1 document (and a few hundred distinct keys).
//
// Writes: counts are collected in memory and written together every few
// seconds, so a burst of 500 searches is a single write, not 500.
// Reads:  "hot" is built from today's + yesterday's document (2 reads) and kept
// in memory for a minute, so no matter how many people open the search screen
// it costs about 2 reads per minute per server instance.
//
// Trade-off: if a server instance is shut down in the few seconds before a
// flush, those few seconds of counts are lost. That is fine for a ranking.
//
// Tip: turn on a Firestore TTL policy for the `expireAt` field of the
// searchRank collection and old days delete themselves.

const COLLECTION = "searchRank";
const FLUSH_MS = 5_000; // how long counts wait in memory before one combined write
const FLUSH_AT = 150; // ...or this many different keywords, whichever comes first
const HOT_CACHE_MS = 60_000;
const HOT_MAX = 300; // sent to the phone, which does the "as you type" matching itself
const MIN_SCORE = 2; // a keyword needs at least this much before it can be "hot"
const KEEP_DAYS = 14;

const DAY_MS = 86_400_000;
const dayId = (offset = 0) => new Date(Date.now() - offset * DAY_MS).toISOString().slice(0, 10);

// ---------------------------------------------------------------- counting
const buffer = new Map(); // keyword -> searches waiting to be written
let timer = null;

async function flush() {
  clearTimeout(timer);
  timer = null;
  if (!buffer.size) return;
  const batch = [...buffer];
  buffer.clear();

  const terms = {};
  for (const [key, n] of batch) terms[key] = FieldValue.increment(n);
  const day = dayId();
  try {
    // set + merge creates the day on its first search and adds to it after that.
    // Keywords inside a nested object are used exactly as written (dots are fine).
    await getAdminDb()
      .collection(COLLECTION)
      .doc(day)
      .set(
        {
          day,
          terms,
          updatedAt: Timestamp.now(),
          expireAt: Timestamp.fromMillis(Date.parse(day) + (KEEP_DAYS + 1) * DAY_MS),
        },
        { merge: true }
      );
  } catch (err) {
    console.error("[search-rank] flush failed", err?.message || err);
  }
}

function queue(key) {
  buffer.set(key, (buffer.get(key) || 0) + 1);
  if (buffer.size >= FLUSH_AT) {
    void flush();
  } else if (!timer) {
    timer = setTimeout(flush, FLUSH_MS);
    timer.unref?.();
  }
}

// One person repeating a search (or a script hammering one keyword) must not
// move the ranking: the same keyword from the same address counts once per
// half hour, and one address can add at most 30 searches a minute.
const SAME_MS = 30 * 60_000;
const seen = new Map(); // `${ip}|${keyword}` -> last counted at
const rate = new Map(); // ip -> { at: window start, n }

function sweep(now) {
  if (seen.size < 5_000 && rate.size < 5_000) return;
  for (const [k, at] of seen) if (now - at > SAME_MS) seen.delete(k);
  for (const [k, v] of rate) if (now - v.at > 60_000) rate.delete(k);
}

// Returns true when the search was counted.
export function recordSearch(raw, ip = "anon") {
  const key = normalizeKeyword(raw);
  if (!key) return false;

  const now = Date.now();
  sweep(now);

  const r = rate.get(ip);
  if (!r || now - r.at > 60_000) rate.set(ip, { at: now, n: 1 });
  else if (++r.n > 30) return false;

  const id = `${ip}|${key}`;
  if (now - (seen.get(id) || 0) < SAME_MS) return false;
  seen.set(id, now);

  queue(key);
  return true;
}

// ----------------------------------------------------------------- reading
// Words people genuinely look up in a GTA 6 community. Only used to fill the
// list while the site has too few real searches to rank (a brand new site).
const SEEDS = [
  "gta 6 release date",
  "gta 6 trailer",
  "gta 6 map",
  "vice city",
  "leonida",
  "lucia",
  "jason",
  "gta 6 theories",
  "gta 6 online",
  "gta 6 leaks",
];
const SEED_MIN = 8;

let hot = { at: 0, terms: [] };
let inflight = null;

async function load() {
  try {
    const db = getAdminDb();
    const col = db.collection(COLLECTION);
    const [todaySnap, yesterdaySnap] = await db.getAll(col.doc(dayId(0)), col.doc(dayId(1)));
    const today = { ...(todaySnap.data()?.terms || {}) };
    const yesterday = yesterdaySnap.data()?.terms || {};
    // Counts this instance has not written yet still count.
    for (const [k, n] of buffer) today[k] = (Number(today[k]) || 0) + n;

    const rows = [];
    const keys = new Set([...Object.keys(today), ...Object.keys(yesterday)]);
    for (const q of keys) {
      const t = Number(today[q]) || 0;
      const y = Number(yesterday[q]) || 0;
      // Today counts in full, yesterday counts half: fresh topics climb, old ones fade.
      const score = t + y * 0.5;
      if (score >= MIN_SCORE) rows.push({ q, score, up: t >= 3 && t >= y * 2 });
    }
    rows.sort((a, b) => b.score - a.score || a.q.localeCompare(b.q));
    const terms = rows.slice(0, HOT_MAX).map(({ q, up }) => ({ q, up }));

    if (terms.length < SEED_MIN) {
      const have = new Set(terms.map((t) => t.q));
      for (const q of SEEDS) {
        if (terms.length >= SEED_MIN) break;
        if (!have.has(q)) terms.push({ q, up: false });
      }
    }
    hot = { at: Date.now(), terms };
  } catch (err) {
    console.error("[search-rank] load failed", err?.message || err);
    // Keep serving the last good list; try again shortly instead of every request.
    hot = { at: Date.now() - HOT_CACHE_MS + 10_000, terms: hot.terms.length ? hot.terms : SEEDS.map((q) => ({ q, up: false })) };
  }
  return hot.terms;
}

// The ranked keywords, most searched first: [{ q, up }]
export async function getHotTerms() {
  if (Date.now() - hot.at < HOT_CACHE_MS && hot.terms.length) return hot.terms;
  if (!inflight) inflight = load().finally(() => (inflight = null));
  return inflight;
}
