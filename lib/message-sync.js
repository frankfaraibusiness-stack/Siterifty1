// Browser-side background check-in for messages. One small request every few
// seconds (see app/api/messages/summary) that:
//   - tells the site how many unread messages / friend requests there are,
//   - lets the server mark waiting messages "delivered",
//   - records that you're online,
//   - reports `rev`, which changes whenever your chat list changes.
// Shared by the nav badge (MainNav) and the Messages page.
import { api } from "@/components/messages/api";

let state = { unread: 0, requests: 0, rev: 0, ready: false };
const SERVER_STATE = state;
const subs = new Set();
let started = false;
let stopped = false;
let fast = false;
let timer = null;
let lastPing = 0;
let inflight = false;

const emit = () => subs.forEach((fn) => fn());

export const getSnapshot = () => state;
export const getServerSnapshot = () => SERVER_STATE;
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

export async function pollNow() {
  if (stopped || inflight || typeof document === "undefined") return;
  inflight = true;
  try {
    const ping = Date.now() - lastPing > 50_000;
    const d = await api(`/api/messages/summary${ping ? "?ping=1" : ""}`);
    if (ping) lastPing = Date.now();
    state = { unread: d.unread, requests: d.requests, rev: d.rev, ready: true };
    emit();
  } catch (err) {
    if (err.status === 401) stopped = true; // signed out: stop asking
  } finally {
    inflight = false;
  }
}

function schedule() {
  clearTimeout(timer);
  if (stopped) return;
  timer = setTimeout(async () => {
    if (!document.hidden) await pollNow();
    schedule();
  }, fast ? 5_000 : 25_000);
}

// Called once from <MessageSync /> in the root layout.
export function startSync() {
  if (started) return;
  started = true;
  pollNow();
  schedule();
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) pollNow();
  });
}

// Poll faster while the Messages page is open.
export function setFast(on) {
  fast = on;
  if (started) {
    schedule();
    if (on) pollNow();
  }
}

// Optimistic local tweak (e.g. after reading a chat) until the next poll.
export function patchSync(patch) {
  state = { ...state, ...patch };
  emit();
}
