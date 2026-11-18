"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CommentIcon, SaveIcon, ShareIcon, VolumeIcon, VolumeOffIcon } from "../icons";
import { CrateIcon, FlameIcon, PauseIcon, PlayIcon, StarIcon } from "./icons";
import { formatCount } from "@/lib/format-count";
import { MIN_WATCH_SECONDS, WATCH_FRACTION } from "@/lib/videos-config";

const DOUBLE_TAP_MS = 300;
const needFor = (duration) => Math.max(MIN_WATCH_SECONDS, WATCH_FRACTION * Math.max(1, duration || MIN_WATCH_SECONDS));

// One clip, full screen. The parent decides which clip is `active` (plays) and
// which are `near` (have a <video> ready); everything else is just a poster.
// While a clip plays, this adds up the seconds really watched and reports once,
// when 80% of it has played, so looping or scrubbing can't fake a finish.
function Slide({
  clip, index, active, near, muted, hold, canEarn, found, comboNext,
  onFinish, onHeat, onSave, onComments, onShare, onMute, onPackage, onBlocked,
}) {
  const vref = useRef(null);
  const bar = useRef(null);
  const played = useRef(0);
  const lastT = useRef(null);
  const counted = useRef(false);
  const tap = useRef({ t: 0, x: 0, y: 0, timer: 0 });
  const burstId = useRef(0);

  const [userPaused, setUserPaused] = useState(false);
  const [flash, setFlash] = useState(0); // bumps to replay the pause/play glyph
  const [buffering, setBuffering] = useState(false);
  const [failed, setFailed] = useState(false);
  const [contain, setContain] = useState(false);
  const [duration, setDuration] = useState(clip.seconds || 0);
  const [done, setDone] = useState(false);
  const [bursts, setBursts] = useState([]);
  const [pkgOn, setPkgOn] = useState(false);
  const [more, setMore] = useState(false);

  const poster = clip.poster ? `url("${clip.poster}")` : undefined;
  const playing = active && !hold && !userPaused && !failed;

  // Play / pause the real <video>.
  useEffect(() => {
    const v = vref.current;
    if (!v) return;
    v.muted = muted;
    if (playing) {
      const p = v.play();
      if (p && p.catch) {
        p.catch(() => {
          // The browser refused sound before any tap: carry on muted.
          if (!v.muted) {
            v.muted = true;
            onBlocked?.();
            v.play().catch(() => {});
          }
        });
      }
    } else v.pause();
  }, [playing, muted, near, onBlocked]);

  // Leaving the screen: rewind and forget this watch (counted clips stay counted in the parent).
  useEffect(() => {
    if (active) return;
    const v = vref.current;
    if (v) v.currentTime = 0;
    played.current = 0;
    lastT.current = null;
    counted.current = false;
    setDone(false);
    setUserPaused(false);
    setPkgOn(false);
    setMore(false);
    if (bar.current) bar.current.style.transform = "scaleX(0)";
  }, [active]);

  // The Hidden Package floats in a little after the clip starts.
  useEffect(() => {
    if (!active || !clip.pkg || found) {
      setPkgOn(false);
      return undefined;
    }
    const t = setTimeout(() => setPkgOn(true), clip.pkg.afterMs);
    return () => clearTimeout(t);
  }, [active, clip.pkg, found]);

  useEffect(() => () => clearTimeout(tap.current.timer), []);

  const onTime = useCallback(() => {
    const v = vref.current;
    if (!v || !v.duration) return;
    const t = v.currentTime;
    if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, t / v.duration)})`;
    if (lastT.current != null) {
      const d = t - lastT.current;
      if (d > 0 && d < 1.25) played.current += d; // only real, forward, playing time counts
    }
    lastT.current = t;
    if (!counted.current && played.current >= needFor(v.duration)) {
      counted.current = true;
      setDone(true);
      onFinish?.({ id: clip.id, seconds: played.current, duration: v.duration });
    }
  }, [clip.id, onFinish]);

  const burst = (x, y) => {
    const id = (burstId.current += 1);
    setBursts((b) => [...b, { id, x, y }]);
    setTimeout(() => setBursts((b) => b.filter((i) => i.id !== id)), 900);
  };

  // One tap pauses or plays; two quick taps give heat.
  const onTap = (e) => {
    if (e.detail === 0) {
      // Pressed from the keyboard (Space): always just pause or play.
      setUserPaused((p) => !p);
      setFlash((n) => n + 1);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const prev = tap.current;
    if (Date.now() - prev.t < DOUBLE_TAP_MS && Math.hypot(x - prev.x, y - prev.y) < 70) {
      clearTimeout(prev.timer);
      tap.current = { t: 0, x: 0, y: 0, timer: 0 };
      burst(x, y);
      onHeat(clip, { onlyOn: true });
      return;
    }
    tap.current = {
      t: Date.now(), x, y,
      timer: setTimeout(() => {
        setUserPaused((p) => !p);
        setFlash((n) => n + 1);
      }, DOUBLE_TAP_MS),
    };
  };

  const need = needFor(duration);
  const notch = duration ? Math.min(100, (need / duration) * 100) : 80;
  const title = clip.title || clip.text;

  return (
    <section
      className={`vr-slide${active ? " is-active" : ""}`}
      data-index={index}
      aria-roledescription="clip"
      aria-label={`Clip ${index + 1} by ${clip.user}`}
    >
      <div className="vr-backdrop" style={{ backgroundImage: poster }} />

      {near ? (
        <video
          ref={vref}
          className={`vr-video${contain ? " is-contain" : ""}`}
          src={clip.src}
          poster={clip.poster || undefined}
          loop
          playsInline
          muted={muted}
          preload={active ? "auto" : "metadata"}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            setDuration(v.duration || 0);
            setContain(v.videoWidth / Math.max(1, v.videoHeight) > 0.9);
          }}
          onTimeUpdate={onTime}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onCanPlay={() => setBuffering(false)}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="vr-still" style={{ backgroundImage: poster }} />
      )}

      <div className="vr-shade" aria-hidden="true" />
      <div className="vr-tap" onClick={onTap} />

      {buffering && active && <span className="vr-spin" aria-label="Loading clip" role="status" />}
      {failed && (
        <div className="vr-fail" role="alert">
          <b>This clip won’t play</b>
          <span>Swipe up for the next one.</span>
        </div>
      )}
      {flash > 0 && (
        <span key={flash} className="vr-flash" aria-hidden="true">
          {userPaused ? <PauseIcon /> : <PlayIcon />}
        </span>
      )}
      {bursts.map((b) => (
        <span key={b.id} className="vr-burst" style={{ left: b.x, top: b.y }} aria-hidden="true">
          <FlameIcon />
        </span>
      ))}

      {pkgOn && clip.pkg && !found && (
        <button
          type="button"
          className="vr-crate"
          style={{ left: `${clip.pkg.x}%`, top: `${clip.pkg.y}%` }}
          aria-label="Hidden package. Tap to collect it"
          onClick={() => {
            setPkgOn(false);
            onPackage(clip);
          }}
        >
          <CrateIcon />
        </button>
      )}

      {/* Wanted level: how loved this clip is (0 to 5 stars). */}
      <div
        className={`vr-wanted${clip.heat >= 4 ? " siren" : ""}`}
        role="img"
        aria-label={`Wanted level ${clip.heat} of 5`}
        title="Wanted level: how hot this clip is"
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <i key={n} className={n <= clip.heat ? "lit" : ""} style={{ "--n": n }}>
            <StarIcon />
          </i>
        ))}
      </div>

      <div className="vr-meta">
        <div className="vr-who">
          <Link href={`/u/${encodeURIComponent(clip.user)}`} className="vr-who-link">
            <span
              className="vr-av"
              aria-hidden="true"
              style={{
                backgroundImage: `${clip.hasAvatar ? `url("/avatar/${encodeURIComponent(clip.user)}?v=${clip.avatarV || 0}"), ` : ""}linear-gradient(135deg, ${clip.avatarA}, ${clip.avatarB})`,
              }}
            >
              {!clip.hasAvatar && clip.initial}
            </span>
            <b>{clip.user}</b>
          </Link>
          <span className="vr-ago">{clip.timeAgo}</span>
          {clip.spoiler && <span className="vr-tag-spoiler">Spoiler</span>}
        </div>
        {title && (
          <p className={`vr-text${more ? " open" : ""}`} onClick={() => setMore((m) => !m)}>
            {title}
          </p>
        )}
        {clip.tags.length > 0 && (
          <p className="vr-tags">
            {clip.tags.slice(0, 4).map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        )}
      </div>

      <div className="vr-rail">
        <button
          type="button"
          className={`vr-btn vr-heat${clip.likedByMe ? " on" : ""}`}
          aria-pressed={clip.likedByMe}
          aria-label={clip.likedByMe ? "Take your heat back" : "Give heat"}
          onClick={() => onHeat(clip)}
        >
          <FlameIcon />
          <span>{clip.likes === null ? "Heat" : formatCount(clip.likes)}</span>
        </button>
        <button
          type="button"
          className="vr-btn"
          aria-label={`Comments, ${clip.comments}`}
          disabled={clip.commentsOff}
          title={clip.commentsOff ? "The author turned comments off" : undefined}
          onClick={() => onComments(clip)}
        >
          <CommentIcon />
          <span>{formatCount(clip.comments)}</span>
        </button>
        <button
          type="button"
          className={`vr-btn${clip.savedByMe ? " on-save" : ""}`}
          aria-pressed={clip.savedByMe}
          aria-label={clip.savedByMe ? "Remove from saved" : "Save clip"}
          onClick={() => onSave(clip)}
        >
          <SaveIcon />
          <span>{clip.savedByMe ? "Saved" : "Save"}</span>
        </button>
        <button type="button" className="vr-btn" aria-label="Share clip" onClick={() => onShare(clip)}>
          <ShareIcon />
          <span>Share</span>
        </button>
        <button type="button" className="vr-btn" aria-pressed={!muted} aria-label={muted ? "Turn sound on" : "Turn sound off"} onClick={onMute}>
          {muted ? <VolumeOffIcon /> : <VolumeIcon />}
          <span>{muted ? "Muted" : "Sound"}</span>
        </button>
      </div>

      {/* Mission bar: fills as the clip plays, and the notch lights when it counts. */}
      <div className={`vr-prog${done ? " done" : ""}`} aria-hidden="true">
        <div className="vr-prog-fill" ref={bar} />
        {canEarn && (
          <span className="vr-notch" style={{ left: `${notch}%` }}>
            <em>{done ? "✓" : comboNext > 1 ? `×${comboNext}` : "XP"}</em>
          </span>
        )}
      </div>
    </section>
  );
}

export default memo(Slide);
