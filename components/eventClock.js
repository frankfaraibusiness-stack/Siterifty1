"use client";

import { useEffect, useState } from "react";
import { eventEndMs } from "@/lib/event-rules";

// The event clock shared by the event card and the group chat panel, so the
// two never disagree about whether an event has started or ended.

export const pad = (n) => String(n).padStart(2, "0");

// Ticks once a second when something changes within the hour, every 30s
// otherwise, and stops for good once the event is over. `now` stays null until
// the browser has mounted so server and client markup always match.
// `closedMs` is when the host ended the event early (event.closedAtMs).
export function useNow(startMs, endMs, closedMs = null) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    let timer;
    const end = eventEndMs(startMs, endMs, closedMs);
    const tick = () => {
      const n = Date.now();
      setNow(n);
      const ahead = [startMs, end].filter((t) => t > n);
      if (!ahead.length) return;
      timer = setTimeout(tick, Math.min(...ahead) - n < 3_600_000 ? 1000 : 30_000);
    };
    tick();
    return () => clearTimeout(timer);
  }, [startMs, endMs, closedMs]);
  return now;
}

export function split(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export function span(ms) {
  const { d, h, m } = split(ms);
  if (d) return `${d}d ${h}h`;
  if (h) return `${h}h ${m}m`;
  return `${Math.max(1, m)}m`;
}
