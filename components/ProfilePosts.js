"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PostCard from "./PostCard";
import { GridIcon, ImageIcon, HeartIcon, CommentIcon, XIcon } from "./icons";
import { formatCount } from "@/lib/format-count";

const PAGE = 12;
const SORTS = [
  ["latest", "Latest"],
  ["popular", "Popular"],
  ["oldest", "Oldest"],
];

function thumbStyle(post) {
  const m = post.media;
  if (m && (m.type === "images" || (m.type === "video" && (m.kind === "youtube" || m.hasPoster)))) {
    const src = m.kind === "youtube" ? `https://i.ytimg.com/vi/${m.ytId}/hqdefault.jpg` : `/media/${post.id}/0`;
    return { backgroundImage: `url(${src})`, backgroundSize: "cover", backgroundPosition: "center" };
  }
  const tile = post.media?.tiles?.[0];
  const a = tile?.a || post.avatarA;
  const b = tile?.b || post.avatarB;
  return { background: `linear-gradient(135deg, ${a}, ${b})` };
}

export default function ProfilePosts({ posts, isOwner }) {
  const [tab, setTab] = useState("posts");
  const [sort, setSort] = useState("latest");
  const [visible, setVisible] = useState(PAGE);
  const [open, setOpen] = useState(null);
  const sentinel = useRef(null);

  const list = useMemo(() => {
    const base = tab === "media" ? posts.filter((p) => p.media) : posts;
    const copy = [...base];
    if (sort === "popular") {
      copy.sort((a, b) => b.likesCount - a.likesCount || b.createdAtMs - a.createdAtMs);
    } else if (sort === "oldest") {
      copy.sort((a, b) => a.createdAtMs - b.createdAtMs);
    } else {
      copy.sort(
        (a, b) =>
          Number(b.settings?.pinned) - Number(a.settings?.pinned) ||
          b.createdAtMs - a.createdAtMs
      );
    }
    return copy;
  }, [posts, tab, sort]);

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

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") setOpen(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function changeTab(next) {
    setTab(next);
    setVisible(PAGE);
  }
  function changeSort(next) {
    setSort(next);
    setVisible(PAGE);
  }

  const shown = list.slice(0, visible);

  return (
    <section className="pf-posts">
      <div className="pf-tabs">
        <div className="pf-tab-group">
          <button
            className={`pf-tab${tab === "posts" ? " active" : ""}`}
            onClick={() => changeTab("posts")}
          >
            <span className="pf-ico">
              <GridIcon />
            </span>
            Posts
          </button>
          <button
            className={`pf-tab${tab === "media" ? " active" : ""}`}
            onClick={() => changeTab("media")}
          >
            <span className="pf-ico">
              <ImageIcon />
            </span>
            Media
          </button>
        </div>

        <div className="pf-chips">
          {SORTS.map(([id, label]) => (
            <button
              key={id}
              className={`pf-chip${sort === id ? " active" : ""}`}
              onClick={() => changeSort(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="pf-empty">
          <h2 className="pf-empty-title">
            {tab === "media"
              ? "No media yet"
              : isOwner
              ? "You haven't posted yet"
              : "Nothing here yet"}
          </h2>
          <p className="pf-empty-sub">
            {isOwner
              ? "Your posts will show up here as a scrollable gallery."
              : "When this user posts, it will show up here."}
          </p>
        </div>
      ) : (
        <>
          <div className="pf-grid">
            {shown.map((post) => {
              const count =
                post.media?.type === "grid"
                  ? post.media.tiles.length
                  : post.media?.type === "images"
                  ? post.media.count
                  : 1;
              return (
                <article className="pf-card" key={post.id}>
                  <button
                    className="pf-card-open"
                    onClick={() => setOpen(post)}
                    aria-label="Open post"
                  />
                  <div className="pf-thumb" style={thumbStyle(post)}>
                    {!post.media && <p className="pf-thumb-text">{post.title || post.text}</p>}
                    {post.media?.type === "video" && <span className="pf-badge">Video</span>}
                    {count > 1 && <span className="pf-badge">{count} photos</span>}
                    {post.tag && <span className="pf-thumb-tag">{post.tag}</span>}
                  </div>
                  <div className="pf-card-body">
                    <h3 className="pf-card-title">{post.text || "Untitled post"}</h3>
                    <div className="pf-card-meta">
                      <span className="pf-ico">
                        <HeartIcon />
                      </span>
                      {formatCount(post.likesCount)}
                      <span className="pf-ico">
                        <CommentIcon />
                      </span>
                      {formatCount(post.comments)}
                      <span className="pf-dot">&middot;</span>
                      {post.timeAgo}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
          {visible < list.length && <div ref={sentinel} className="pf-sentinel" />}
        </>
      )}

      {open && (
        <div
          className="pf-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(null);
          }}
        >
          <div className="pf-viewer">
            <button
              className="pf-icon-btn pf-viewer-close"
              onClick={() => setOpen(null)}
              aria-label="Close"
            >
              <span className="pf-ico">
                <XIcon />
              </span>
            </button>
            <PostCard post={open} />
          </div>
        </div>
      )}
    </section>
  );
}
