"use client";

// Browser side of reel watch time. It only COUNTS, in memory, and sends rarely:
//   tick(id, seconds, duration)   called while a clip really plays (a few times a second, costs nothing)
//   leave(id)                     the viewer swiped away from the clip: that viewing is final
// A viewing becomes ONE entry { postId, seconds, duration, viewed } where `viewed` is true once 2 seconds
// have played (that is the +1 view). Entries wait a few seconds so several swipes go out as one request,
// and are flushed at once when the tab is hidden or closed. The server caps and verifies everything
// (lib/video-stats-data.js), so nothing here can add more than a real viewing could.
import { VIEW_AFTER_SECONDS } from "./video-stats.js";

const FLUSH_MS = 6000;
const MIN_SECONDS = 0.5; // shorter than this isn't worth a report

const live = new Map(); // id -> { seconds, duration, viewed }   (being watched right now)
const ready = []; // finished viewings waiting to be sent
let timer = null;
let wired = false;

function send(watch) {
  const body = JSON.stringify({ watch });
  try {
    if (navigator.sendBeacon?.("/api/videos/watch", body)) return;
  } catch {
    // fall through to fetch
  }
  fetch("/api/videos/watch", { method: "POST", body, keepalive: true }).catch(() => {});
}

export function flush() {
  clearTimeout(timer);
  timer = null;
  while (ready.length) send(ready.splice(0, 20));
}

function finish(id) {
  const e = live.get(id);
  if (!e) return;
  live.delete(id);
  if (e.seconds < MIN_SECONDS) return;
  ready.push({ postId: id, seconds: Math.round(e.seconds * 10) / 10, duration: Math.round(e.duration || 0), viewed: e.viewed });
  if (!timer) timer = setTimeout(flush, FLUSH_MS);
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  const out = () => {
    for (const id of [...live.keys()]) finish(id);
    flush();
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") out();
  });
  window.addEventListener("pagehide", out);
}

export function tick(id, seconds, duration) {
  if (!id || !(seconds > 0)) return false;
  wire();
  let e = live.get(id);
  if (!e) {
    e = { seconds: 0, duration: 0, viewed: false };
    live.set(id, e);
  }
  e.seconds += seconds;
  if (duration > 0) e.duration = duration;
  if (!e.viewed && e.seconds >= VIEW_AFTER_SECONDS) {
    e.viewed = true;
    return true; // the +1 view just happened
  }
  return false;
}

export function leave(id) {
  finish(id);
}
