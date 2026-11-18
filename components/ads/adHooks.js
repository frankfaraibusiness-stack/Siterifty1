"use client";

import { useEffect, useRef } from "react";

// Shared by the ad slots and the ad views.

export function sendTrack(adId, source, event) {
  const body = JSON.stringify({ adId, source, event });
  try {
    if (navigator.sendBeacon?.("/api/ads/track", body)) return;
  } catch {}
  fetch("/api/ads/track", { method: "POST", body, keepalive: true }).catch(() => {});
}

// Fires `onView` once, after >= 50% (or half the screen, for very tall ads) has been visible for 1s.
export function useViewed(ref, onView, enabled) {
  const cb = useRef(onView);
  cb.current = onView;
  useEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof IntersectionObserver === "undefined") return undefined;
    let timer = null;
    let fired = false;
    const io = new IntersectionObserver(
      ([e]) => {
        const need = Math.min(e.boundingClientRect.height * 0.5, window.innerHeight * 0.5);
        if (e.isIntersecting && e.intersectionRect.height >= need - 1) {
          if (!timer && !fired) {
            timer = setTimeout(() => { fired = true; cb.current(); io.disconnect(); }, 1000);
          }
        } else if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    io.observe(el);
    return () => { clearTimeout(timer); io.disconnect(); };
  }, [ref, enabled]);
}

