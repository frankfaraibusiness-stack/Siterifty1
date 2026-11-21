"use client";

import { useEffect, useRef, useState } from "react";
import { hostOf } from "@/lib/ads";
import { useViewed } from "./adHooks";
import { OutIc, PlayIc, SoundIc, SoundOffIc } from "./AdIcons";

// The looks of an ad (big card, chat row, community card). They are pure display (no fetching), so the Ad Maker
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
            {muted ? <SoundOffIc size="18px" /> : <SoundIc size="18px" />}
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
// The WHOLE row is one link, so a tap anywhere on it opens the advertiser.

export function AdRowView({ ad, onView, onClick, preview = false }) {
  const root = useRef(null);
  const [broken, setBroken] = useState(false);
  const m = ad.media || {};
  useViewed(root, () => onView?.(), !preview);
  const go = (e) => { if (preview) e.preventDefault(); else onClick?.(); };
  return (
    <aside ref={root} className="ad-mini-wrap" aria-label="Sponsored">
      <a href={ad.link} target="_blank" rel={REL} className="ad-mini" onClick={go} aria-label={`${ad.title || "Ad"} (sponsored)`}>
        <span className="ad-mini-thumb" aria-hidden="true">
          {m.src && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          ) : (
            <span>{ad.type === "video" ? <PlayIc size="22px" /> : "Ad"}</span>
          )}
        </span>
        <span className="ad-mini-text">
          <b className="ad-mini-title">{ad.title || "Your headline"}</b>
          <span className="ad-mini-desc">{ad.description}</span>
          <span className="ad-mini-foot">
            <SponsoredTag mini />
            <span className="ad-mini-link">{hostOf(ad.link) || "yourwebsite.com"} <OutIc size="11px" /></span>
          </span>
        </span>
      </a>
    </aside>
  );
}

// ---- the community card ---------------------------------------------------------
// Compact (about 100px tall) and tinted with the community's own colours, so it
// sits in a post list without shouting. Different from the chat row and the big
// feed card. The WHOLE card is one link.

export function AdCompactView({ ad, onView, onClick, preview = false }) {
  const root = useRef(null);
  const [broken, setBroken] = useState(false);
  const m = ad.media || {};
  const isVideo = m.kind === "video";
  useViewed(root, () => onView?.(), !preview);
  const go = (e) => { if (preview) e.preventDefault(); else onClick?.(); };
  const cta = ad.cta || "Learn more";
  return (
    <aside ref={root} className="ad-comm-wrap" aria-label="Sponsored">
      <a href={ad.link} target="_blank" rel={REL} className="ad-comm" onClick={go} aria-label={`${ad.title || "Ad"}: ${cta} (sponsored)`}>
        <span className="ad-comm-thumb" aria-hidden="true">
          {m.src && !broken ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={m.src} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} />
          ) : isVideo && m.video ? (
            <video src={m.video} muted playsInline preload="metadata" />
          ) : (
            <span className="ad-comm-ph">Ad</span>
          )}
          {isVideo && <span className="ad-comm-play"><PlayIc size="14px" /></span>}
        </span>
        <span className="ad-comm-text">
          <span className="ad-comm-top"><SponsoredTag mini /><small>{hostOf(ad.link) || "yourwebsite.com"}</small></span>
          <b className="ad-comm-title">{ad.title || "Your headline"}</b>
          {ad.description && <span className="ad-comm-desc">{ad.description}</span>}
        </span>
        <span className="ad-comm-cta">
          <span className="ad-comm-cta-t">{cta}</span>
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
      </a>
    </aside>
  );
}
