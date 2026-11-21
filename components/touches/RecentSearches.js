"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { RECENT_EVENT, clearRecent, parseRecent, readRecentRaw, removeRecent } from "@/lib/recent-searches";

// Chips for what this device searched before, on the empty /search page. The
// history lives in localStorage (lib/recent-searches.js) and never leaves the device.
function subscribe(fn) {
  window.addEventListener(RECENT_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(RECENT_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
}

export default function RecentSearches() {
  const raw = useSyncExternalStore(subscribe, readRecentRaw, () => "[]");
  const list = useMemo(() => parseRecent(raw), [raw]);
  if (!list.length) return null;
  return (
    <section className="rs" aria-labelledby="rs-title">
      <header className="rs-head">
        <h2 id="rs-title">Recent searches</h2>
        <button type="button" className="rs-clear" onClick={clearRecent}>
          Clear all
        </button>
      </header>
      <ul className="rs-list">
        {list.map((q) => (
          <li key={q} className="rs-item">
            <Link href={`/search?q=${encodeURIComponent(q)}`} className="rs-chip" prefetch={false}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7.5V12l3 2" />
              </svg>
              {q}
            </Link>
            <button type="button" className="rs-x" onClick={() => removeRecent(q)} aria-label={`Remove ${q} from recent searches`}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 7l10 10M17 7 7 17" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
