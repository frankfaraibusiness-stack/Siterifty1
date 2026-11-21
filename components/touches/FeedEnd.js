"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Discover from "../Discover";

// The last thing under a feed: "You're all caught up", a way back to the top, a
// refresh that re-reads the feed from the server, a row of shortcuts to the
// shops (Perks, Gifts, Advertise) and the small-print links.
export default function FeedEnd({ count = 0 }) {
  const router = useRouter();
  const [spin, setSpin] = useState(false);

  function refresh() {
    setSpin(true);
    router.refresh();
    setTimeout(() => setSpin(false), 900);
  }

  return (
    <div className="fe">
      <span className="fe-check" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m5.5 12.5 4.2 4.2 8.8-9.4" />
        </svg>
      </span>
      <h2 className="fe-title">You’re all caught up</h2>
      <p className="fe-sub">
        That’s every post for now{count ? ` (${count} shown)` : ""}. Go stir something up, then check back.
      </p>
      <div className="fe-actions">
        <button type="button" className="fe-btn" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 14 6-6 6 6" />
          </svg>
          Back to top
        </button>
        <button type="button" className={`fe-btn${spin ? " spin" : ""}`} onClick={refresh}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M20 12a8 8 0 1 1-2.6-5.9M20 4v5h-5" />
          </svg>
          Refresh
        </button>
      </div>
      <Discover spot="feedEnd" variant="chips" title="While you’re here" />
      <nav className="fe-links" aria-label="About GTAFanbase">
        <Link href="/about">About</Link>
        <Link href="/guidelines">Guidelines</Link>
        <Link href="/privacy">Privacy</Link>
        <Link href="/terms">Terms</Link>
        <Link href="/help">Help</Link>
        <Link href="/contact">Contact</Link>
      </nav>
    </div>
  );
}
