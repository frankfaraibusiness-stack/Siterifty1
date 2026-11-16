"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { setAiBubble } from "@/lib/look";

// Floating "AI" chat bubble, sticky in the bottom-left corner.
// DESIGN ONLY for now: the bubble itself is not a button and opens nothing. It
// just looks alive: it floats, blinks, its eyes follow the pointer, stars orbit
// it and the little XP ring keeps filling (motion lives in app/aibubble.css and
// stops for people who choose reduced motion).
//
// The one thing you can press is the small X on its top corner. It asks:
//   Just this session  -> hidden until this tab is closed (sessionStorage)
//   Never show again   -> hidden for good: a cookie on this device (so the server
//                         leaves it out of the next page) plus, when signed in,
//                         look.aiBubble on the account. Settings > City Look turns it back on.
const SESSION_KEY = "gta6fb_ai_bubble_session";

export default function AiBubble({ signedIn = false }) {
  const root = useRef(null);
  const xBtn = useRef(null);
  const firstChoice = useRef(null);
  const toastTimer = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [sessionHidden, setSessionHidden] = useState(false);
  const [asking, setAsking] = useState(false);
  const [toast, setToast] = useState("");

  // Only draw after mount, once we know whether this tab already hid it.
  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SESSION_KEY) === "1") setSessionHidden(true);
    } catch {
      // storage blocked: just show it
    }
    setMounted(true);
    return () => clearTimeout(toastTimer.current);
  }, []);

  const say = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(""), 4500);
  }, []);

  function hideForSession() {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // still hides for as long as this page stays open
    }
    setAsking(false);
    setSessionHidden(true);
    say("AI chat hidden for this session. It comes back next time you visit.");
  }

  function hideForever() {
    setAiBubble("hide");
    setAsking(false);
    say("AI chat hidden. Turn it back on any time in Settings, City Look.");
    if (signedIn) {
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "look", patch: { aiBubble: "hide" } }),
        keepalive: true,
      }).catch(() => {});
    }
  }

  // While the question is open: Escape or a tap outside closes it, and focus
  // starts on the first choice.
  useEffect(() => {
    if (!asking) return undefined;
    firstChoice.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") {
        setAsking(false);
        xBtn.current?.focus();
      }
    }
    function onDown(e) {
      if (!root.current?.contains(e.target)) setAsking(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [asking]);

  // Pupils follow the pointer. Writes two CSS variables straight onto the
  // element (no React re-render), throttled to one update per frame.
  useEffect(() => {
    const el = root.current;
    if (!mounted || sessionHidden || !el) return undefined;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || document.documentElement.dataset.motion === "reduced") return undefined;

    let frame = 0;
    let last = null;
    function apply() {
      frame = 0;
      if (!last) return;
      const r = el.getBoundingClientRect();
      const dx = last.x - (r.left + r.width / 2);
      const dy = last.y - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy) || 1;
      const pull = Math.min(1, dist / 220) * 2.4; // max pupil travel in px
      el.style.setProperty("--ai-px", `${((dx / dist) * pull).toFixed(2)}px`);
      el.style.setProperty("--ai-py", `${((dy / dist) * pull).toFixed(2)}px`);
    }
    function onMove(e) {
      last = { x: e.clientX, y: e.clientY };
      if (!frame) frame = requestAnimationFrame(apply);
    }
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [mounted, sessionHidden]);

  const toastEl = toast ? (
    <div className="pf-toast ai-toast" role="status">
      {toast}
    </div>
  ) : null;

  if (!mounted || sessionHidden) return toastEl;

  return (
    <>
    <div ref={root} className={`ai-bubble${asking ? " is-asking" : ""}`}>
      {/* small speech bubble that pops in and out */}
      <span className="ai-hello" aria-hidden="true">
        <span className="ai-hello-a">Hi, I’m AI</span>
        <span className="ai-hello-b">Chat soon</span>
      </span>

      <span className="ai-orb">
        {/* soft pulsing glow behind everything */}
        <span className="ai-glow" aria-hidden="true" />

        {/* orbiting stars */}
        <span className="ai-orbit" aria-hidden="true">
          <i className="ai-star s1" />
          <i className="ai-star s2" />
          <i className="ai-star s3" />
        </span>

        <svg className="ai-svg" viewBox="0 0 80 80" role="img" aria-label="AI chat, coming soon">
          <defs>
            <linearGradient id="aiBody" x1="8" y1="6" x2="72" y2="74" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#ff3d7f" />
              <stop offset=".55" stopColor="#b07bff" />
              <stop offset="1" stopColor="#2de2c5" />
            </linearGradient>
            <linearGradient id="aiRing" x1="0" y1="0" x2="80" y2="80" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#cdfa4c" />
              <stop offset="1" stopColor="#2de2c5" />
            </linearGradient>
          </defs>

          {/* XP ring: track + a progress arc that keeps filling */}
          <circle cx="40" cy="40" r="37" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="3" />
          <circle
            className="ai-xp"
            cx="40"
            cy="40"
            r="37"
            fill="none"
            stroke="url(#aiRing)"
            strokeWidth="3"
            strokeLinecap="round"
            pathLength="100"
            transform="rotate(-90 40 40)"
          />

          {/* chat-bubble body with a tail at the bottom-left */}
          <path
            d="M40 12c15.5 0 27 9.6 27 22.5S55.5 57 40 57c-2.600 0-5.100-.3-7.4-.8L21 63.5c-1 .7-2.3-.1-2-1.3l2.2-9.2C16.3 49.3 13 42.5 13 34.5 13 21.600 24.500 12 40 12z"
            fill="url(#aiBody)"
          />
          {/* gloss */}
          <path d="M22 28c3-8 11-12.500 20-12" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="3" strokeLinecap="round" />

          {/* face */}
          <g className="ai-face">
            <g className="ai-eyes">
              <g className="ai-eye">
                <ellipse cx="31.5" cy="34" rx="5.2" ry="6" fill="#fff" />
                <circle className="ai-pupil" cx="31.5" cy="34.5" r="2.8" fill="#1b1925" />
              </g>
              <g className="ai-eye">
                <ellipse cx="48.5" cy="34" rx="5.2" ry="6" fill="#fff" />
                <circle className="ai-pupil" cx="48.5" cy="34.5" r="2.8" fill="#1b1925" />
              </g>
            </g>
            <path className="ai-mouth" d="M33.5 44.5c2 2.6 11 2.6 13 0" fill="none" stroke="#1b1925" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="24.500" cy="43" r="3" fill="#ff3d7f" opacity=".45" />
            <circle cx="55.500" cy="43" r="3" fill="#ff3d7f" opacity=".45" />
          </g>

          {/* antenna spark */}
          <g className="ai-ant">
            <path d="M40 12V6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="40" cy="4.5" r="3" fill="#cdfa4c" />
          </g>
        </svg>

        {/* the label that says what it is */}
        <span className="ai-tag" aria-hidden="true">AI</span>
        {/* gamified level badge */}
        <span className="ai-lv" aria-hidden="true">LV 1</span>

        {/* the only thing you can press: hide the bubble */}
        <button
          ref={xBtn}
          type="button"
          className="ai-x"
          aria-label="Hide the AI chat bubble"
          aria-expanded={asking}
          aria-controls="ai-ask"
          onClick={() => setAsking((v) => !v)}
        >
          <svg viewBox="0 0 12 12" aria-hidden="true">
            <path d="M2.5 2.5l7 7M9.5 2.5l-7 7" />
          </svg>
        </button>
      </span>

      {asking && (
        <div id="ai-ask" className="ai-ask" role="dialog" aria-label="Hide the AI chat bubble?">
          <p className="ai-ask-title">Hide the AI bubble?</p>
          <button ref={firstChoice} type="button" className="ai-ask-btn" onClick={hideForSession}>
            <b>Just this session</b>
            <small>It comes back next time you visit</small>
          </button>
          <button type="button" className="ai-ask-btn" onClick={hideForever}>
            <b>Never show it again</b>
            <small>Turn it back on in Settings</small>
          </button>
          <button type="button" className="ai-ask-keep" onClick={() => setAsking(false)}>
            Keep it
          </button>
        </div>
      )}
    </div>
    {toastEl}
    </>
  );
}
