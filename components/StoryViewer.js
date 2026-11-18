"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { HeartIcon, TrashIcon, VolumeIcon, VolumeOffIcon, XIcon } from "./icons";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { STORY } from "@/lib/story-schema";

function ago(ms) {
  const minutes = Math.floor((Date.now() - ms) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

// Sunset shimmer shown while a story's photo or clip is still on its way,
// the same sweep the page loader uses, instead of the browser's blank frame.
function StorySkeleton() {
  return (
    <div className="sv-skel" role="status" aria-label="Loading story">
      <span className="nl-s sv-skel-fill" />
    </div>
  );
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
  const [vidReady, setVidReady] = useState(false);
  const imgRef = useRef(null);

  // A photo already in the browser cache can finish before React attaches
  // onLoad, so check once on mount.
  useEffect(() => {
    const im = imgRef.current;
    if (im && im.complete && im.naturalWidth > 0) setLoaded(true);
  }, []);

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
      <>
        <video
          ref={videoRef}
          className="sv-media"
          src={`/story/${story.id}`}
          autoPlay
          playsInline
          preload="auto"
          onLoadedData={() => setVidReady(true)}
          onPlaying={() => setVidReady(true)}
          onWaiting={() => setVidReady(false)}
          onTimeUpdate={onTimeUpdate}
          onEnded={finish}
          onError={finish}
        />
        {!vidReady && <StorySkeleton />}
      </>
    );
  }
  if (story.kind === "image") {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          className={`sv-media${loaded ? "" : " sv-pending"}`}
          src={`/story/${story.id}`}
          alt={story.caption || `Story by ${story.username}`}
          onLoad={() => setLoaded(true)}
          onError={finish}
          draggable={false}
        />
        {!loaded && <StorySkeleton />}
      </>
    );
  }
  return (
    <div className="sv-media sv-gradient" style={{ backgroundImage: story.gradient }}>
      <span>@{story.username}</span>
    </div>
  );
}

// `overrides` / `onOverride` keep hearts you just gave (and the owner's latest
// count) in the rail, so reopening a story shows the right state without
// reloading the page.
export default function StoryViewer({ groups, startGroup, onClose, onDeleted, canHeart = false, onNeedAuth, overrides = {}, onOverride = () => {} }) {
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
  const [toast, setToast] = useState("");
  const [sheet, setSheet] = useState(null); // owner's "Liked by" list: null | { id, status, likers, count }
  const [popId, setPopId] = useState(null); // story whose heart is mid-animation
  const heartBusy = useRef(false);
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
  const paused = holding || confirming || busy || !!sheet;

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

  const nav = useRef({ next, prev, onClose, sheet: false, closeSheet: () => {} });
  useEffect(() => {
    nav.current = { next, prev, onClose, sheet: !!sheet, closeSheet: () => setSheet(null) };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") (nav.current.sheet ? nav.current.closeSheet : nav.current.onClose)();
      else if (nav.current.sheet) return;
      else if (e.key === "ArrowRight") nav.current.next();
      else if (e.key === "ArrowLeft") nav.current.prev();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A different story (or person) closes the list; a toast fades by itself.
  if (sheet && sheet.id !== story?.id) setSheet(null);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  async function toggleHeart() {
    if (!story || heartBusy.current) return;
    if (!canHeart) return onNeedAuth?.();
    heartBusy.current = true;
    const id = story.id;
    const was = overrides[id]?.liked ?? story.likedByMe;
    onOverride(id, { liked: !was });
    setPopId(!was ? id : null);
    try {
      const res = await fetch("/api/stories/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, liked: !was }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || "");
      }
    } catch (e) {
      onOverride(id, { liked: was });
      setPopId(null);
      // Only the server's own wording is shown; a dropped connection gets a plain line.
      setToast(e instanceof TypeError || !e.message ? "Couldn’t send that heart. Try again." : e.message);
    } finally {
      heartBusy.current = false;
    }
  }

  // Owner only: fresh list of who hearted this story, newest first.
  async function openLikes() {
    if (!story) return;
    const id = story.id;
    setSheet({ id, status: "loading", likers: [], count: overrides[id]?.likes ?? story.likes ?? 0 });
    try {
      const res = await fetch(`/api/stories/like?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "");
      onOverride(id, { likes: j.count });
      setSheet((cur) => (cur && cur.id === id ? { id, status: "ready", likers: j.likers, count: j.count } : cur));
    } catch {
      setSheet((cur) => (cur && cur.id === id ? { ...cur, status: "error" } : cur));
    }
  }

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
  const liked = overrides[story.id]?.liked ?? story.likedByMe;
  const likeCount = overrides[story.id]?.likes ?? story.likes ?? 0;

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
                {muted ? <VolumeOffIcon /> : <VolumeIcon />}
              </button>
            )}
            {story.mine && story.kind !== "gradient" && (
              <button type="button" className="sv-tool" onClick={() => setConfirming(true)} aria-label="Delete story"><TrashIcon /></button>
            )}
            <button type="button" className="sv-tool" onClick={onClose} aria-label="Close">
              <XIcon />
            </button>
          </div>
        </div>

        {story.caption && <div className="sv-caption">{story.caption}</div>}

        <div className={`sv-bottom${story.mine ? " mine" : ""}`} onPointerDown={stop} onPointerUp={stop}>
          {story.mine ? (
            <button type="button" className="sv-likes" onClick={openLikes} aria-haspopup="dialog">
              <HeartIcon />
              <b>{likeCount}</b>
              <span>{likeCount === 1 ? "heart" : "hearts"}</span>
            </button>
          ) : (
            <button
              key={story.id}
              type="button"
              className={`sv-heart${liked ? " on" : ""}${popId === story.id ? " pop" : ""}`}
              onClick={toggleHeart}
              onAnimationEnd={() => setPopId(null)}
              aria-pressed={liked}
              aria-label={liked ? "Take back your heart" : "Heart this story"}
            >
              <HeartIcon />
            </button>
          )}
        </div>

        {toast && <div className="sv-toast" role="status">{toast}</div>}

        {sheet && (
          <div className="sv-sheet-wrap" onPointerDown={stop} onPointerUp={stop}>
            <button type="button" className="sv-sheet-back" aria-label="Close list" onClick={() => setSheet(null)} tabIndex={-1} />
            <div className="sv-sheet" role="dialog" aria-label="Who hearted this story">
              <header>
                <b>Hearts</b>
                <span>{sheet.count}</span>
                <button type="button" className="sv-tool" onClick={() => setSheet(null)} aria-label="Close list"><XIcon /></button>
              </header>
              {sheet.status === "loading" && <p className="sv-sheet-note">Loading…</p>}
              {sheet.status === "error" && <p className="sv-sheet-note">Couldn’t load the list. <button type="button" onClick={openLikes}>Try again</button></p>}
              {sheet.status === "ready" && sheet.likers.length === 0 && <p className="sv-sheet-note">No hearts yet. They show up here as people give them.</p>}
              {sheet.status === "ready" && sheet.likers.length > 0 && (
                <ul>
                  {sheet.likers.map((l) => (
                    <li key={l.username}>
                      <Link href={`/u/${encodeURIComponent(l.username)}`}>
                        <span className="sv-liker-av" style={{ backgroundImage: `url(/avatar/${encodeURIComponent(l.username)}), linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))` }} />
                        <b>@{l.username}</b>
                        {l.atMs > 0 && <small>{ago(l.atMs)}</small>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

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
