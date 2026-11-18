"use client";

import { memo, useEffect, useRef, useState } from "react";
import { hostOf } from "@/lib/ads";
import { SponsoredTag } from "../ads/AdViews";
import { sendTrack } from "../ads/adHooks";
import { VolumeIcon, VolumeOffIcon } from "../icons";
import { DownIcon, PauseIcon, PlayIcon } from "./icons";

// A sponsored card between clips in the Videos tab. It is a full slide, built like a clip
// (blurred backdrop, soft shade, caption bottom-left, rail on the right, bar along the bottom)
// so it reads as the next card in the reel and not a pop-up. The gold "Sponsored" chip and the
// big button keep it honest. Video ads play like clips (sound follows the reel's speaker switch);
// pictures get a slow, gentle zoom.
//
// `VideosApp` decides where one goes (after every 3 to 5 clips) and hands it the ad it fetched.

const REL = "noopener noreferrer nofollow sponsored";

// ---- which ad comes next ---------------------------------------------------------------------
// One random live ad per slot, fetched a few clips ahead so it is ready the moment it is due.
// Module-level on purpose: leaving and coming back to the tab shouldn't show the same ad twice in a row.
const seen = [];
let quietUntil = 0; // when nothing is running for the Videos tab we stop asking for a couple of minutes

export async function fetchReelAd() {
  if (Date.now() < quietUntil) return null;
  try {
    const res = await fetch(`/api/ads/serve?placement=videos&exclude=${seen.join(",")}`, { cache: "no-store" });
    const j = await res.json();
    if (!j.ad) {
      quietUntil = Date.now() + 120_000;
      return null;
    }
    seen.push(j.ad.id);
    if (seen.length > 20) seen.shift();
    // Warm the picture / cover so the card doesn't flash empty.
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

// ---- the slide ---------------------------------------------------------------------------------
function ReelAd({ ad, index, active, near, muted, hold, onMute, onNext, onBlocked }) {
  const m = ad.media || {};
  const isVideo = m.kind === "video";
  const vref = useRef(null);
  const bar = useRef(null);
  const viewed = useRef(false);
  const cb = useRef({ onBlocked });
  useEffect(() => {
    cb.current = { onBlocked };
  });

  const [userPaused, setUserPaused] = useState(false);
  const [flash, setFlash] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false); // the clip won't play: fall back to its cover
  const [broken, setBroken] = useState(false); // the picture won't load
  const [ready, setReady] = useState(false); // something real is on screen
  const [shape, setShape] = useState(m.w && m.h ? m.h / m.w : 0); // height / width of the creative

  // Tall (vertical) creatives fill the screen; wide or square ones sit in the middle on a soft blur of themselves.
  const tall = shape >= 1.3;
  const poster = m.src ? `url("${m.src}")` : undefined;
  const asClip = isVideo && !failed;
  const playing = asClip && active && !hold && !userPaused;
  const host = hostOf(ad.link) || "yourwebsite.com";

  // Play / pause the real <video>; carry on muted if the browser refuses sound.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.muted = muted;
    if (playing) {
      const p = v.play();
      if (p && p.catch) {
        p.catch(() => {
          if (!v.muted) {
            v.muted = true;
            cb.current.onBlocked?.();
            v.play().catch(() => {});
          }
        });
      }
    } else v.pause();
  }, [playing, muted, near]);

  // Leaving the screen: rewind, so the next visit starts from the top.
  useEffect(() => {
    if (active) return;
    const v = vref.current;
    if (v) v.currentTime = 0;
    setUserPaused(false);
    if (bar.current) bar.current.style.transform = "scaleX(0)";
  }, [active]);

  // Count the view once the card has really been on screen, loaded, for a second.
  useEffect(() => {
    if (viewed.current || !active || hold || !ready) return undefined;
    const t = setTimeout(() => {
      viewed.current = true;
      sendTrack(ad.id, "videos", "view");
    }, 1000);
    return () => clearTimeout(t);
  }, [active, hold, ready, ad.id]);

  const onTime = () => {
    const v = vref.current;
    if (v && v.duration && bar.current) bar.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
  };

  // One tap pauses or plays a video ad (Space does the same, like on a clip).
  const toggle = () => {
    setUserPaused((p) => !p);
    setFlash((n) => n + 1);
  };

  const click = () => sendTrack(ad.id, "videos", "click");

  return (
    <section
      className={`vr-slide vr-ad-slide${active ? " is-active" : ""}${tall ? " tall" : ""}`}
      data-index={index}
      aria-roledescription="sponsored clip"
      aria-label={`Sponsored: ${ad.title || "ad"}`}
    >
      <div className="vr-backdrop" style={{ backgroundImage: poster }} />

      <div className="vr-ad-stage">
        {asClip ? (
          near ? (
            <video
              ref={vref}
              className="vr-ad-media"
              src={m.video}
              poster={m.src || undefined}
              loop
              playsInline
              muted={muted}
              preload={active ? "auto" : "metadata"}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.videoWidth && v.videoHeight) setShape(v.videoHeight / v.videoWidth);
              }}
              onLoadedData={() => setReady(true)}
              onTimeUpdate={onTime}
              onWaiting={() => setBuffering(true)}
              onPlaying={() => {
                setBuffering(false);
                setReady(true);
              }}
              onCanPlay={() => setBuffering(false)}
              onError={() => setFailed(true)}
            />
          ) : (
            <div className="vr-ad-media vr-ad-cover" style={{ backgroundImage: poster }} />
          )
        ) : m.src && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="vr-ad-media is-picture"
            src={m.src}
            alt=""
            referrerPolicy="no-referrer"
            draggable={false}
            onLoad={() => setReady(true)}
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="vr-ad-media vr-ad-fallback">{ad.title}</div>
        )}
      </div>

      <div className="vr-shade vr-ad-shade" aria-hidden="true" />
      {asClip && <div className="vr-tap" onClick={toggle} />}

      {buffering && active && <span className="vr-spin" aria-label="Loading sponsored clip" role="status" />}
      {flash > 0 && (
        <span key={flash} className="vr-flash" aria-hidden="true">
          {userPaused ? <PauseIcon /> : <PlayIcon />}
        </span>
      )}

      <div className="vr-ad-chip">
        <SponsoredTag />
      </div>

      <div className="vr-ad-card">
        <div className="vr-ad-who">
          <span className="vr-av vr-ad-av" aria-hidden="true">
            Ad
          </span>
          <b>{host}</b>
        </div>
        <b className="vr-ad-title">{ad.title || "Your headline"}</b>
        {ad.description && <p className="vr-ad-desc">{ad.description}</p>}
        <a href={ad.link} target="_blank" rel={REL} className="vr-ad-cta" onClick={click}>
          <span>{ad.cta || "Learn more"}</span>
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>

      <div className="vr-rail">
        {asClip && (
          <button type="button" className="vr-btn" aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={onMute}>
            {muted ? <VolumeOffIcon /> : <VolumeIcon />}
            <span>{muted ? "Muted" : "Sound"}</span>
          </button>
        )}
        <button type="button" className="vr-btn" aria-label="Next clip" onClick={() => onNext(1)}>
          <DownIcon />
          <span>Next</span>
        </button>
      </div>

      {asClip && (
        <div className="vr-prog vr-ad-prog" aria-hidden="true">
          <div className="vr-prog-fill" ref={bar} />
        </div>
      )}
    </section>
  );
}

export default memo(ReelAd);
