"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import CommentsSheet from "../CommentsSheet";
import { ComboPill, DailyPanel, HudBar, MissionsSheet } from "./Hud";
import Slide from "./Slide";
import { CrateIcon, DownIcon, UpIcon } from "./icons";
import { tzMinutes, useReelProgress } from "./useReelProgress";
import { comboMultiplier } from "@/lib/videos-config";

const JSON_HEADERS = { "Content-Type": "application/json" };
const SOUND_KEY = "gta6fb:vr-sound";
const MODES = [
  { id: "hot", label: "Hot" },
  { id: "new", label: "New" },
  { id: "following", label: "Following" },
];

const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const reduceMotion = () =>
  document.documentElement.dataset.motion === "reduced" || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 960px)");
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return wide;
}

export default function VideosApp({ signedIn }) {
  const prog = useReelProgress({ signedIn });
  const wide = useWide();

  const [mode, setMode] = useState("hot");
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error | empty
  const [emptyWhy, setEmptyWhy] = useState("");
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null);
  const [hudOpen, setHudOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [note, setNote] = useState("");

  const scroller = useRef(null);
  const itemsRef = useRef(items);
  const activeRef = useRef(0);
  const counted = useRef(new Set()); // clips finished this visit
  const loadId = useRef(0);
  const loadingMore = useRef(false);
  const noteTimer = useRef(0);
  const busyIds = useRef(new Set());
  itemsRef.current = items;

  const say = useCallback((text) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 2600);
  }, []);
  useEffect(() => () => clearTimeout(noteTimer.current), []);

  // Remember the sound choice (storage can be blocked, so every touch is guarded).
  useEffect(() => {
    try {
      if (localStorage.getItem(SOUND_KEY) === "on") setMuted(false);
    } catch {
      // Sound just starts muted.
    }
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      try {
        localStorage.setItem(SOUND_KEY, m ? "on" : "off");
      } catch {
        // Not remembered.
      }
      return !m;
    });
  }, []);
  const onBlocked = useCallback(() => {
    setMuted(true);
    say("Your browser blocked sound. Tap the speaker to turn it on.");
  }, [say]);

  // Pause everything while the tab is in the background.
  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  // ---------------------------------------------------------------- loading
  const fetchPage = useCallback(async (m, cursor) => {
    const qs = new URLSearchParams({ mode: m, tz: String(tzMinutes()) });
    if (cursor) qs.set("cursor", cursor);
    const res = await fetch(`/api/videos?${qs}`, { cache: "no-store" });
    if (!res.ok) throw new Error("load failed");
    return res.json();
  }, []);

  const loadFirst = useCallback(
    async (m) => {
      const id = (loadId.current += 1);
      setState("loading");
      setItems([]);
      setNext(null);
      setActive(0);
      activeRef.current = 0;
      counted.current = new Set();
      scroller.current?.scrollTo({ top: 0, behavior: "auto" });
      try {
        const d = await fetchPage(m, "");
        if (id !== loadId.current) return;
        setItems(d.items);
        setNext(d.next);
        setEmptyWhy(d.empty || "");
        setState(d.items.length ? "ready" : "empty");
      } catch {
        if (id === loadId.current) setState("error");
      }
    },
    [fetchPage]
  );

  useEffect(() => {
    loadFirst(mode);
  }, [mode, loadFirst]);

  const loadMore = useCallback(async () => {
    if (!next || loadingMore.current) return;
    loadingMore.current = true;
    const id = loadId.current;
    try {
      const d = await fetchPage(mode, next);
      if (id !== loadId.current) return;
      setItems((list) => {
        const seen = new Set(list.map((c) => c.id));
        return [...list, ...d.items.filter((c) => !seen.has(c.id))];
      });
      setNext(d.next);
    } catch {
      // The next swipe tries again.
    } finally {
      loadingMore.current = false;
    }
  }, [next, mode, fetchPage]);

  useEffect(() => {
    if (state === "ready" && next && active >= items.length - 4) loadMore();
  }, [active, items.length, next, state, loadMore]);

  // ---------------------------------------------------------------- scrolling
  // The clip that is at least 60% on screen is the active one.
  useEffect(() => {
    const root = scroller.current;
    if (!root || state !== "ready") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        }
      },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll(".vr-slide").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [state, items.length, next]);

  // Swiping away from a clip that never counted breaks the combo.
  const skipped = prog.skipped;
  useEffect(() => {
    const prev = itemsRef.current[activeRef.current];
    if (prev && active !== activeRef.current && !counted.current.has(prev.id)) skipped();
    activeRef.current = active;
  }, [active, skipped]);

  const go = useCallback((delta) => {
    const root = scroller.current;
    if (!root) return;
    const max = root.querySelectorAll(".vr-slide").length - 1;
    const to = Math.max(0, Math.min(max, activeRef.current + delta));
    root.scrollTo({ top: to * root.clientHeight, behavior: reduceMotion() ? "auto" : "smooth" });
  }, []);

  // ---------------------------------------------------------------- actions
  const patch = useCallback((id, fn) => setItems((list) => list.map((c) => (c.id === id ? { ...c, ...fn(c) } : c))), []);

  const toggle = useCallback(
    async (clip, { url, key, countKey, type, label, onlyOn }) => {
      if (!signedIn) return say(`Log in from the menu to ${label}.`);
      const cur = itemsRef.current.find((c) => c.id === clip.id) || clip;
      if (onlyOn && cur[key]) return;
      const busyKey = `${url}:${clip.id}`;
      if (busyIds.current.has(busyKey)) return;
      busyIds.current.add(busyKey);
      const was = cur[key];
      patch(clip.id, (c) => ({ [key]: !was, ...(countKey && c[countKey] !== null ? { [countKey]: Math.max(0, c[countKey] + (was ? -1 : 1)) } : {}) }));
      try {
        const res = await fetch(url, { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ postId: clip.id }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Try again.");
        const now = type === "like" ? d.liked : d.saved;
        patch(clip.id, (c) => ({ [key]: now, ...(countKey && typeof d.likesCount === "number" && c[countKey] !== null ? { [countKey]: d.likesCount } : {}) }));
        if (now) prog.claimed(type, clip.id);
      } catch (err) {
        patch(clip.id, (c) => ({ [key]: was, ...(countKey && c[countKey] !== null ? { [countKey]: Math.max(0, c[countKey] + (was ? 1 : -1)) } : {}) }));
        say(err.message || "That didn’t go through.");
      } finally {
        busyIds.current.delete(busyKey);
      }
    },
    [signedIn, say, patch, prog]
  );

  const onHeat = useCallback(
    (clip, opts = {}) => toggle(clip, { url: "/api/posts/like", key: "likedByMe", countKey: "likes", type: "like", label: "give heat", ...opts }),
    [toggle]
  );
  const onSave = useCallback((clip) => toggle(clip, { url: "/api/posts/save", key: "savedByMe", type: "save", label: "save clips" }), [toggle]);

  const onShare = useCallback(
    async (clip) => {
      const url = `${window.location.origin}/p/${clip.id}`;
      const title = clip.title || `Clip by ${clip.user}`;
      try {
        if (navigator.share) {
          await navigator.share({ title, url });
          prog.claimed("share", clip.id);
          return;
        }
        await navigator.clipboard.writeText(url);
        say("Link copied");
        prog.claimed("share", clip.id);
      } catch (err) {
        if (err?.name !== "AbortError") say("Couldn’t share. Copy the link from the post page.");
      }
    },
    [say, prog]
  );

  const onFinish = useCallback(
    (info) => {
      counted.current.add(info.id);
      prog.finished(info);
    },
    [prog]
  );
  const onPackage = useCallback((clip) => prog.foundPackage(clip.id), [prog]);

  const onComments = useCallback(
    (clip) => {
      if (clip.commentsOff) return;
      setCommentsFor(clip.id);
    },
    []
  );

  // The comment-posted hook: the sheet raises the count when a comment goes up.
  // The claim waits a moment so the comment is saved before the server checks.
  const onCommentCount = useCallback(
    (v) => {
      const id = commentsFor;
      const cur = itemsRef.current.find((c) => c.id === id)?.comments ?? 0;
      const nextCount = Math.max(0, typeof v === "function" ? v(cur) : Number(v) || 0);
      if (nextCount > cur) setTimeout(() => prog.claimed("comment", id), 2500);
      if (id) patch(id, () => ({ comments: nextCount }));
    },
    [commentsFor, patch, prog]
  );

  // ---------------------------------------------------------------- keyboard
  const lastKey = useRef({ k: "", t: 0 });
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const k = e.key;
      const after = lastKey.current;
      lastKey.current = { k, t: Date.now() };
      // "g" then a letter is a site-wide go-to shortcut (see KeyboardShortcuts): stay out of its way.
      if (after.k.toLowerCase() === "g" && Date.now() - after.t < 1500) return;
      const clip = itemsRef.current[activeRef.current];
      if (k === "ArrowDown" || k === "j") (e.preventDefault(), go(1));
      else if (k === "ArrowUp" || k === "k") (e.preventDefault(), go(-1));
      else if (k === " " && e.target === document.body) {
        e.preventDefault();
        scroller.current?.querySelector(".vr-slide.is-active .vr-tap")?.click();
      } else if (k.toLowerCase() === "m") toggleMute();
      else if (k.toLowerCase() === "l" && clip) onHeat(clip);
      else if (k.toLowerCase() === "b" && clip) onSave(clip);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleMute, onHeat, onSave]);

  // ---------------------------------------------------------------- render
  const hold = !!commentsFor || hudOpen || hidden;
  const comboNext = comboMultiplier(prog.chain);
  const sheetClip = useMemo(() => items.find((c) => c.id === commentsFor), [items, commentsFor]);

  return (
    <main id="main" className="vr-root" aria-label="Videos">
      {wide && (
        <aside className="vr-side" aria-label="Rank and missions">
          <DailyPanel view={prog.view} bonus={prog.bonus} signedIn={signedIn} />
        </aside>
      )}

      <div className="vr-stage">
        <div className="vr-top">
          <div className="vr-tabs" role="tablist" aria-label="Clip feed">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? "on" : ""}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>
          <HudBar view={prog.view} bonus={prog.bonus} signedIn={signedIn} panelOpen={hudOpen} onOpen={wide ? undefined : () => setHudOpen(true)} />
          <ComboPill chain={prog.chain} />
        </div>

        <div className="vr-pops" aria-live="polite">
          {prog.pops.map((p) => (
            <p key={p.id} className={`vr-pop vr-pop-${p.kind}`}>
              <b>{p.text}</b>
              {p.sub && <span>{p.sub}</span>}
            </p>
          ))}
        </div>

        {state === "ready" ? (
          <div className="vr-feed" ref={scroller} tabIndex={-1}>
            {items.map((clip, i) => (
              <Slide
                key={clip.id}
                clip={clip}
                index={i}
                active={i === active}
                near={Math.abs(i - active) <= 1}
                muted={muted}
                hold={hold}
                canEarn={signedIn && !clip.own}
                found={prog.found.has(clip.id)}
                comboNext={comboNext}
                onFinish={onFinish}
                onHeat={onHeat}
                onSave={onSave}
                onComments={onComments}
                onShare={onShare}
                onMute={toggleMute}
                onPackage={onPackage}
                onBlocked={onBlocked}
              />
            ))}
            {!next && (
              <section className="vr-slide vr-end" data-index={items.length}>
                <div>
                  <CrateIcon />
                  <h2>That’s the whole reel</h2>
                  <p>New clips land here all day. Check back soon, or drop one of your own.</p>
                  <div className="vr-end-actions">
                    <button type="button" onClick={() => go(-items.length)}>Back to the top</button>
                    <Link href="/create">Post a clip</Link>
                  </div>
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="vr-state" role={state === "error" ? "alert" : "status"}>
            {state === "loading" && (
              <>
                <span className="vr-crate-load"><CrateIcon /></span>
                <p>Loading clips…</p>
              </>
            )}
            {state === "error" && (
              <>
                <h2>Couldn’t load clips</h2>
                <p>Check your connection and try again.</p>
                <button type="button" onClick={() => loadFirst(mode)}>Try again</button>
              </>
            )}
            {state === "empty" && (
              <>
                <h2>{emptyWhy === "login" ? "Log in to see your Following reel" : mode === "following" ? "Nothing from your people yet" : "No clips yet"}</h2>
                <p>
                  {emptyWhy === "login"
                    ? "Use the menu to log in, then follow people to fill this tab."
                    : mode === "following"
                      ? "Follow a few creators, or switch to Hot to see what everyone is watching."
                      : "Be the first. Upload a video and it shows up here."}
                </p>
                {mode === "following" ? (
                  <button type="button" onClick={() => setMode("hot")}>See what’s Hot</button>
                ) : (
                  <Link href="/create">Post a clip</Link>
                )}
              </>
            )}
          </div>
        )}

        {note && (
          <p className="vr-note" role="status">
            {note}
          </p>
        )}
      </div>

      {wide && state === "ready" && (
        <div className="vr-arrows">
          <button type="button" onClick={() => go(-1)} disabled={active <= 0} aria-label="Previous clip">
            <UpIcon />
          </button>
          <button type="button" onClick={() => go(1)} disabled={active >= (next ? items.length - 1 : items.length)} aria-label="Next clip">
            <DownIcon />
          </button>
        </div>
      )}

      {hudOpen && !wide && (
        <MissionsSheet onClose={() => setHudOpen(false)}>
          <DailyPanel view={prog.view} bonus={prog.bonus} signedIn={signedIn} />
        </MissionsSheet>
      )}

      {commentsFor && sheetClip && (
        <CommentsSheet
          postId={sheetClip.id}
          postUser={sheetClip.user}
          count={sheetClip.comments}
          onCountChange={onCommentCount}
          onClose={() => setCommentsFor(null)}
        />
      )}
    </main>
  );
}
