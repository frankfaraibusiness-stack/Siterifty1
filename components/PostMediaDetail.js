"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { useBackClose } from "@/lib/use-back-close";
import FeedVideo from "./FeedVideo";
import { postImageUrl } from "@/lib/media-url";
import { ArrowLeftIcon } from "./icons";

const SWIPE = 50;

function isTyping(e) {
  return /input|textarea|select/i.test(e.target?.tagName || "") || e.target?.isContentEditable;
}

// Full-screen viewer for one post's photos: its own header (back, which photo,
// whose post), the photo, and a strip of thumbnails when there are several.
//
// It is drawn on <body> (a portal), not inside the post: inside the post, an
// ancestor can trap it below the sticky site header. The phone's Back button
// closes it instead of leaving the page (lib/use-back-close.js).
function Lightbox({ srcs, alts, index, onIndex, onClose, by }) {
  useScrollLock(true);
  const close = useBackClose(onClose);
  const touch = useRef(null);
  const root = useRef(null);
  const last = srcs.length - 1;

  const go = useCallback(
    (d) => onIndex((i) => Math.min(last, Math.max(0, i + d))),
    [last, onIndex]
  );

  useEffect(() => {
    const opener = document.activeElement;
    root.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      // Focus goes back to the photo that was tapped.
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [go, close]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="lb" ref={root} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Photo viewer">
      <header className="lb-top">
        <button type="button" className="lb-back" onClick={close} aria-label="Back to post">
          <ArrowLeftIcon />
        </button>
        <div className="lb-titles">
          <b>{srcs.length > 1 ? `Photo ${index + 1} of ${srcs.length}` : "Photo"}</b>
          {by && <small>by @{by}</small>}
        </div>
        <span className="lb-esc" aria-hidden="true">Esc</span>
      </header>

      <div
        className="lb-stage"
        onPointerDown={(e) => (touch.current = e.clientX)}
        onPointerUp={(e) => {
          const dx = e.clientX - (touch.current ?? e.clientX);
          touch.current = null;
          if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
          else if (e.target === e.currentTarget) close();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lb-img" src={srcs[index]} alt={alts?.[index] || ""} draggable={false} />
        {srcs.length > 1 && (
          <>
            <button type="button" className="lb-nav prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo">&lsaquo;</button>
            <button type="button" className="lb-nav next" onClick={() => go(1)} disabled={index === last} aria-label="Next photo">&rsaquo;</button>
          </>
        )}
      </div>

      {srcs.length > 1 && (
        <div className="lb-strip" role="tablist" aria-label="Photos in this post">
          {srcs.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              className={i === index ? "on" : ""}
              onClick={() => onIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}

function Gallery({ srcs, alts, by }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const start = useRef(null);
  const swiped = useRef(false);
  const last = srcs.length - 1;
  const many = srcs.length > 1;

  const go = useCallback((d) => setIndex((i) => Math.min(last, Math.max(0, i + d))), [last]);

  // Arrow keys flip photos on the page (the lightbox handles its own keys).
  useEffect(() => {
    if (!many || open) return undefined;
    const onKey = (e) => {
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [many, open, go]);

  return (
    <div className="pd-gallery">
      <div
        className="pd-stage pd-photo"
        style={{ "--src": `url("${srcs[index]}")` }}
        onPointerDown={(e) => {
          start.current = e.clientX;
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const dx = e.clientX - (start.current ?? e.clientX);
          start.current = null;
          if (many && Math.abs(dx) > SWIPE) {
            swiped.current = true;
            go(dx < 0 ? 1 : -1);
          }
        }}
      >
        <button
          type="button"
          className="pd-zoom"
          onClick={() => !swiped.current && setOpen(true)}
          aria-label="View photo full screen"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={srcs[index]} alt={alts?.[index] || ""} draggable={false} />
        </button>

        {many && (
          <>
            <span className="pd-count">{index + 1} / {srcs.length}</span>
            <button type="button" className="pd-nav prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo">&lsaquo;</button>
            <button type="button" className="pd-nav next" onClick={() => go(1)} disabled={index === last} aria-label="Next photo">&rsaquo;</button>
          </>
        )}
        <span className="pd-hint" aria-hidden="true">Tap to enlarge</span>
      </div>

      {many && (
        <div className="pd-thumbs" role="tablist" aria-label="Photos in this post">
          {srcs.map((src, i) => (
            <button
              key={src + i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Photo ${i + 1}`}
              className={i === index ? "on" : ""}
              onClick={() => setIndex(i)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {open && <Lightbox srcs={srcs} alts={alts} by={by} index={index} onIndex={setIndex} onClose={() => setOpen(false)} />}
    </div>
  );
}

// The big, own-page version of a post's media: every photo with thumbnails and
// a full-screen viewer, or the video at full size.
export default function PostMediaDetail({ media, postId, by }) {
  if (media.type === "images") {
    const srcs = media.preview || Array.from({ length: media.count }, (_, i) => postImageUrl(postId, i));
    return <Gallery srcs={srcs} alts={media.alts} by={by} />;
  }

  if (media.type === "video" && media.kind === "youtube") {
    return (
      <div className="pd-stage pd-embed">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${media.ytId}?rel=0`}
          title="YouTube video"
          allow="encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    );
  }

  if (media.type === "video") {
    const poster = media.preview?.poster || (media.hasPoster ? postImageUrl(postId, 0) : undefined);
    return (
      <div className="pd-stage pd-video">
        <FeedVideo
          poster={poster}
          src={media.preview?.src || `/video/${postId}`}
          ads={media.ads?.breaks ? { postId, breaks: media.ads.breaks } : undefined}
        />
      </div>
    );
  }
  return null;
}
