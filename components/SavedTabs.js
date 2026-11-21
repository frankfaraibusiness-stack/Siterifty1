"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import TypeIcon from "./composer/TypeIcon";
import { TYPES } from "@/lib/post-schema";
import { SAVED_TABS, savedHref } from "@/lib/saved-tabs";

// The tab bar on /saved: All, Posts, Reels, YouTube, Polls, Theories, Events, each with how many
// you bookmarked. Plain links (the tab is in the URL: /saved?tab=reel), so the back button works
// and the page is rendered on the server. Tabs with nothing in them stay (dimmed) so the bar
// never jumps around. On a phone the bar scrolls sideways and the open tab is brought into view.
const ICON = { post: "post", reel: "video", youtube: "video", poll: "poll", theory: "theory", event: "event" };

export default function SavedTabs({ active = "all", counts = {} }) {
  const bar = useRef(null);

  useEffect(() => {
    const box = bar.current;
    if (!box || box.scrollWidth <= box.clientWidth + 4) return;
    const el = box.querySelector('[aria-current="page"]');
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2 });
  }, [active]);

  return (
    <nav className="svt" aria-label="Saved posts by type" ref={bar}>
      {SAVED_TABS.map((t) => {
        const n = counts[t.id] || 0;
        const on = active === t.id;
        const info = TYPES[ICON[t.id]];
        return (
          <Link
            key={t.id}
            href={savedHref(t.id)}
            className={`svt-tab${on ? " on" : ""}${n === 0 && !on ? " zero" : ""}`}
            style={info ? { "--a": info.a, "--b": info.b } : undefined}
            aria-current={on ? "page" : undefined}
            prefetch={false}
            scroll={false}
          >
            {ICON[t.id] && <TypeIcon type={ICON[t.id]} size={15} />}
            <span>{t.label}</span>
            <em aria-label={`${n} saved`}>{n}</em>
          </Link>
        );
      })}
    </nav>
  );
}
