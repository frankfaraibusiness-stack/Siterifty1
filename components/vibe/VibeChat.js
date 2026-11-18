"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import VibeMessage from "./VibeMessage";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { CATEGORIES, answerFor, categoryLabel, entriesIn, getEntry, nextFor, search } from "@/lib/vibe/library";
import { VIBE } from "@/lib/vibe/facts";

// Vibe, the built-in guide. You pick a question (or search the list) and Vibe
// answers from the library in lib/vibe. There is no outside AI service: nothing
// typed here leaves the browser, and nothing is stored on the server.
//
// XP is just for fun (see the "What are XP and levels" answer): +10 per question,
// +25 the first time you open a topic. It lives in this tab's memory, so it
// survives closing the panel and moving between pages, and is gone when the tab closes.
const LEVELS = [
  { name: "Street Rookie", at: 0 },
  { name: "Corner Hustler", at: 40 },
  { name: "Vice Local", at: 100 },
  { name: "Wheelman", at: 180 },
  { name: "Kingpin", at: 300 },
  { name: "Leonida Legend", at: 450 },
];
const levelOf = (xp) => LEVELS.reduce((n, l, i) => (xp >= l.at ? i : n), 0);

const GREETING = {
  id: "hi",
  who: "vibe",
  blocks: [
    { t: "p", x: `Hey, I’m **${VIBE.name}**, your Leonida guide. Ask me about GTA 6, the series, or how this site works.` },
    { t: "p", x: "Tap a question below, or search the list. Every answer is free and instant." },
  ],
  next: ["who-is-vibe", "what-can-i-do", "gta6-release", "site-tour"],
};

// Survives closing the panel and client-side navigation; gone on reload.
const session = { messages: [GREETING], xp: 0, cats: [], seq: 0 };

export default function VibeChat({ onClose }) {
  const [messages, setMessages] = useState(session.messages);
  const [xp, setXp] = useState(session.xp);
  const [cats, setCats] = useState(session.cats);
  const [open, setOpen] = useState(session.messages.length <= 1);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [narrow, setNarrow] = useState(false);
  const panel = useRef(null);
  const log = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 600px)");
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useScrollLock(narrow); // full-width sheet on phones: keep the page still behind it

  useEffect(() => {
    session.messages = messages;
    session.xp = xp;
    session.cats = cats;
  }, [messages, xp, cats]);

  useEffect(() => {
    panel.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    const el = log.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? "auto" : "smooth" });
  }, [messages]);

  const ask = useCallback(
    (id) => {
      const entry = getEntry(id);
      if (!entry) return;
      const newDistrict = !cats.includes(entry.cat);
      const gained = 10 + (newDistrict ? 25 : 0);
      const before = levelOf(xp);
      const after = levelOf(xp + gained);
      const n = ++session.seq;
      setMessages((m) => [
        ...m,
        { id: `u${n}`, who: "user", text: entry.q },
        {
          id: `v${n}`,
          who: "vibe",
          blocks: answerFor(id, { now: Date.now() }),
          next: nextFor(entry).map((e) => e.id),
          gain: { xp: gained, district: newDistrict ? categoryLabel(entry.cat) : "", level: after > before ? LEVELS[after].name : "" },
        },
      ]);
      setXp((x) => x + gained);
      if (newDistrict) setCats((c) => [...c, entry.cat]);
      setOpen(false);
      setQuery("");
    },
    [cats, xp]
  );

  const level = levelOf(xp);
  const nextLevel = LEVELS[level + 1];
  const pct = nextLevel ? Math.round(((xp - LEVELS[level].at) / (nextLevel.at - LEVELS[level].at)) * 100) : 100;
  const list = query.trim() ? search(query) : entriesIn(cat);

  return (
    <div className="vb" role="dialog" aria-modal={narrow} aria-label={`${VIBE.name}, ${VIBE.role}`} ref={panel} tabIndex={-1}>
      <header className="vb-head">
        <span className="vb-avatar" aria-hidden="true">V</span>
        <div className="vb-id">
          <b>{VIBE.name}</b>
          <small>{VIBE.role}</small>
        </div>
        <div className="vb-xp" title={nextLevel ? `${nextLevel.at - xp} XP to ${nextLevel.name}` : "Top level"}>
          <span>LV {level + 1} · {LEVELS[level].name}</span>
          <div className="vb-xp-bar" role="progressbar" aria-label="XP to the next level" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <button type="button" className="vb-close" aria-label="Close Vibe" onClick={onClose}>
          <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 2.5l7 7M9.5 2.5l-7 7" /></svg>
        </button>
      </header>

      <div className="vb-log" ref={log} role="log" aria-live="polite">
        {messages.map((m) =>
          m.who === "user" ? (
            <div key={m.id} className="vb-msg me"><p>{m.text}</p></div>
          ) : (
            <div key={m.id} className="vb-msg vibe">
              <VibeMessage blocks={m.blocks} onAsk={ask} close={onClose} />
              {m.gain && (
                <p className="vb-gain">
                  +{m.gain.xp} XP{m.gain.district ? ` · new district: ${m.gain.district}` : ""}
                  {m.gain.level ? ` · level up: ${m.gain.level}` : ""}
                </p>
              )}
              {m.next?.length > 0 && (
                <div className="vb-next">
                  <small>Ask next</small>
                  {m.next.map((id) => {
                    const e = getEntry(id);
                    return e ? <button key={id} type="button" onClick={() => ask(id)}>{e.q}</button> : null;
                  })}
                </div>
              )}
            </div>
          )
        )}
      </div>

      <div className={`vb-dock${open ? " open" : ""}`}>
        <div className="vb-bar">
          <label className="vb-search">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
            <input
              type="search"
              value={query}
              placeholder="Search the questions"
              aria-label="Search the questions"
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
            />
          </label>
          <button type="button" className="vb-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
            {open ? "Hide" : "Questions"}
          </button>
        </div>
        {open && (
          <>
            {!query.trim() && (
              <div className="vb-cats" role="group" aria-label="Topics">
                <button type="button" className={!cat ? "on" : ""} onClick={() => setCat("")}>All</button>
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>{c.label}</button>
                ))}
              </div>
            )}
            {list.length > 0 ? (
              <ul className="vb-list">
                {list.map((e) => (
                  <li key={e.id}><button type="button" onClick={() => ask(e.id)}>{e.q}</button></li>
                ))}
              </ul>
            ) : (
              <p className="vb-none">Nothing matches that. Try other words, or tell the team on the contact page and it may join the list.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
