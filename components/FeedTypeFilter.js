"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import TypeIcon from "./composer/TypeIcon";
import { TYPES } from "@/lib/post-schema";
import { FEED_TYPES, feedHref } from "@/lib/feed-types";

// "All · Posts · Videos · Polls · Theories · Events": a row of chips that filters a feed to one
// post format. Plain links, so the choice lives in the URL (shareable, back button works) and
// the page is rendered on the server. `base` is the page ("/" or "/saved"); `feed="following"`
// keeps the Following tab while filtering. On a phone the row scrolls sideways, and the
// chosen chip is brought into view so it is never hidden off the edge.
export default function FeedTypeFilter({ active = "all", base = "/", feed = null, label = "Filter by type" }) {
  const row = useRef(null);

  useEffect(() => {
    const box = row.current;
    if (!box || box.scrollWidth <= box.clientWidth + 4) return;
    const el = box.querySelector('[aria-current="true"]');
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2 });
  }, [active]);

  return (
    <nav className="ft" aria-label={label} ref={row}>
      {FEED_TYPES.map((t) => {
        const info = TYPES[t.id];
        const on = active === t.id;
        return (
          <Link
            key={t.id}
            href={feedHref({ base, feed, type: t.id })}
            className={`ft-chip${on ? " on" : ""}`}
            style={info ? { "--a": info.a, "--b": info.b } : undefined}
            aria-current={on ? "true" : undefined}
            prefetch={false}
            scroll={false}
          >
            {info && <TypeIcon type={t.id} size={15} />}
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
