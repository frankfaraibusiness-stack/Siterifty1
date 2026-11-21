"use client";

import { useEffect, useRef, useState } from "react";
import { SKIP_AFTER_SECONDS, countsAfterSeconds, isSkippable } from "@/lib/instream-ads";
import { hostOf } from "@/lib/ads";
import { sendTrack } from "./adHooks";
import { reportInstreamView } from "./useInstreamAds";
import { VolumeIcon, VolumeOffIcon } from "../icons";

// One ad, drawn over a video while it is paused underneath.
//
//   Photo ad, or a video ad of 5 seconds or less   ends by itself. No skip button.
//   Video ad longer than 5 seconds                 "Skip in 5, 4, 3 ..." and then "Skip ad". It never skips by
//                                                  itself: it plays to its end unless the viewer taps Skip.
//   Counts as a view after min(its length, 5s) of real playing; the server pays the creator for it.
//
// `roll` comes from useInstreamAds; `onDone` is its `finish`. `muted` / `onToggleMute` follow the player's speaker.

const REL = "noopener noreferrer nofollow sponsored";
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.max(0, Math.ceil(s) % 60)).padStart(2, "0")}`;

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="currentColor">
      <path d="M5 5.5v13l9.5-6.5z" />
      <rect x="16" y="5" width="3" height="14" rx="1" />
    </svg>
  );
}

export default function InstreamAd({ roll, muted = true, onToggleMute, onDone, variant = "post" }) {
  const { ad, token, n, of } = roll;
  const m = ad.media || {};
  const isVideo = m.kind === "video";
  const vref = useRef(null);
  const credited = useRef(false);
  const finished = useRef(false);

  const [len, setLen] = useState(roll.seconds); // the real length once a clip's metadata is in
  const [elapsed, setElapsed] = useState(0);
  const [started, setStarted] = useState(false); // something real is on screen
  const [soundMuted, setSoundMuted] = useState(muted);

  const skippable = isSkippable(len);
  const canSkip = skippable && elapsed >= SKIP_AFTER_SECONDS;
  const left = Math.max(0, len - elapsed);
  const host = hostOf(ad.link) || "advertiser";

  const done = (how) => {
    if (finished.current) return;
    finished.current = true;
    // An ad that played to its natural end always counts, even if the last clock tick fell a hair short.
    if (how === "ended" && started && !credited.current) {
      credited.current = true;
      reportInstreamView(token);
    }
    onDone?.(how);
  };

  // It counts as a view once it has really played long enough. Tell the server once.
  useEffect(() => {
    if (credited.current || !started || elapsed < countsAfterSeconds(len)) return;
    credited.current = true;
    reportInstreamView(token);
  }, [elapsed, len, started, token]);

  // Photo ads: a clock that only runs while the picture is up and the tab is visible.
  useEffect(() => {
    if (isVideo || !started) return undefined;
    const id = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      setElapsed((e) => e + 0.1);
    }, 100);
    return () => clearInterval(id);
  }, [isVideo, started]);
  useEffect(() => {
    if (!isVideo && started && elapsed >= len) done("ended");
  });

  // Video ads: play, and carry on muted if the browser refuses sound.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.muted = soundMuted;
    const p = v.play();
    if (p && p.catch) {
      p.catch(() => {
        if (!v.muted) {
          v.muted = true;
          setSoundMuted(true);
          v.play().catch(() => done("error"));
        } else done("error");
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (vref.current) vref.current.muted = soundMuted;
  }, [soundMuted]);

  // An ad with no picture (a headline only) is on screen straight away.
  useEffect(() => {
    if (!isVideo && !m.src) setStarted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // An ad that never starts is dropped, not waited on.
  useEffect(() => {
    if (started) return undefined;
    const t = setTimeout(() => done("error"), 8000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started]);

  const toggleSound = (e) => {
    e.stopPropagation();
    setSoundMuted((x) => !x);
    onToggleMute?.();
  };

  return (
    <section className={`isa isa-${variant}`} role="region" aria-label={`Advertisement ${n} of ${of}`} onClick={(e) => e.stopPropagation()}>
      <div className="isa-backdrop" style={m.src ? { backgroundImage: `url("${m.src}")` } : undefined} aria-hidden="true" />

      <div className="isa-stage">
        {isVideo ? (
          <video
            ref={vref}
            className="isa-media"
            src={m.video}
            poster={m.src || undefined}
            playsInline
            muted={soundMuted}
            preload="auto"
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration;
              if (Number.isFinite(d) && d > 0) setLen(Math.round(d * 10) / 10);
            }}
            onPlaying={() => setStarted(true)}
            onTimeUpdate={(e) => setElapsed(e.currentTarget.currentTime)}
            onEnded={() => done("ended")}
            onError={() => done("error")}
          />
        ) : m.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="isa-media" src={m.src} alt="" referrerPolicy="no-referrer" draggable={false} onLoad={() => setStarted(true)} onError={() => done("error")} />
        ) : (
          <div className="isa-media isa-text">{ad.title}</div>
        )}
      </div>

      <div className="isa-shade" aria-hidden="true" />

      <div className="isa-top">
        <span className="isa-chip">
          <b>Ad</b>
          {of > 1 && <span>{n} of {of}</span>}
          <span className="isa-left" aria-hidden="true">{clock(left)}</span>
        </span>
        {isVideo && (
          <button type="button" className="isa-round" onClick={toggleSound} aria-pressed={!soundMuted} aria-label={soundMuted ? "Turn ad sound on" : "Turn ad sound off"}>
            {soundMuted ? <VolumeOffIcon /> : <VolumeIcon />}
          </button>
        )}
      </div>

      <div className="isa-bottom">
        <div className="isa-card">
          <span className="isa-host">{host}</span>
          <b className="isa-title">{ad.title}</b>
          {ad.description && <p className="isa-desc">{ad.description}</p>}
          <a href={ad.link} target="_blank" rel={REL} className="isa-cta" onClick={() => sendTrack(ad.id, "videos", "click")}>
            <span>{ad.cta || "Learn more"}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        </div>

        {skippable && (
          <button type="button" className={`isa-skip${canSkip ? " ready" : ""}`} disabled={!canSkip} onClick={() => done("skipped")}>
            {canSkip ? (
              <>
                <span>Skip ad</span>
                <SkipIcon />
              </>
            ) : (
              <span>Skip in {Math.max(1, Math.ceil(SKIP_AFTER_SECONDS - elapsed))}</span>
            )}
          </button>
        )}
      </div>

      <div className="isa-prog" aria-hidden="true">
        <i style={{ transform: `scaleX(${Math.min(1, len ? elapsed / len : 0)})` }} />
      </div>
    </section>
  );
}
