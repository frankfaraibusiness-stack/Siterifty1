"use client";

import { useEffect, useRef, useState } from "react";

// The boot screen: shown when the app is starting up (a full page load / first
// open), NOT on in-app navigation (that is NavLoader). It is rendered into the
// server HTML, so it is on screen from the very first paint, then it waits for
// the app to hydrate, the page and fonts to finish loading, and fades out.
// If JavaScript never starts, a CSS failsafe in globals.css hides it anyway.

const STAGES = [
  { pct: 14, text: "Starting the engine" },
  { pct: 48, text: "Connecting to Leonida" },
  { pct: 84, text: "Loading the fanbase" },
  { pct: 100, text: "Welcome to Leonida" },
];

// Skyline tile (400 x 150), repeated across the screen by an SVG pattern.
const BUILDINGS = [
  [0, 26, 70], [26, 22, 96], [48, 30, 60], [78, 20, 110], [98, 34, 78],
  [132, 24, 124], [156, 28, 90], [184, 22, 64], [206, 30, 100], [236, 24, 134],
  [260, 32, 82], [292, 22, 112], [314, 30, 70], [344, 24, 92], [368, 32, 64],
];

const STARS = [
  [8, 9, 2, 0], [19, 22, 3, 0.8], [31, 7, 2, 1.6], [44, 16, 2, 0.4], [58, 6, 3, 1.1],
  [69, 19, 2, 2.0], [81, 10, 3, 0.2], [92, 24, 2, 1.4], [14, 33, 2, 1.9], [88, 38, 2, 0.6],
];

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function Palm({ className }) {
  return (
    <svg className={className} viewBox="-62 -92 124 98" aria-hidden="true">
      <path d="M0 6C4-22 3-52-5-72" fill="none" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
      <g fill="currentColor" transform="translate(-5 -72)">
        <path d="M0 0C-15-14-36-13-52 2-33-5-16-6 0 0z" />
        <path d="M0 0C15-15 36-14 52 1 33-5 16-6 0 0z" />
        <path d="M0 0C-10-20-25-30-45-30-29-23-15-13 0 0z" />
        <path d="M0 0C10-20 25-30 45-30 29-23 15-13 0 0z" />
        <path d="M0 0C-2-17-1-32 4-46 5-30 3-15 0 0z" />
        <path d="M0 0C-12-8-30-3-42 14-26 4-12 2 0 0z" />
        <path d="M0 0C12-8 30-3 42 14 26 4 12 2 0 0z" />
      </g>
    </svg>
  );
}

export default function BootScreen() {
  const [stage, setStage] = useState(0);
  const [phase, setPhase] = useState("on"); // on -> leaving -> gone
  const [shown, setShown] = useState(STAGES[0].pct);
  const target = useRef(STAGES[0].pct);

  // Progress follows the real stages, easing toward each target.
  useEffect(() => {
    target.current = STAGES[stage].pct;
  }, [stage]);

  useEffect(() => {
    if (phase === "gone") return undefined;
    let raf = 0;
    const tick = () => {
      setShown((v) => {
        const t = target.current;
        const next = v + (t - v) * 0.085;
        return Math.abs(t - next) < 0.25 ? t : next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("booting");

    let alive = true;
    const timers = [];
    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    let seen = false;
    try {
      seen = sessionStorage.getItem("g6-booted") === "1";
    } catch {}
    // A little longer the first time in a session, quick on later reloads.
    const minMs = seen ? 750 : 1800;

    const fonts = document.fonts?.ready ?? Promise.resolve();
    const loaded =
      document.readyState === "complete"
        ? Promise.resolve()
        : new Promise((res) => window.addEventListener("load", res, { once: true }));

    // 1: the app has started (hydrated)
    later(() => alive && setStage((s) => Math.max(s, 1)), 350);

    // 2: page + fonts are in
    Promise.all([loaded, fonts, wait(minMs * 0.45)]).then(() => {
      if (alive) setStage((s) => Math.max(s, 2));
    });

    let finished = false;
    const finish = () => {
      if (!alive || finished) return;
      finished = true;
      setStage(3);
      try {
        sessionStorage.setItem("g6-booted", "1");
      } catch {}
      later(() => alive && setPhase("leaving"), 520);
      later(() => alive && setPhase("gone"), 1200);
    };

    // 3: everything ready (never wait more than 7s, whatever is slow)
    Promise.all([loaded, fonts, wait(minMs)]).then(finish);
    later(finish, 7000);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      root.classList.remove("booting");
    };
  }, []);

  // Release the scroll lock as soon as the screen is gone.
  useEffect(() => {
    if (phase === "gone") document.documentElement.classList.remove("booting");
  }, [phase]);

  if (phase === "gone") return null;

  const pct = Math.round(shown);

  return (
    <div
      className={`boot${phase === "leaving" ? " is-leaving" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Loading GTA6 FanBase"
    >
      <div className="boot-stars" aria-hidden="true">
        {STARS.map(([x, y, s, d], i) => (
          <i key={i} style={{ left: `${x}%`, top: `${y}%`, width: s, height: s, animationDelay: `${d}s` }} />
        ))}
      </div>

      <div className="boot-sun" aria-hidden="true" />

      <svg className="boot-city" aria-hidden="true" preserveAspectRatio="none">
        <defs>
          <linearGradient id="bootBld" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3a1665" />
            <stop offset="1" stopColor="#0d0517" />
          </linearGradient>
          <pattern id="bootTile" width="400" height="150" patternUnits="userSpaceOnUse">
            {BUILDINGS.map(([x, w, h], i) => (
              <rect key={i} x={x} y={150 - h} width={w} height={h} fill="url(#bootBld)" />
            ))}
            <rect x="89" y="28" width="2" height="12" fill="#3a1665" />
            <rect x="143" y="14" width="2" height="12" fill="#3a1665" />
            <rect x="247" y="2" width="2" height="12" fill="#3a1665" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bootTile)" />
      </svg>

      <Palm className="boot-palm boot-palm-l" />
      <Palm className="boot-palm boot-palm-r" />

      <div className="boot-core">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="boot-logo"
          src="/logo-boot.webp"
          alt="GTA6 FanBase.com"
          width="720"
          height="480"
          fetchPriority="high"
        />

        <div className="boot-meter">
          <div className="boot-track" aria-hidden="true">
            <div className="boot-fill" style={{ width: `${shown}%` }} />
          </div>
          <div className="boot-status">
            <span key={stage} className="boot-text">
              {STAGES[stage].text}
            </span>
            <span className="boot-pct" aria-hidden="true">
              {pct}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
