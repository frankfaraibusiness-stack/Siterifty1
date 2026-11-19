"use client";

import { useEffect, useRef, useState } from "react";
import { STORY_AD_SECONDS, VIDEO_MAX_SECONDS, hostOf } from "@/lib/ads";
import { SponsoredTag } from "./AdViews";
import { sendTrack } from "./adHooks";
import { VolumeIcon, VolumeOffIcon, XIcon } from "../icons";

// A sponsored story. It sits in the story viewer's frame and is built from the same parts as a
// real story (progress bar on top, round avatar + name, tools, text at the bottom), so it reads as
// the next card rather than a pop-up, while the gold "Sponsored" tag and the big button keep it
// honest. Pictures stay up for STORY_AD_SECONDS, clips play to their end (30 s at most).
//
// `preview` is the Ad Maker's look-alike: no timer, no tracking, nothing opens.

const REL = "noopener noreferrer nofollow sponsored";

// ---- which ad comes next ----------------------------------------------------------------------
// One random live ad per slot, fetched a story or two ahead so it is ready the moment it is due.
// Module-level on purpose: the viewer closes and opens again, and the same ad shouldn't come twice in a row.
const seen = [];
let quietUntil = 0; // when nothing is running for stories we stop asking for a couple of minutes

export async function fetchStoryAd() {
  if (Date.now() < quietUntil) return null;
  try {
    const res = await fetch(`/api/ads/serve?placement=stories&exclude=${seen.join(",")}`, { cache: "no-store" });
    const j = await res.json();
    if (!j.ad) {
      quietUntil = Date.now() + 120_000;
      return null;
    }
    seen.push(j.ad.id);
    if (seen.length > 20) seen.shift();
    // Warm the picture so the card doesn't flash empty.
    if (j.ad.media?.src && typeof Image !== "undefined") {
      const im = new Image();
      im.referrerPolicy = "no-referrer";
      im.src = j.ad.media.src;
    }
    return j.ad;
  } catch {
    return null;
  }
}

// ---- the card ---------------------------------------------------------------------------------
export default function StoryAd({ ad, paused = false, muted = false, preview = false, onDone, onClose, onToggleMute, onNeedMute }) {
  const m = ad.media || {};
  const isVideo = m.kind === "video";
  const vref = useRef(null);
  const finished = useRef(false);
  const viewed = useRef(false);
  const elapsed = useRef(0);
  const cb = useRef({ onDone, onNeedMute });
  useEffect(() => {
    cb.current = { onDone, onNeedMute };
  });

  const [ready, setReady] = useState(preview);
  const [p, setP] = useState(preview ? 0.4 : 0);
  const [broken, setBroken] = useState(false);

  // Tall pictures fill the frame; wide or square ones sit on a soft blur of themselves, like clips do.
  const tall = m.w && m.h ? m.h / m.w >= 1.3 : false;
  const bg = m.src ? `url("${m.src}")` : undefined;

  const finish = () => {
    if (finished.current || preview) return;
    finished.current = true;
    cb.current.onDone?.();
  };

  // Count the view once the card has really been on screen for a second.
  useEffect(() => {
    if (preview || !ready || viewed.current) return undefined;
    const t = setTimeout(() => {
      viewed.current = true;
      sendTrack(ad.id, "stories", "view");
    }, 1000);
    return () => clearTimeout(t);
  }, [ready, preview, ad.id]);

  // Pictures: a timer that survives pausing (hold to pause, like stories).
  useEffect(() => {
    if (preview || isVideo || !ready || paused) return undefined;
    const total = STORY_AD_SECONDS * 1000;
    let last = performance.now();
    let raf = 0;
    const tick = (now) => {
      elapsed.current += now - last;
      last = now;
      const v = Math.min(1, elapsed.current / total);
      setP(v);
      if (v >= 1) return finish();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVideo, ready, paused, preview]);

  // Clips: play / pause with the viewer; fall back to muted if the browser refuses sound.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.muted = muted;
    if (paused) {
      v.pause();
      return;
    }
    v.play()?.catch(() => {
      if (!v.muted) {
        v.muted = true;
        cb.current.onNeedMute?.();
        v.play().catch(() => {});
      }
    });
  }, [paused, muted]);

  const onTime = (e) => {
    if (preview) return;
    const v = e.currentTarget;
    const cap = Math.min(Number.isFinite(v.duration) ? v.duration : VIDEO_MAX_SECONDS, VIDEO_MAX_SECONDS);
    setP(Math.min(1, v.currentTime / cap));
    if (v.currentTime >= cap - 0.05) finish();
  };

  const stop = (e) => e.stopPropagation();
  const host = hostOf(ad.link) || "yourwebsite.com";
  const go = (e) => {
    e.stopPropagation();
    if (preview) return e.preventDefault();
    sendTrack(ad.id, "stories", "click");
  };

  return (
    <div className={`sv-ad${tall ? " tall" : ""}`} aria-label="Sponsored story">
      {bg && !tall && <div className="sv-ad-blur" style={{ backgroundImage: bg }} aria-hidden="true" />}

      {isVideo ? (
        <video
          ref={vref}
          className="sv-media sv-ad-media"
          src={m.video}
          poster={m.src || undefined}
          autoPlay
          loop={preview}
          muted={preview ? true : muted}
          playsInline
          preload="auto"
          onLoadedData={() => setReady(true)}
          onPlaying={() => setReady(true)}
          onWaiting={() => !preview && setReady(false)}
          onTimeUpdate={onTime}
          onEnded={finish}
          onError={finish}
        />
      ) : broken ? (
        <div className="sv-media sv-ad-broken">{ad.title}</div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`sv-media sv-ad-media${ready ? "" : " sv-pending"}`}
          src={m.src}
          alt=""
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={() => setReady(true)}
          onError={() => (preview ? setBroken(true) : finish())}
        />
      )}
      {!ready && !preview && (
        <div className="sv-skel" role="status" aria-label="Loading sponsored story">
          <span className="nl-s sv-skel-fill" />
        </div>
      )}

      <div className="sv-shade sv-ad-shade" />

      <div className="sv-bars" aria-hidden="true">
        <span>
          <i style={{ width: `${p * 100}%` }} />
        </span>
      </div>

      <div className="sv-top" onPointerDown={stop} onPointerUp={stop}>
        <div className="sv-who">
          <span className="sv-avatar sv-ad-avatar" aria-hidden="true">
            Ad
          </span>
          <b>{host}</b>
          <SponsoredTag mini />
        </div>
        <div className="sv-tools">
          {isVideo && (
            <button type="button" className="sv-tool" onClick={() => !preview && onToggleMute?.()} aria-label={muted ? "Turn sound on" : "Mute"}>
              {muted ? <VolumeOffIcon /> : <VolumeIcon />}
            </button>
          )}
          <button type="button" className="sv-tool" onClick={() => !preview && onClose?.()} aria-label="Close">
            <XIcon />
          </button>
        </div>
      </div>

      <div className="sv-ad-bottom" onPointerDown={stop} onPointerUp={stop}>
        <b className="sv-ad-title">{ad.title || "Your headline"}</b>
        {ad.description && <p className="sv-ad-desc">{ad.description}</p>}
        <a href={ad.link} target="_blank" rel={REL} className="sv-ad-cta" onClick={go}>
          {ad.cta || "Learn more"}
          <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  );
}
