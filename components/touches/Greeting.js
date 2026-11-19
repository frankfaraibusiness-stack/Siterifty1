"use client";

import { useSyncExternalStore } from "react";

// "Good evening, lucia.ray" with today's date, worked out on the visitor's own
// clock (the server doesn't know their time zone). The server render is empty,
// so there is never a mismatch; the line fades in once the browser has the time.
const noopSubscribe = (fn) => {
  const t = setInterval(fn, 5 * 60 * 1000);
  return () => clearInterval(t);
};

function snapshot() {
  const now = new Date();
  const h = now.getHours();
  const part = h < 5 ? "night" : h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  const date = now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
  return `${part}|${date}`;
}

const LINES = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
  night: "Up late",
};

const ICON = {
  morning: <path d="M12 3v2M4.9 6.9l1.4 1.4M3 14h2M19 14h2M17.7 8.3l1.4-1.4M7 18a5 5 0 0 1 10 0M3 18h18" />,
  afternoon: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  evening: <path d="M3 18h18M6 18a6 6 0 0 1 12 0M12 7V5M5 11 3.6 9.6M19 11l1.4-1.4" />,
  night: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
};

export default function Greeting({ name }) {
  const snap = useSyncExternalStore(noopSubscribe, snapshot, () => "");
  if (!snap || !name) return null;
  const [part, date] = snap.split("|");
  return (
    <p className="gr" aria-label={`${LINES[part]}, ${name}. ${date}.`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{ICON[part]}</svg>
      <span className="gr-hi">
        {LINES[part]}, <b>{name}</b>
      </span>
      <span className="gr-date">{date}</span>
    </p>
  );
}
