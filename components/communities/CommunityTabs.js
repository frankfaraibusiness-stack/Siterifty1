"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

const calm = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// The tab bar of a community page. It is pinned under the site header while the
// page scrolls (see community-page.css), and:
//  - tapping the tab you are already on jumps to the top of the page;
//  - switching to another tab starts that tab right under the pinned bar,
//    instead of leaving you part-way down a page that has just changed.
export default function CommunityTabs({ slug, tabs, active }) {
  const spot = useRef(null); // sits where the bar would be if it were not pinned
  const bar = useRef(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const s = spot.current;
    const b = bar.current;
    if (!s || !b) return;
    const pinnedAt = parseFloat(getComputedStyle(b).top) || 0;
    const natural = s.getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > natural - pinnedAt) window.scrollTo({ top: Math.max(0, natural - pinnedAt), behavior: "auto" });
  }, [active]);

  function onClick(e, id) {
    if (id !== active) return;
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: calm() ? "auto" : "smooth" });
  }

  return (
    <>
      <div ref={spot} aria-hidden="true" />
      <div className="gc-tabsbar" ref={bar}>
        <nav className="gc-tabs" aria-label="Community sections">
          {tabs.map(([id, label, narrow]) => (
            <Link
              key={id}
              href={id === "feed" ? `/c/${slug}` : `/c/${slug}?tab=${id}`}
              scroll={false}
              className={`${active === id ? "on" : ""}${narrow ? " narrow" : ""}`}
              aria-current={active === id ? "page" : undefined}
              onClick={(e) => onClick(e, id)}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  );
}
