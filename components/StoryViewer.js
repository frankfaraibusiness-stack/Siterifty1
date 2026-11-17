"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { XIcon } from "./icons";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { STORY } from "@/lib/story-schema";

function ago(ms) {
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

// One story on screen. Photos run on a timer; clips are driven by the video
// itself and always stop at 15 seconds, whatever the file says.
function Stage({ story, paused, muted, onProgress, onDone, onNeedMute }) {
  const videoRef = useRef(null);
  const elapsed = useRef(0);
  const finished = useRef(false);
  const cb = useRef({ onProgress, onDone, onNeedMute });
  useEffect(() => {
    cb.current = { onProgress, onDone, onNeedMute };
  });
  const [loaded, setLoaded] = useState(story.kind !== "image");

  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    cb.current.onDone();
  };

  // Photos and colour cards: a simple timer that survives pausing.
  useEffect(() => {
    if (story.kind === "video" || !loaded || paused) return undefined;
    const total = STORY.imageSeconds * 1000;
    let last = performance.now();
    let raf = 0;
    const tick = (now) => {
      elapsed.current += now - last;
      last = now;
      const p = Math.min(1, elapsed.current / total);
      cb.current.onProgress(p);
      if (p >= 1) return finish();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story.kind, loaded, paused]);

  // Clips: play / pause with the viewer, fall back to muted if the browser
  // refuses sound without a tap.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (paused) {
      v.pause();
      return;
    }
    v.play()?.catch(() => {
      if (!v.muted) {
        v.muted = true;
        cb.current.onNeedMute();
        v.play().catch(() => {});
      }
    });
  }, [paused]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function onTimeUpdate(e) {
    const v = e.currentTarget;
    const cap = Math.min(Number.isFinite(v.duration) ? v.duration : STORY.maxSeconds, STORY.maxSeconds);
    cb.current.onProgress(Math.min(1, v.currentTime / cap));
    if (v.currentTime >= cap - 0.05) finish();
  }

  if (story.kind === "video") {
    return (
      <video
        ref={videoRef}
        className="sv-media"
        src={`/story/${story.id}`}
        poster={`/story/${story.id}/poster`}
        autoPlay
        playsInline
        preload="auto"
        onTimeUpdate={onTimeUpdate}
        onEnded={finish}
        onError={finish}
      />
    );
  }
  if (story.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="sv-media"
        src={`/story/${story.id}`}
        alt={story.caption || `Story by ${story.username}`}
        onLoad={() => setLoaded(true)}
        onError={finish}
        draggable={false}
      />
    );
  }
  return (
    <div className="sv-media sv-gradient" style={{ backgroundImage: story.gradient }}>
      <span>@{story.username}</span>
    </div>
  );
}

export default function StoryViewer({ groups, startGroup, onClose, onDeleted }) {
  useScrollLock(true);

  const [removed, setRemoved] = useState(() => new Set());
  const [gi, setGi] = useState(startGroup);
  const [si, setSi] = useState(0);
  const [prog, setProg] = useState({ id: null, p: 0 });
  const [holding, setHolding] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState("");
  const press = useRef(null);

  const live = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, stories: g.stories.filter((s) => !removed.has(s.id)) }))
        .filter((g) => g.stories.length),
    [groups, removed]
  );
  const group = live[gi];
  const story = group?.stories[si];
  const paused = holding || confirming || busy;

  function next() {
    if (!group) return onClose();
    if (si < group.stories.length - 1) setSi(si + 1);
    else if (gi < live.length - 1) {
      setGi(gi + 1);
      setSi(0);
    } else onClose();
  }
  function prev() {
    if (si > 0) setSi(si - 1);
    else if (gi > 0) {
      setGi(gi - 1);
      setSi(0);
    } else setProg({ id: null, p: 0 });
  }

  const nav = useRef({ next, prev, onClose });
  useEffect(() => {
    nav.current = { next, prev, onClose };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") nav.current.onClose();
      else if (e.key === "ArrowRight") nav.current.next();
      else if (e.key === "ArrowLeft") nav.current.prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function remove() {
    if (!story) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/stories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: story.id }),
      });
      if (!res.ok) throw new Error();
      const left = group.stories.length - 1;
      setRemoved((r) => new Set(r).add(story.id));
      setConfirming(false);
      if (left > 0) setSi(Math.min(si, left - 1));
      else if (gi < live.length - 1) setSi(0);
      else if (live.length === 1) onClose();
      else {
        setGi(gi - 1);
        setSi(0);
      }
      onDeleted?.();
    } catch {
      setError("Couldn’t delete that story. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!group || !story) return null;
  const current = prog.id === story.id ? prog.p : 0;

  // Hold to pause, tap the left third to go back, anywhere else to skip ahead.
  const stop = (e) => e.stopPropagation();
  function onDown(e) {
    press.current = { t: Date.now(), x: e.clientX };
    setHolding(true);
  }
  function onUp(e) {
    const p = press.current;
    press.current = null;
    setHolding(false);
    if (!p || Date.now() - p.t > 260 || Math.abs(e.clientX - p.x) > 10) return;
    const box = e.currentTarget.getBoundingClientRect();
    if (e.clientX - box.left < box.width / 3) prev();
    else next();
  }

  return (
    <div className="sv-overlay" role="dialog" aria-modal="true" aria-label={`${group.username}’s story`}>
      <button type="button" className="sv-backdrop" onClick={onClose} aria-label="Close stories" tabIndex={-1} />

      <button type="button" className="sv-arrow left" onClick={prev} aria-label="Previous">‹</button>

      <div
        className="sv-frame"
        onPointerDown={onDown}
        onPointerUp={onUp}
        onPointerCancel={() => { press.current = null; setHolding(false); }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <Stage
          key={story.id}
          story={story}
          paused={paused}
          muted={muted}
          onProgress={(p) => setProg({ id: story.id, p })}
          onDone={next}
          onNeedMute={() => setMuted(true)}
        />

        <div className="sv-shade" />

        <div className="sv-bars" aria-hidden="true">
          {group.stories.map((s, i) => (
            <span key={s.id}>
              <i style={{ width: `${i < si ? 100 : i === si ? current * 100 : 0}%` }} />
            </span>
          ))}
        </div>

        <div className="sv-top" onPointerDown={stop} onPointerUp={stop}>
          <div className="sv-who">
            <span
              className="sv-avatar"
              style={{
                backgroundImage: `url(/avatar/${encodeURIComponent(group.username)}), linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))`,
              }}
            />
            <b>{group.mine ? "Your story" : group.username}</b>
            {story.createdAtMs > 0 && <small>{ago(story.createdAtMs)}</small>}
          </div>
          <div className="sv-tools">
            {story.kind === "video" && (
              <button type="button" className="sv-tool" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Mute"}>
                {muted ? "🔇" : "🔊"}
              </button>
            )}
            {story.mine && story.kind !== "gradient" && (
              <button type="button" className="sv-tool" onClick={() => setConfirming(true)} aria-label="Delete story">🗑</button>
            )}
            <button type="button" className="sv-tool" onClick={onClose} aria-label="Close">
              <XIcon />
            </button>
          </div>
        </div>

        {story.caption && <div className="sv-caption">{story.caption}</div>}

        {confirming && (
          <div className="sv-confirm" onPointerDown={stop} onPointerUp={stop}>
            <div className="sv-confirm-card">
              <b>Delete this story?</b>
              <p>It will be removed for everyone.</p>
              {error && <div className="auth-error">{error}</div>}
              <div className="sc-actions">
                <button type="button" className="sc-btn ghost" onClick={() => { setConfirming(false); setError(""); }} disabled={busy}>Keep</button>
                <button type="button" className="sc-btn danger" onClick={remove} disabled={busy}>{busy ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>
        )}
      </div>

      <button type="button" className="sv-arrow right" onClick={next} aria-label="Next">›</button>
    </div>
  );
}
