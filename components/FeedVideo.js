"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VideoMark, { useShownRect } from "./VideoMark";
import { VolumeIcon, VolumeOffIcon } from "./icons";
import InstreamAd from "./ads/InstreamAd";
import { useInstreamAds } from "./ads/useInstreamAds";

// An uploaded video the way the Videos page plays it: no browser controls. It
// starts by itself, muted and looping, while at least half of it is on screen, and
// stops when it scrolls away. A round speaker button turns sound on, and a thin
// bar along the bottom shows how far in you are.
//
//   onOpen given   (feed cards)      a tap opens the clip in the Videos page.
//   no onOpen      (post page, the composer's preview)   a tap pauses / plays.
//   ads            (post page, monetized Long form videos) { postId, breaks }: the video plays its ad breaks, each one
//                  drawn over the paused video (components/ads/InstreamAd.js). With ads the video doesn't loop by
//                  itself: when it ends, an end ad may play, then it starts over.

// One clip plays at a time, and the sound choice carries from clip to clip.
let playing = null;
let soundOn = false;

const reduceMotion = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.motion === "reduced" || !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

function PlayGlyph() {
  return (
    <span className="media-play fv-badge" aria-hidden="true">
      <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
    </span>
  );
}

export default function FeedVideo({ src, poster, onOpen, ads }) {
  const vref = useRef(null);
  const bar = useRef(null);
  const [visible, setVisible] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [started, setStarted] = useState(false); // a real frame has been drawn
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  const box = useShownRect(vref, "contain");

  // On screen enough to play?
  useEffect(() => {
    const v = vref.current;
    if (!v || typeof IntersectionObserver !== "function") {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting && e.intersectionRatio >= 0.5), { threshold: [0, 0.5, 1] });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  // Not in a background tab.
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // The viewer wants this video playing; an ad on screen holds it paused underneath.
  const playIntent = visible && !userPaused && !hidden && !failed && !reduceMotion();
  const restart = useCallback(() => {
    const v = vref.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  }, []);
  const inAds = useInstreamAds({ postId: ads?.postId, breaks: ads?.breaks, active: playIntent, onRestart: restart });

  // Play / pause the real <video>.
  const want = playIntent && !inAds.hold;
  useEffect(() => {
    const v = vref.current;
    if (!v) return undefined;
    if (want) {
      if (playing && playing !== v) playing.pause();
      playing = v;
      v.muted = !soundOn;
      setMuted(!soundOn);
      const p = v.play();
      if (p && p.catch) {
        p.catch(() => {
          // The browser refused sound before any tap: carry on muted.
          if (!v.muted) {
            v.muted = true;
            soundOn = false;
            setMuted(true);
            v.play().catch(() => {});
          }
        });
      }
    } else {
      v.pause();
    }
    return undefined;
  }, [want]);

  useEffect(
    () => () => {
      const v = vref.current;
      if (v && playing === v) playing = null;
    },
    []
  );

  const onTime = useCallback(() => {
    const v = vref.current;
    if (!v) return;
    inAds.check(v.currentTime);
    if (!v.duration || !bar.current) return;
    bar.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
  }, [inAds]);

  const flipSound = () => {
    const v = vref.current;
    if (!v) return;
    soundOn = v.muted;
    v.muted = !soundOn;
    setMuted(!soundOn);
    if (soundOn && v.paused && !userPaused && !inAds.hold) v.play().catch(() => {});
  };
  const toggleSound = (e) => {
    e.stopPropagation();
    flipSound();
  };

  const tap = () => {
    if (onOpen) onOpen();
    else setUserPaused((p) => !p);
  };

  // The poster already carries the logo until the first frame shows, so the
  // overlay waits for real picture; without any poster it shows straight away.
  const showMark = started || !poster;

  return (
    <div className="fv">
      <video
        ref={vref}
        className="fv-video"
        src={src}
        poster={poster}
        loop={!inAds.enabled}
        muted
        playsInline
        preload="metadata"
        onTimeUpdate={onTime}
        onEnded={() => {
          if (inAds.enabled && !inAds.onEnded()) restart();
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onPlaying={() => setStarted(true)}
        onError={() => setFailed(true)}
      />
      {showMark && <VideoMark box={box} />}

      <button
        type="button"
        className="fv-tap"
        onClick={tap}
        aria-label={onOpen ? "Open video" : userPaused ? "Play video" : "Pause video"}
      />

      {!isPlaying && !failed && <PlayGlyph />}
      {failed && (
        <span className="fv-fail" role="alert">
          This video won’t play
        </span>
      )}

      <button
        type="button"
        className="fv-sound"
        onClick={toggleSound}
        onDoubleClick={(e) => e.stopPropagation()}
        aria-pressed={!muted}
        aria-label={muted ? "Turn sound on" : "Turn sound off"}
      >
        {muted ? <VolumeOffIcon /> : <VolumeIcon />}
      </button>

      <div className="fv-prog" aria-hidden="true">
        <div className="fv-prog-fill" ref={bar} />
      </div>

      {inAds.roll && <InstreamAd key={inAds.roll.token} roll={inAds.roll} muted={muted} onToggleMute={flipSound} onDone={inAds.finish} />}
    </div>
  );
}
