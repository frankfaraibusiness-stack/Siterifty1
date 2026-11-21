"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CommentsSheet from "../CommentsSheet";
import { ComboPill, DailyPanel, HudBar, MissionsSheet } from "./Hud";
import Slide from "./Slide";
import ReelAd, { fetchReelAd } from "./ReelAd";
import ShareSheet from "./ShareSheet";
import { CrateIcon, DownIcon, ExpandIcon, ShrinkIcon, UpIcon } from "./icons";
import { ArrowLeftIcon, VolumeIcon, VolumeOffIcon } from "../icons";
import { tzMinutes, useReelProgress } from "./useReelProgress";
import { comboMultiplier } from "@/lib/videos-config";
import { videoAdGap } from "@/lib/ads";
import { REEL_SOUND_KEY, preloadReach, startingMode } from "@/lib/reels-prefs";

const JSON_HEADERS = { "Content-Type": "application/json" };
const MODES = [
  { id: "foryou", label: "For you" },
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

// `startId`: a clip opened from elsewhere (/videos?v=ID). It plays first, and a Back button
// takes the person to where they came from.
export default function VideosApp({ signedIn, startId = "", canDownload = false, reels }) {
  const router = useRouter();
  const startRef = useRef(startId);
  const prog = useReelProgress({ signedIn });
  const wide = useWide();

  const [mode, setMode] = useState(() => startingMode(reels, startId));
  const [items, setItems] = useState([]);
  const [next, setNext] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | error | empty
  const [emptyWhy, setEmptyWhy] = useState("");
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [commentsFor, setCommentsFor] = useState(null);
  const [hudOpen, setHudOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [shareFor, setShareFor] = useState(null); // clip id whose Share sheet is open
  const [clean, setClean] = useState(false); // full screen: every bit of UI hidden, just the video
  const [peek, setPeek] = useState(false); // the little exit / sound buttons, shown briefly in clean mode
  const [note, setNote] = useState("");
  const [adSeed, setAdSeed] = useState(1); // sets the rhythm of ads for this visit (3, 4 or 5 clips apart)
  const [adMap, setAdMap] = useState({}); // ad slot key -> the ad, or false when nothing is running

  const rootRef = useRef(null);
  const scroller = useRef(null);
  const freeze = useRef(false); // true while the screen is resizing for full screen, so the active clip can't jump
  const settleTimers = useRef([]);
  const reach = preloadReach(reels); // data saver: only the clip being watched gets a <video>
  const itemsRef = useRef(items);
  const feedRef = useRef([]);
  const adAsked = useRef(new Set()); // ad slots already requested (or passed) this load
  const activeRef = useRef(0);
  const counted = useRef(new Set()); // clips finished this visit
  const loadId = useRef(0);
  const loadingMore = useRef(false);
  const noteTimer = useRef(0);
  const busyIds = useRef(new Set());
  itemsRef.current = items;

  // Where the ads go: after every 3 to 5 clips, never before the first clip. Slot -> key, by how many clips come before it.
  const adPlan = useMemo(() => {
    const plan = new Map();
    let sum = 0;
    for (let n = 0; ; n += 1) {
      sum += videoAdGap(adSeed, n);
      if (sum > items.length) break;
      plan.set(sum, `ad-${adSeed}-${n}`);
    }
    return plan;
  }, [adSeed, items.length]);

  // What the swipe feed shows: the clips, with a sponsored card after every 3 to 5 of them. A card only
  // joins once its ad has arrived, and always below the clip being watched, so nothing jumps.
  // `pos` = how many clips come up to and including this entry.
  const feed = useMemo(() => {
    const out = [];
    items.forEach((clip, i) => {
      out.push({ type: "clip", key: clip.id, clip, pos: i + 1 });
      const key = adPlan.get(i + 1);
      if (key && adMap[key] && (i + 1 < items.length || next)) out.push({ type: "ad", key, ad: adMap[key], pos: i + 1 });
    });
    return out;
  }, [items, adPlan, adMap, next]);
  feedRef.current = feed;

  const say = useCallback((text) => {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 2600);
  }, []);
  useEffect(() => () => clearTimeout(noteTimer.current), []);

  // Remember the sound choice (storage can be blocked, so every touch is guarded).
  // This device's own choice wins; with none yet, the account's "Start clips with sound" decides.
  const startWithSound = !!reels?.sound;
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REEL_SOUND_KEY);
      if (saved === "on" || (saved === null && startWithSound)) setMuted(false);
    } catch {
      if (startWithSound) setMuted(false);
    }
  }, [startWithSound]);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      try {
        localStorage.setItem(REEL_SOUND_KEY, m ? "on" : "off");
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
  const fetchPage = useCallback(async (m, cursor, start = "") => {
    const qs = new URLSearchParams({ mode: m, tz: String(tzMinutes()) });
    if (cursor) qs.set("cursor", cursor);
    else if (start) qs.set("start", start);
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
      adAsked.current = new Set();
      setAdMap({});
      setAdSeed(1 + Math.floor(Math.random() * 2_000_000_000));
      scroller.current?.scrollTo({ top: 0, behavior: "auto" });
      try {
        const d = await fetchPage(m, "", m === "hot" || m === "foryou" ? startRef.current : "");
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
    if (state === "ready" && next && active >= feed.length - 4) loadMore();
  }, [active, feed.length, next, state, loadMore]);

  // Fetch an ad when its slot is within 3 clips of where the person is; a slot already passed is dropped.
  useEffect(() => {
    if (state !== "ready") return;
    const here = feedRef.current[active];
    const pos = here ? here.pos : 0;
    adPlan.forEach((key, after) => {
      if (adAsked.current.has(key) || after > items.length) return;
      if (pos > after) {
        adAsked.current.add(key);
        return;
      }
      if (pos < after - 3) return;
      adAsked.current.add(key);
      const gen = loadId.current;
      fetchReelAd().then((ad) => {
        if (gen === loadId.current) setAdMap((mp) => ({ ...mp, [key]: ad || false }));
      });
    });
  }, [active, state, adPlan, items.length]);

  // ---------------------------------------------------------------- scrolling
  // The clip that is at least 60% on screen is the active one.
  useEffect(() => {
    const root = scroller.current;
    if (!root || state !== "ready") return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (freeze.current) return;
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number(e.target.dataset.index));
        }
      },
      { root, threshold: 0.6 }
    );
    root.querySelectorAll(".vr-slide").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [state, feed.length, next]);

  // Swiping away from a clip that never counted breaks the combo.
  const skipped = prog.skipped;
  useEffect(() => {
    const prev = feedRef.current[activeRef.current];
    // Only a clip can break the combo: swiping past an ad costs nothing.
    if (prev?.type === "clip" && active !== activeRef.current && !counted.current.has(prev.clip.id)) skipped();
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

  // Follow / unfollow the creator of a clip. Every clip by that creator updates together, and it rolls back if the server says no.
  const onFollow = useCallback(
    async (clip) => {
      if (!signedIn) return say("Log in from the menu to follow creators.");
      if (clip.own) return;
      const name = clip.user;
      const cur = itemsRef.current.find((c) => c.id === clip.id) || clip;
      const was = !!cur.followed;
      const busyKey = `follow:${name}`;
      if (busyIds.current.has(busyKey)) return;
      busyIds.current.add(busyKey);
      const setFor = (value) => setItems((list) => list.map((c) => (c.user === name ? { ...c, followed: value } : c)));
      setFor(!was);
      try {
        const res = await fetch("/api/social/follow", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify({ username: name, follow: !was }) });
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.error || "Try again.");
        const now = typeof d.following === "boolean" ? d.following : !was;
        setFor(now);
        say(now ? `You followed @${name}` : `You unfollowed @${name}`);
      } catch (err) {
        setFor(was);
        say(err.message || "That didn’t go through.");
      } finally {
        busyIds.current.delete(busyKey);
      }
    },
    [signedIn, say]
  );

  // Share opens the sheet (download for members, the big social apps, copy link).
  const onShare = useCallback((clip) => setShareFor(clip.id), []);
  // Opening a share target or copying the link counts as sharing (paid once a clip a day, see videos-engine).
  const onShared = useCallback((clip) => prog.claimed("share", clip.id), [prog]);

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

  // Back to wherever the person came from on this site (a feed, a profile), else the home feed.
  const goBack = useCallback(() => {
    let fromHere = false;
    try {
      fromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      fromHere = false;
    }
    if (fromHere && window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  // ---------------------------------------------------------------- full screen
  // Full screen hides every bit of UI so the clip can be watched clean. It asks the browser for real
  // full screen where that works (desktop, Android) and otherwise just covers the page (iPhone).
  // Returning brings the UI back. The resize changes the clip height, so the feed is snapped back onto
  // the clip being watched, and the active clip is held still until that is done.
  const settle = useCallback(() => {
    freeze.current = true;
    settleTimers.current.forEach(clearTimeout);
    const realign = () => {
      const r = scroller.current;
      if (r) r.scrollTo({ top: activeRef.current * r.clientHeight, behavior: "auto" });
    };
    settleTimers.current = [
      setTimeout(realign, 60),
      setTimeout(realign, 260),
      setTimeout(() => {
        realign();
        freeze.current = false;
      }, 520),
    ];
  }, []);
  useEffect(() => () => settleTimers.current.forEach(clearTimeout), []);

  const enterClean = useCallback(() => {
    settle();
    setClean(true);
    const el = rootRef.current;
    try {
      const ask = el?.requestFullscreen || el?.webkitRequestFullscreen;
      if (ask) Promise.resolve(ask.call(el)).catch(() => {});
    } catch {
      // No browser full screen here: the cover-the-page version still works.
    }
  }, [settle]);
  const exitClean = useCallback(() => {
    settle();
    setClean(false);
    try {
      const leave = document.exitFullscreen || document.webkitExitFullscreen;
      if (document.fullscreenElement || document.webkitFullscreenElement) Promise.resolve(leave?.call(document)).catch(() => {});
    } catch {
      // Already out.
    }
  }, [settle]);
  const toggleClean = useCallback(() => (clean ? exitClean() : enterClean()), [clean, enterClean, exitClean]);

  // Esc (or the browser's own exit) leaves real full screen: bring the UI back with it.
  useEffect(() => {
    const on = () => {
      settle();
      if (!document.fullscreenElement && !document.webkitFullscreenElement) setClean(false);
    };
    document.addEventListener("fullscreenchange", on);
    document.addEventListener("webkitfullscreenchange", on);
    return () => {
      document.removeEventListener("fullscreenchange", on);
      document.removeEventListener("webkitfullscreenchange", on);
    };
  }, [settle]);

  // In clean mode the exit and sound buttons show for a moment on any touch or mouse move, then fade away.
  useEffect(() => {
    const el = rootRef.current;
    if (!clean || !el) return undefined;
    let t = 0;
    const wake = () => {
      setPeek(true);
      clearTimeout(t);
      t = setTimeout(() => setPeek(false), 2600);
    };
    wake();
    el.addEventListener("pointerdown", wake);
    el.addEventListener("pointermove", wake);
    return () => {
      el.removeEventListener("pointerdown", wake);
      el.removeEventListener("pointermove", wake);
      clearTimeout(t);
      setPeek(false);
    };
  }, [clean]);

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
      const entry = feedRef.current[activeRef.current];
      const clip = entry?.type === "clip" ? entry.clip : null;
      if (k === "ArrowDown" || k === "j") (e.preventDefault(), go(1));
      else if (k === "ArrowUp" || k === "k") (e.preventDefault(), go(-1));
      else if (k === " " && e.target === document.body) {
        e.preventDefault();
        scroller.current?.querySelector(".vr-slide.is-active .vr-tap")?.click();
      } else if (k.toLowerCase() === "m") toggleMute();
      else if (k.toLowerCase() === "f") toggleClean();
      else if (k === "Escape" && clean) exitClean();
      else if (k.toLowerCase() === "l" && clip) onHeat(clip);
      else if (k.toLowerCase() === "b" && clip) onSave(clip);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, toggleMute, toggleClean, exitClean, clean, onHeat, onSave]);

  // ---------------------------------------------------------------- render
  const hold = !!commentsFor || !!shareFor || hudOpen || hidden;
  const comboNext = comboMultiplier(prog.chain);
  const sheetClip = useMemo(() => items.find((c) => c.id === commentsFor), [items, commentsFor]);
  const shareClip = useMemo(() => items.find((c) => c.id === shareFor), [items, shareFor]);

  return (
    <main id="main" ref={rootRef} className={`vr-root${clean ? " is-clean" : ""}`} aria-label="Videos">
      {wide && (
        <aside className="vr-side" aria-label="Rank and missions">
          <DailyPanel view={prog.view} bonus={prog.bonus} signedIn={signedIn} />
        </aside>
      )}

      <div className="vr-stage">
        <div className="vr-top">
          {startId && (
            <button type="button" className="vr-back" onClick={goBack} aria-label="Go back">
              <ArrowLeftIcon />
            </button>
          )}
          <div className="vr-tabs" role="tablist" aria-label="Clip feed">
            {MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={mode === m.id}
                className={mode === m.id ? "on" : ""}
                onClick={() => {
                  startRef.current = ""; // the opened clip only leads the first load
                  setMode(m.id);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button type="button" className="vr-fs" onClick={enterClean} aria-label="Full screen, hide the controls" title="Full screen (F)">
            <ExpandIcon />
          </button>
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
            {feed.map((entry, i) => entry.type === "ad" ? (
              <ReelAd
                key={entry.key}
                ad={entry.ad}
                index={i}
                active={i === active}
                near={Math.abs(i - active) <= reach}
                muted={muted}
                hold={hold}
                onMute={toggleMute}
                onNext={go}
                onBlocked={onBlocked}
              />
            ) : (
              <Slide
                key={entry.key}
                clip={entry.clip}
                index={i}
                number={entry.pos}
                active={i === active}
                near={Math.abs(i - active) <= 1}
                muted={muted}
                hold={hold}
                canEarn={signedIn && !entry.clip.own}
                found={prog.found.has(entry.clip.id)}
                comboNext={comboNext}
                clean={clean}
                onFinish={onFinish}
                onHeat={onHeat}
                onSave={onSave}
                onFollow={onFollow}
                onComments={onComments}
                onShare={onShare}
                onMute={toggleMute}
                onPackage={onPackage}
                onBlocked={onBlocked}
              />
            ))}
            {!next && (
              <section className="vr-slide vr-end" data-index={feed.length}>
                <div>
                  <CrateIcon />
                  <h2>That’s the whole reel</h2>
                  <p>New clips land here all day. Check back soon, or drop one of your own.</p>
                  <div className="vr-end-actions">
                    <button type="button" onClick={() => go(-feed.length)}>Back to the top</button>
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
                <span className="vr-logo-load">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo.webp" alt="GTAFanbase.com" width="540" height="300" fetchPriority="high" draggable={false} />
                </span>
                <span className="vr-logo-bar" aria-hidden="true"><i /></span>
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
                  <button type="button" onClick={() => setMode("foryou")}>See what’s For you</button>
                ) : (
                  <Link href="/create">Post a clip</Link>
                )}
              </>
            )}
          </div>
        )}

        {clean && (
          <div className={`vr-clean-bar${peek ? " show" : ""}`}>
            <button type="button" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Turn sound off"}>
              {muted ? <VolumeOffIcon /> : <VolumeIcon />}
            </button>
            <button type="button" onClick={exitClean} aria-label="Exit full screen" title="Exit full screen (Esc)">
              <ShrinkIcon />
            </button>
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
          <button type="button" onClick={() => go(1)} disabled={active >= (next ? feed.length - 1 : feed.length)} aria-label="Next clip">
            <DownIcon />
          </button>
        </div>
      )}

      {hudOpen && !wide && (
        <MissionsSheet onClose={() => setHudOpen(false)}>
          <DailyPanel view={prog.view} bonus={prog.bonus} signedIn={signedIn} />
        </MissionsSheet>
      )}

      {shareFor && shareClip && (
        <ShareSheet clip={shareClip} signedIn={signedIn} canDownload={canDownload} onShared={onShared} onClose={() => setShareFor(null)} />
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
