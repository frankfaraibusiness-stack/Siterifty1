"use client";

// Browser side of post analytics. It can't invent anything: it only hands back the opaque, signed
// tokens the server attached to the posts it served (see lib/track-token.js). The server re-checks
// each signature and decides what is counted, where it came from and what it teaches.

const queue = new Set();
const sent = new Set();
let timer = null;
let wired = false;

function post(payload) {
  const body = JSON.stringify(payload);
  try {
    if (navigator.sendBeacon?.("/api/posts/track", body)) return;
  } catch {}
  fetch("/api/posts/track", { method: "POST", body, keepalive: true }).catch(() => {});
}

function flush() {
  clearTimeout(timer);
  timer = null;
  while (queue.size) {
    const batch = [...queue].slice(0, 40);
    batch.forEach((t) => queue.delete(t));
    post({ seen: batch });
  }
}

function wire() {
  if (wired || typeof window === "undefined") return;
  wired = true;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flush(); });
  window.addEventListener("pagehide", flush);
}

// This post's token was on screen. Batched: many posts scrolled past become one request.
export function reportSeen(token) {
  if (!token || sent.has(token)) return;
  sent.add(token);
  queue.add(token);
  wire();
  if (!timer) timer = setTimeout(flush, 4000);
}

// The member opened the post. Sent at once (the page is about to change).
export function reportClick(token) {
  if (!token) return;
  post({ click: token });
}
