"use client";

import { useSyncExternalStore } from "react";
import { readSpoilerMode } from "@/lib/spoilers";

// The viewer's spoiler choice (cover / show / hide) as set on <html> by the
// layout, kept live if they change it in Settings. Server renders and the first
// hydration pass use "cover", so nothing spoilery ever flashes.
function subscribe(onChange) {
  const watcher = new MutationObserver(onChange);
  watcher.observe(document.documentElement, { attributes: true, attributeFilter: ["data-spoilers"] });
  return () => watcher.disconnect();
}

export function useSpoilerMode() {
  return useSyncExternalStore(
    subscribe,
    () => readSpoilerMode(document.documentElement.dataset.spoilers),
    () => "cover"
  );
}
