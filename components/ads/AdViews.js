"use client";

import { useEffect, useRef, useState } from "react";
import { hostOf } from "@/lib/ads";
import { useViewed } from "./adHooks";

// The two looks of an ad. They are pure display (no fetching), so the Ad Maker
// uses the very same components for its live preview (`preview` = no tracking).

export const SponsoredTag = ({ mini = false }) => (
  <span className={`ad-tag${mini ? " mini" : ""}`}>
    <svg viewBox="0 0 24 24" width={mini ? 11 : 13} height={mini ? 11 : 13} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M15.5 8.5a5 5 0 0 1 0 7" />
    </svg>
    Sponsored
  </span>
);

const REL = "noopener noreferrer nofollow sponsored";

// ---- the big card (home feed + communities) ---------------------------------

export function AdCardView({ ad, onView, onClick, preview = false }) {
  const root = useRef(null);
  const vid = useRef(null);
  const [loaded, setLoaded] = useState(false);
  const [muted, setMuted] = useState(true);
  const [broken, setBroken] = useState(false);
  const m = ad.media || {};
  const isVideo = m.kind === "video";
  useViewed(root, () => onView?.(), !preview);

  // Video plays (muted) while mostly on screen and pauses when it leaves.
  useEffect(() => {
    const v = vid.current;
    if (!isVideo || !v || typeof IntersectionObserver === "undefined") return undefined;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.intersectionRatio >= 0.6) v.play().catch(() => {}); else v.pause(); }, { threshold: [0, 0.6] });
    io.observe(v);
    return () => io.disconnect();
  }, [isVideo, m.video]);

  const ratio = m.w && m.h ? { aspectRatio: `${m.w} / ${m.h}` } : undefined;
  const go = (e) => { if (preview) e.preventDefault(); else onClick?.(); };

  return (
    <aside ref={root} className="ad-card" aria-label="Sponsored">
      <div className={`ad-media${loaded || isVideo ? " loaded" : ""}`} style={ratio}>
        <a href={ad.link} target="_blank" rel={REL} className="ad-media-link" onClick={go} aria-label={`${ad.title} (sponsored)`}>
          {isVideo ? (
            <video ref={vid} src={m.video} poster={m.src || undefined} muted={muted} loop playsInline preload="metadata" onLoadedData={() => setLoaded(true)} />
          ) : broken ? (
            <span className="ad-broken">Image unavailable</span>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" referrerPolicy="no-referrer" onLoad={() => setLoaded(true)} onError={() => setBroken(true)} />
          )}
        </a>
        <SponsoredTag />
        {isVideo && (
          <button type="button" className="ad-sound" aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={() => { setMuted(!muted); if (vid.current) vid.current.muted = !muted; }}>
            {muted ? "🔇" : "🔊"}
          </button>
        )}
      </div>
      <div className="ad-body">
        <div className="ad-text">
          <b className="ad-title">{ad.title || "Your headline"}</b>
          {ad.description && <p className="ad-desc">{ad.description}</p>}
          <small className="ad-host">{hostOf(ad.link) || "yourwebsite.com"}</small>
        </div>
        <a href={ad.link} target="_blank" rel={REL} className="ad-cta" onClick={go}>
          {ad.cta || "Learn more"}
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </a>
      </div>
    </aside>
  );
}

// ---- the compact row (chats) --------------------------------------------------
// Square thumbnail on the left; title, description and link on the right.
// Only the title and the link are clickable.

export function AdRowView({ ad, onView, onClick, preview = false }) {
  const root = useRef(null);
  const [broken, setBroken] = useState(false);
  const m = ad.media || {};
  useViewed(root, () => onView?.(), !preview);
  const go = (e) => { if (preview) e.preventDefault(); else onClick?.(); };
  return (
    <aside ref={root} className="ad-mini" aria-label="Sponsored">
      <div className="ad-mini-thumb" aria-hidden="true">
        {m.src && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={m.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
        ) : (
          <span>{ad.type === "video" ? "▶" : "Ad"}</span>
        )}
      </div>
      <div className="ad-mini-text">
        <a href={ad.link} target="_blank" rel={REL} className="ad-mini-title" onClick={go}>{ad.title || "Your headline"}</a>
        <p className="ad-mini-desc">{ad.description}</p>
        <div className="ad-mini-foot">
          <SponsoredTag mini />
          <a href={ad.link} target="_blank" rel={REL} className="ad-mini-link" onClick={go}>{hostOf(ad.link) || "yourwebsite.com"} ↗</a>
        </div>
      </div>
    </aside>
  );
}
