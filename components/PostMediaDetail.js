"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { postImageUrl } from "@/lib/media-url";

const SWIPE = 50;

function isTyping(e) {
  return /input|textarea|select/i.test(e.target?.tagName || "") || e.target?.isContentEditable;
}

// Full-screen viewer for one post's photos.
function Lightbox({ srcs, alts, index, onIndex, onClose }) {
  useScrollLock(true);
  const touch = useRef(null);
  const last = srcs.length - 1;

  const go = useCallback(
    (d) => onIndex((i) => Math.min(last, Math.max(0, i + d))),
    [last, onIndex]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  return (
    <div
      className="lb"
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      onPointerDown={(e) => (touch.current = e.clientX)}
      onPointerUp={(e) => {
        const dx = e.clientX - (touch.current ?? e.clientX);
        touch.current = null;
        if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
        else if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="lb-img" src={srcs[index]} alt={alts?.[index] || ""} draggable={false} />

      <button type="button" className="lb-close" onClick={onClose} aria-label="Close">&times;</button>
      {srcs.length > 1 && (
        <>
          <span className="lb-count">{index + 1} / {srcs.length}</span>
          <button type="button" className="lb-nav prev" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous photo">&lsaquo;</button>
          <button type="button" className="lb-nav next" onClick={() => go(1)} disabled={index === last} aria-label="Next photo">&rsaquo;</button>
        </>
      )}
    </div>
  );
}

function Gallery({ srcs, alts }) {
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

      {open && <Lightbox srcs={srcs} alts={alts} index={index} onIndex={setIndex} onClose={() => setOpen(false)} />}
    </div>
  );
}

// The big, own-page version of a post's media: every photo with thumbnails and
// a full-screen viewer, or the video at full size.
export default function PostMediaDetail({ media, postId }) {
  if (media.type === "images") {
    const srcs = media.preview || Array.from({ length: media.count }, (_, i) => postImageUrl(postId, i));
    return <Gallery srcs={srcs} alts={media.alts} />;
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
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          src={media.preview?.src || `/video/${postId}`}
        />
      </div>
    );
  }
  return null;
}
