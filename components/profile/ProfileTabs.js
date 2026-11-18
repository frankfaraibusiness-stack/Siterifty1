"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import TypeIcon from "../composer/TypeIcon";
import AboutPanel from "./AboutPanel";
import { TILES } from "./Tiles";
import { ABOUT_TAB, CONTENT_TABS, typeOf } from "./tabs";
import { TYPES } from "@/lib/post-schema";

const PAGE = 12;
const SORTS = [
  ["latest", "Latest"],
  ["popular", "Popular"],
  ["oldest", "Oldest"],
];
const EVENT_SORTS = [
  ["upcoming", "Upcoming"],
  ["past", "Past"],
];

// "Popular" means whatever people do with that kind of post.
function score(post) {
  if (post.poll && typeOf(post) === "poll") return post.poll.voters;
  if (post.event) return post.event.going;
  return post.likesCount;
}

function arrange(list, sort) {
  const copy = [...list];
  if (sort === "popular") return copy.sort((a, b) => score(b) - score(a) || b.createdAtMs - a.createdAtMs);
  if (sort === "oldest") return copy.sort((a, b) => a.createdAtMs - b.createdAtMs);
  if (sort === "upcoming") {
    return copy.filter((p) => p.event.phase !== "ended").sort((a, b) => a.event.startsAtMs - b.event.startsAtMs);
  }
  if (sort === "past") {
    return copy.filter((p) => p.event.phase === "ended").sort((a, b) => b.event.startsAtMs - a.event.startsAtMs);
  }
  return copy.sort((a, b) => Number(b.settings.pinned) - Number(a.settings.pinned) || b.createdAtMs - a.createdAtMs);
}

const GRID = { post: "photos", video: "videos", poll: "cards", theory: "cards", event: "events" };

export default function ProfileTabs({ tab, onTab, posts, stats, insights, profile, isOwner, onEdit }) {
  const grouped = useMemo(() => {
    const out = { post: [], video: [], poll: [], theory: [], event: [] };
    for (const p of posts) out[typeOf(p)].push(p);
    return out;
  }, [posts]);

  const [sorts, setSorts] = useState(() => ({
    post: "latest",
    video: "latest",
    poll: "latest",
    theory: "latest",
    // Open on what's coming up, unless there is nothing coming up.
    event: grouped.event.some((p) => p.event.phase !== "ended") || !grouped.event.length ? "upcoming" : "past",
  }));
  const [visible, setVisible] = useState(PAGE);
  const sentinel = useRef(null);

  const isAbout = tab === ABOUT_TAB;
  const sort = sorts[tab] || "latest";
  const list = useMemo(() => (isAbout ? [] : arrange(grouped[tab] || [], sort)), [grouped, tab, sort, isAbout]);
  const sortOptions = tab === "event" ? EVENT_SORTS : SORTS;

  // Reveal more cards as the user scrolls (YouTube-style infinite grid).
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible((v) => v + PAGE);
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [list.length, visible]);

  // On a phone the tab bar scrolls sideways: keep the chosen tab in view
  // (About can be off-screen when the bio opens it). Not on first paint.
  const painted = useRef(false);
  useEffect(() => {
    if (!painted.current) {
      painted.current = true;
      return;
    }
    const el = document.getElementById(`pf-tab-${tab}`);
    const box = el?.parentElement;
    if (!el || !box) return;
    box.scrollTo({ left: el.offsetLeft - box.offsetLeft - (box.clientWidth - el.offsetWidth) / 2, behavior: "smooth" });
  }, [tab]);

  function changeTab(next) {
    setVisible(PAGE);
    onTab(next);
  }
  function changeSort(next) {
    setVisible(PAGE);
    setSorts((s) => ({ ...s, [tab]: next }));
  }

  // Arrow keys move between tabs, as people expect from a tab bar.
  function onKeyDown(e) {
    const ids = [...CONTENT_TABS.map((t) => t.id), ABOUT_TAB];
    const at = ids.indexOf(tab);
    let next = null;
    if (e.key === "ArrowRight") next = ids[(at + 1) % ids.length];
    else if (e.key === "ArrowLeft") next = ids[(at - 1 + ids.length) % ids.length];
    else if (e.key === "Home") next = ids[0];
    else if (e.key === "End") next = ids[ids.length - 1];
    if (!next) return;
    e.preventDefault();
    changeTab(next);
    document.getElementById(`pf-tab-${next}`)?.focus();
  }

  const Tile = TILES[tab];
  const shown = list.slice(0, visible);
  const meta = CONTENT_TABS.find((t) => t.id === tab);
  const noun = meta ? meta.label.toLowerCase() : "";

  return (
    <section className="pf-posts">
      <div className="pf-tabs" id="pf-tabs">
        <div className="pf-tab-group" role="tablist" aria-label="Profile sections" onKeyDown={onKeyDown}>
          {CONTENT_TABS.map((t) => (
            <button
              key={t.id}
              id={`pf-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              aria-controls="pf-panel"
              tabIndex={tab === t.id ? 0 : -1}
              className={`pf-tab${tab === t.id ? " active" : ""}`}
              style={{ "--a": TYPES[t.id].a, "--b": TYPES[t.id].b }}
              onClick={() => changeTab(t.id)}
            >
              <span className="pf-ico"><TypeIcon type={t.id} size={16} /></span>
              {t.label}
              <span className="pf-tab-n">{grouped[t.id].length}</span>
            </button>
          ))}
          <button
            id={`pf-tab-${ABOUT_TAB}`}
            type="button"
            role="tab"
            aria-selected={isAbout}
            aria-controls="pf-panel"
            tabIndex={isAbout ? 0 : -1}
            className={`pf-tab pf-tab-about${isAbout ? " active" : ""}`}
            onClick={() => changeTab(ABOUT_TAB)}
          >
            About
          </button>
        </div>

        {!isAbout && (grouped[tab].length > 1 || tab === "event") && (
          <div className="pf-chips">
            {sortOptions.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`pf-chip${sort === id ? " active" : ""}`}
                aria-pressed={sort === id}
                onClick={() => changeSort(id)}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div id="pf-panel" role="tabpanel" aria-labelledby={`pf-tab-${tab}`}>
        {isAbout ? (
          <AboutPanel profile={profile} stats={stats} insights={insights} isOwner={isOwner} onEdit={onEdit} />
        ) : list.length === 0 ? (
          <div className="pf-empty">
            <h2 className="pf-empty-title">
              {tab === "event" && grouped.event.length > 0
                ? sort === "upcoming"
                  ? "No upcoming events"
                  : "No past events"
                : meta.empty}
            </h2>
            <p className="pf-empty-sub">
              {isOwner
                ? `Your ${noun} will show up here.`
                : "Nothing here yet."}
            </p>
          </div>
        ) : (
          <>
            <div className={`pf-grid pf-grid--${GRID[tab]}`}>
              {shown.map((post) => (
                <Tile key={post.id} post={post} />
              ))}
            </div>
            {visible < list.length && <div ref={sentinel} className="pf-sentinel" />}
          </>
        )}
      </div>
    </section>
  );
}
