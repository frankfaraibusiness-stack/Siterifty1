"use client";

import { useEffect, useRef } from "react";
import { XIcon } from "../icons";
import { FlameIcon, TargetIcon } from "./icons";
import { COMBO_MAX, RANKS, comboMultiplier, rankFor } from "@/lib/videos-config";

const fmt = (n) => Math.max(0, Math.round(n)).toLocaleString("en-US");

// Top-left of the screen, like the money counter in the game: your XP, your
// rank and how far to the next one, and your daily streak. Tap it for missions.
export function HudBar({ view, bonus, signedIn, onOpen, panelOpen }) {
  if (!signedIn) {
    return (
      <p className="vr-hud vr-hud-guest">
        <b>Guest</b>
        <span>Log in from the menu to earn XP</span>
      </p>
    );
  }
  const xp = (view?.xp || 0) + bonus;
  const rank = rankFor(xp);
  const Tag = onOpen ? "button" : "p";
  const btn = onOpen
    ? { type: "button", onClick: onOpen, "aria-haspopup": "dialog", "aria-expanded": panelOpen, "aria-label": `${fmt(xp)} XP, rank ${rank.name}. Open missions` }
    : {};
  return (
    <Tag className="vr-hud" {...btn}>
      <span className="vr-xp">
        <b>{fmt(xp)}</b>
        <small>XP</small>
      </span>
      <span className="vr-rank">
        <span className="vr-rank-name">{rank.name}</span>
        <span className="vr-meter" aria-hidden="true">
          <i style={{ width: `${rank.pct}%` }} />
        </span>
      </span>
      {view?.streak > 0 && (
        <span className="vr-streak" title={`${view.streak}-day streak`}>
          <FlameIcon />
          {view.streak}
        </span>
      )}
    </Tag>
  );
}

// The combo multiplier, shown once it is worth bragging about.
export function ComboPill({ chain }) {
  const mult = comboMultiplier(chain);
  if (mult < 2) return null;
  const toNext = mult >= COMBO_MAX ? 0 : 2 - (chain % 2);
  return (
    <p className="vr-combo" key={mult} aria-live="polite">
      <b>Combo ×{mult}</b>
      <span>{mult >= COMBO_MAX ? "Max combo" : `${toNext} more for ×${mult + 1}`}</span>
    </p>
  );
}

function Mission({ m }) {
  const pct = Math.round((m.progress / m.goal) * 100);
  return (
    <li className={`vr-mission${m.done ? " done" : ""}`}>
      <div className="vr-mission-top">
        <span className="vr-mission-title">{m.title}</span>
        <span className="vr-mission-xp">{m.done ? "Passed" : `+${m.xp} XP`}</span>
      </div>
      <p>{m.text}</p>
      <div className="vr-bar" role="progressbar" aria-valuemin={0} aria-valuemax={m.goal} aria-valuenow={m.progress} aria-label={m.title}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <small>
        {m.progress} / {m.goal}
      </small>
    </li>
  );
}

// Rank, streak and the three daily missions. A side panel on desktop, a bottom
// sheet on phones (the parent decides which).
export function DailyPanel({ view, bonus, signedIn, heading = true }) {
  if (!signedIn) {
    return (
      <div className="vr-panel">
        {heading && <h2>Vice Reel</h2>}
        <p className="vr-panel-lead">Watch clips to the end, find Hidden Packages and climb eight ranks, from Tourist to Vice Legend.</p>
        <p className="vr-panel-lead">Log in from the menu to start earning XP and clearing daily missions.</p>
        <Ladder xp={0} />
      </div>
    );
  }
  if (!view) {
    return (
      <div className="vr-panel" aria-busy="true">
        {heading && <h2>Today</h2>}
        <p className="vr-panel-lead">Loading your missions…</p>
      </div>
    );
  }
  const xp = view.xp + bonus;
  const rank = rankFor(xp);
  const left = Math.max(0, view.streakGoal - view.streakClips);
  return (
    <div className="vr-panel">
      {heading && <h2>Today</h2>}

      <section className="vr-card vr-card-rank" aria-label="Rank">
        <p className="vr-rank-big">{rank.name}</p>
        <p className="vr-card-sub">
          {rank.next ? `${fmt(rank.span - rank.into)} XP to ${rank.next}` : "Top rank. Nothing left to climb."}
        </p>
        <div className="vr-bar thick" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={rank.pct} aria-label="Progress to next rank">
          <i style={{ width: `${rank.pct}%` }} />
        </div>
      </section>

      <section className="vr-card" aria-label="Daily streak">
        <div className="vr-card-row">
          <span className="vr-card-title">
            <FlameIcon />
            {view.streak > 0 ? `${view.streak}-day streak` : "No streak yet"}
          </span>
          <span className="vr-card-sub">Best {view.bestStreak}</span>
        </div>
        <div className="vr-pips" aria-hidden="true">
          {Array.from({ length: view.streakGoal }, (_, i) => (
            <i key={i} className={i < view.streakClips ? "on" : ""} />
          ))}
        </div>
        <p className="vr-card-sub">
          {view.streakSafe
            ? "Streak locked in for today."
            : `Finish ${left} more clip${left === 1 ? "" : "s"} today to ${view.streak > 0 ? "keep it going" : "start one"}.`}
        </p>
      </section>

      <section aria-label="Daily missions">
        <h3 className="vr-sub">
          <TargetIcon />
          Daily missions
        </h3>
        <ul className="vr-missions">
          {view.missions.map((m) => (
            <Mission key={m.id} m={m} />
          ))}
        </ul>
      </section>

      <p className="vr-fine">
        {fmt(view.today.xp)} of {fmt(view.today.cap)} daily XP from clips. Missions pay on top.
        {view.today.packages > 0 ? ` ${view.today.packages} package${view.today.packages === 1 ? "" : "s"} found today.` : ""}
      </p>
      <p className="vr-fine">About one clip in six hides a package. Tap it when it floats in.</p>
    </div>
  );
}

function Ladder({ xp }) {
  const here = rankFor(xp).level;
  return (
    <ol className="vr-ladder" aria-label="Ranks">
      {RANKS.map((r, i) => (
        <li key={r.name} className={i + 1 <= here ? "reached" : ""}>
          <span>{r.name}</span>
          <small>{fmt(r.xp)} XP</small>
        </li>
      ))}
    </ol>
  );
}

// The phone version: a bottom sheet with focus kept inside and Esc to close.
export function MissionsSheet({ onClose, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const prev = document.activeElement;
    ref.current?.focus();
    const key = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("keydown", key);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="vr-sheet-wrap" onClick={onClose}>
      <div
        className="vr-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Missions and rank"
        tabIndex={-1}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="vr-sheet-x" onClick={onClose} aria-label="Close">
          <XIcon />
        </button>
        {children}
      </div>
    </div>
  );
}
