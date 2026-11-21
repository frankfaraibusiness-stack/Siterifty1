"use client";

import { useEffect } from "react";

// Renders nothing. Mounted on /search when a search found something: adds +1
// to that keyword's search rank (lib/search-rank.js). Once per keyword per
// half hour per tab, so refreshing or flipping tabs does not count twice.
export default function SearchTracker({ q }) {
  useEffect(() => {
    const text = String(q || "").trim();
    if (!text) return;
    const key = `gfb:sr:${text.toLowerCase()}`;
    try {
      const last = Number(window.sessionStorage.getItem(key)) || 0;
      if (Date.now() - last < 30 * 60_000) return;
      window.sessionStorage.setItem(key, String(Date.now()));
    } catch {
      // Storage blocked: the server still stops repeats.
    }
    fetch("/api/search/rank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: text }),
      keepalive: true,
    }).catch(() => {});
  }, [q]);
  return null;
}
