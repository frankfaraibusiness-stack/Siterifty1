// Event RSVP rules and the shape an event takes on its way to the browser.
// Pure functions only (no Firestore, no React), so the API route, the feed
// mapper and the composer preview all share exactly the same logic.
//
// Stored on the post doc: event.rsvps = { [uid]: { s, p, u, t } }
//   s: "going" | "wait" | "pending"   p: 1 when bringing a +1
//   u: username                        t: when they first RSVPed (ms)
// Counts are always derived from this map, so they can never drift.

import { EVENT_JOIN, eventLocationLabel } from "@/lib/post-schema";

export const EVENT_DEFAULT_HOURS = 4; // how long an event with no end time stays "live"
export const MAX_RSVP_ENTRIES = 2500; // keeps the post doc well under Firestore's 1 MiB cap
const LIST_MAX = 60;

const ms = (t) => (typeof t?.toMillis === "function" ? t.toMillis() : typeof t === "number" ? t : null);

export function eventEndMs(startMs, endMs) {
  return endMs ?? startMs + EVENT_DEFAULT_HOURS * 3_600_000;
}

export function eventPhase(startMs, endMs, now = Date.now()) {
  if (now < startMs) return "upcoming";
  return now < eventEndMs(startMs, endMs) ? "live" : "ended";
}

// "Everyone" is open to any signed-in viewer. The other three depend on a
// friends / followers list that doesn't exist on the site yet, so this is the
// single place to plug it in: return true when `viewerUid` is allowed by
// `join` for the host `hostUid`. Until then only "everyone" events can be joined.
export function relationshipAllows(join, hostUid, viewerUid) {
  void join;
  void hostUid;
  void viewerUid;
  return false;
}

const JOIN_NOTES = {
  friends_followers: "Only the host’s friends and followers can join.",
  friends: "Only the host’s friends can join.",
  followers: "Only the host’s followers can join.",
};

export function joinCheck(ev, hostUid, viewerUid) {
  if (!viewerUid) return { ok: false, note: "Sign in to join." };
  if (viewerUid === hostUid) return { ok: false, note: "You’re hosting this event." };
  const join = EVENT_JOIN.some((j) => j.value === ev.join) ? ev.join : "everyone";
  if (join === "everyone" || relationshipAllows(join, hostUid, viewerUid)) return { ok: true, note: "" };
  return { ok: false, note: JOIN_NOTES[join] };
}

const heads = (r) => (r.p ? 2 : 1);

export function tally(rsvps = {}) {
  const t = { going: 0, people: 0, waitlist: 0, pending: 0 };
  for (const r of Object.values(rsvps)) {
    if (r.s === "going") {
      t.going += heads(r);
      t.people += 1;
    } else if (r.s === "wait") t.waitlist += 1;
    else if (r.s === "pending") t.pending += 1;
  }
  return t;
}

function without(rsvps, uid) {
  const { [uid]: _drop, ...rest } = rsvps;
  void _drop;
  return rest;
}

// The viewer joins (or changes their +1). Returns { entry } or { error }.
export function planJoin({ ev, rsvps = {}, uid, username, plusOne, now = Date.now() }) {
  const p = ev.plusOnes && plusOne ? 1 : 0;
  const existing = rsvps[uid];
  const cap = ev.capacity ?? null;
  const taken = tally(without(rsvps, uid)).going;
  const room = cap === null || taken + 1 + p <= cap;

  if (!existing && Object.keys(rsvps).length >= MAX_RSVP_ENTRIES) return { error: "ENTRIES" };

  let s;
  if (existing?.s === "going") {
    if (!room) return { error: "NO_ROOM_PLUS_ONE" };
    s = "going";
  } else if (existing) {
    s = existing.s; // pending or waitlisted: keep their place in line
  } else if (ev.approval) {
    s = "pending";
  } else if (room) {
    s = "going";
  } else if (ev.waitlist) {
    s = "wait";
  } else {
    return { error: "FULL" };
  }
  return { entry: { s, p, u: username, t: existing?.t ?? now } };
}

// The host approves a pending request.
export function planApprove({ ev, rsvps = {}, targetUid }) {
  const r = rsvps[targetUid];
  if (!r || r.s !== "pending") return { error: "GONE" };
  const cap = ev.capacity ?? null;
  const taken = tally(without(rsvps, targetUid)).going;
  if (cap === null || taken + heads(r) <= cap) return { entry: { ...r, s: "going" } };
  if (ev.waitlist) return { entry: { ...r, s: "wait" } };
  return { error: "NO_ROOM" };
}

// After someone leaves, waitlisted people move up in the order they asked.
// `rsvps` is the map as it stands after the leave. Returns [[uid, entry]].
export function promote(ev, rsvps = {}) {
  const cap = ev.capacity ?? null;
  if (cap === null) return [];
  let going = tally(rsvps).going;
  const moves = [];
  const waiting = Object.entries(rsvps)
    .filter(([, r]) => r.s === "wait")
    .sort((a, b) => (a[1].t ?? 0) - (b[1].t ?? 0));
  for (const [uid, r] of waiting) {
    if (going + heads(r) <= cap) {
      going += heads(r);
      moves.push([uid, { ...r, s: "going" }]);
    }
  }
  return moves;
}

// What the browser gets. Private details are decided here, on the server:
// hidden pins, guest names, and the host-only request list.
export function serializeEvent(data, { uid = null, isOwner = false, now = Date.now() } = {}) {
  const ev = data?.event;
  if (!ev) return null;
  const startsAtMs = ms(ev.startsAt);
  const endsAtMs = ms(ev.endsAt);
  const rsvps = ev.rsvps || {};
  const t = tally(rsvps);
  const mine = uid && rsvps[uid]
    ? { status: rsvps[uid].s === "wait" ? "waitlist" : rsvps[uid].s, plusOne: !!rsvps[uid].p }
    : null;
  const spotHidden = ev.mode === "irl" && !!ev.hideSpot && !isOwner && mine?.status !== "going";
  const check = joinCheck(ev, data.uid, uid);
  const byTime = (a, b) => (a[1].t ?? 0) - (b[1].t ?? 0);
  const entries = Object.entries(rsvps);
  const showNames = ev.showGuests !== false || isOwner;

  return {
    category: ev.category,
    mode: ev.mode,
    startsAtMs,
    endsAtMs,
    tz: ev.tz || "",
    venue: spotHidden ? "" : ev.venue || "",
    address: spotHidden ? "" : ev.address || "",
    pin: spotHidden ? null : ev.pin || null,
    spot: spotHidden ? "" : ev.spot || "",
    spotHidden,
    platforms: ev.platforms || [],
    link: ev.link || "",
    join: ev.join,
    privacy: ev.privacy,
    capacity: ev.capacity ?? null,
    waitlist: !!ev.waitlist,
    approval: !!ev.approval,
    plusOnes: !!ev.plusOnes,
    showGuests: ev.showGuests !== false,
    bring: ev.bring || "",
    rules: ev.rules || "",
    going: t.going,
    people: t.people,
    waitlistCount: t.waitlist,
    pendingCount: isOwner ? t.pending : 0,
    mine,
    guests: showNames
      ? entries
          .filter(([, r]) => r.s === "going")
          .sort(byTime)
          .slice(0, LIST_MAX)
          .map(([id, r]) => ({ ...(isOwner ? { uid: id } : {}), user: r.u, plusOne: !!r.p }))
      : [],
    pending: isOwner
      ? entries
          .filter(([, r]) => r.s === "pending")
          .sort(byTime)
          .slice(0, LIST_MAX)
          .map(([id, r]) => ({ uid: id, user: r.u, plusOne: !!r.p }))
      : [],
    waiting: isOwner
      ? entries
          .filter(([, r]) => r.s === "wait")
          .sort(byTime)
          .slice(0, LIST_MAX)
          .map(([id, r]) => ({ uid: id, user: r.u, plusOne: !!r.p }))
      : [],
    canJoin: check.ok,
    joinNote: check.ok ? "" : check.note,
    phase: eventPhase(startsAtMs, endsAtMs, now),
  };
}

// The same shape built from a composer draft, so the review step can show the
// real feed card before anything is saved.
export function previewEventFrom(d) {
  const ev = d.event;
  const startsAtMs = Date.parse(ev.startsAt) || Date.now() + 86_400_000;
  const endsAtMs = ev.endsAt ? Date.parse(ev.endsAt) || null : null;
  const cap = Number(ev.capacity);
  const capacity = Number.isInteger(cap) && cap >= 2 ? cap : null;
  return {
    category: ev.category,
    mode: ev.mode,
    startsAtMs,
    endsAtMs,
    tz: ev.tz,
    venue: ev.venue,
    address: ev.address,
    pin: ev.pin,
    spot: ev.spot,
    spotHidden: false,
    platforms: ev.platforms,
    link: ev.link,
    join: ev.join,
    privacy: ev.privacy || "public",
    capacity,
    waitlist: ev.waitlist && capacity !== null,
    approval: ev.approval,
    plusOnes: ev.plusOnes,
    showGuests: ev.showGuests,
    bring: ev.bring,
    rules: ev.rules,
    going: 0,
    people: 0,
    waitlistCount: 0,
    pendingCount: 0,
    mine: null,
    guests: [],
    pending: [],
    waiting: [],
    canJoin: true,
    joinNote: "",
    phase: "upcoming",
    location: eventLocationLabel(d, ev),
  };
}
