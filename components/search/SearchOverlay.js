"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useScrollLock } from "@/lib/use-scroll-lock";
import {
  RECENT_EVENT,
  clearRecent,
  parseRecent,
  readRecentRaw,
  removeRecent,
  saveRecent,
} from "@/lib/recent-searches";
import { readHot, warmHot } from "@/lib/search-hot-client";
import VoiceSearchButton from "../VoiceSearchButton";
import { ArrowLeftIcon, SearchIcon, XIcon } from "../icons";

// The full-screen search screen. Tapping a search bar opens it.
//
//   nothing typed   Recent (this device only) + Hot right now (what everybody
//                   searches most). With no history, Hot topics lead.
//   typing          matches from your history and from the hot keywords, as
//                   you type, with no network request per key press.
//
// Back button / Escape close it; a search replaces the "open" history entry,
// so Back from the results goes straight to where you were.

const subscribe = (fn) => {
  window.addEventListener(RECENT_EVENT, fn);
  window.addEventListener("storage", fn);
  return () => {
    window.removeEventListener(RECENT_EVENT, fn);
    window.removeEventListener("storage", fn);
  };
};

const clean = (s) => String(s || "").replace(/\s+/g, " ").trim().slice(0, 80);

function Clock() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5M12 7.5V12l3 2" />
    </svg>
  );
}
function Fill() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17 17 7 7M7 15V7h8" />
    </svg>
  );
}
function Flame() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3c1 3.2 4.5 5 4.5 9.2A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.8c0-1.6.7-2.7 1.6-3.7.3 1.2.9 1.9 1.7 2.2C10.4 8 10.6 5.4 12 3z" />
      <path d="M12 21a6.5 6.5 0 0 0 6.5-6.5" />
    </svg>
  );
}
function Rise() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 16l6-6 4 4 6-7M15 7h5v5" />
    </svg>
  );
}

// "gta 6 tr" typed -> "gta 6 tr" + bold "ailer"
function Match({ text, q }) {
  if (q && text.toLowerCase().startsWith(q)) {
    return (
      <>
        {text.slice(0, q.length)}
        <b>{text.slice(q.length)}</b>
      </>
    );
  }
  return text;
}

export default function SearchOverlay({ initialValue = "", type, onClose }) {
  const router = useRouter();
  const inputRef = useRef(null);
  const [value, setValue] = useState(initialValue);
  const [hot, setHot] = useState(() => readHot());
  const [active, setActive] = useState(-1);
  const recentRaw = useSyncExternalStore(subscribe, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const marked = useRef(false);

  useScrollLock(true);

  // Close = step back out of the history entry we added (the popstate below
  // then closes), or just close when there is none.
  const close = useCallback(() => {
    if (marked.current && window.history.state?.so) window.history.back();
    else onClose();
  }, [onClose]);

  useEffect(() => {
    try {
      // Keep Next's own state on the entry, or going Back/Forward would reload the page.
      // (Strict Mode runs this twice in development: add the entry only once.)
      if (!window.history.state?.so) window.history.pushState({ ...(window.history.state || {}), so: 1 }, "");
      marked.current = true;
    } catch {}
    const onPop = () => {
      marked.current = false;
      onClose();
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    let live = true;
    warmHot().then((t) => live && setHot(t));
    return () => {
      live = false;
    };
  }, []);

  // Straight into typing; a search that is already there is selected.
  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.select();
  }, []);

  function go(raw) {
    const text = clean(raw);
    if (!text) return;
    saveRecent(text);
    const p = new URLSearchParams({ q: text });
    if (type && type !== "all") p.set("type", type);
    if (marked.current) {
      // Turn the "open" entry into the results page, so Back skips the overlay.
      marked.current = false;
      router.replace(`/search?${p.toString()}`);
    } else {
      router.push(`/search?${p.toString()}`);
    }
    onClose();
  }

  const q = clean(value).toLowerCase();

  // What the list shows, as { id, title, hint, rows } sections.
  const sections = useMemo(() => {
    const hotList = hot || [];
    if (!q) {
      const out = [];
      if (recent.length) out.push({ id: "recent", title: "Recent", rows: recent.map((text) => ({ text, kind: "recent" })) });
      const rows = hotList.slice(0, recent.length ? 8 : 10).map((t, i) => ({ text: t.q, kind: "hot", up: t.up, rank: i + 1 }));
      if (rows.length) {
        out.push({
          id: "hot",
          title: recent.length ? "Hot right now" : "Hot topics",
          hint: "Most searched on GTAFanbase",
          rows,
        });
      }
      return out;
    }
    const rows = [];
    const seen = new Set([q]);
    const add = (text, kind, up) => {
      const k = text.toLowerCase();
      if (seen.has(k)) return;
      seen.add(k);
      rows.push({ text, kind, up });
    };
    for (const r of recent) if (r.toLowerCase().startsWith(q)) add(r, "recent");
    for (const t of hotList) if (t.q.startsWith(q)) add(t.q, "hot", t.up);
    for (const r of recent) if (r.toLowerCase().includes(q)) add(r, "recent");
    for (const t of hotList) if (t.q.split(" ").some((w) => w.startsWith(q))) add(t.q, "hot", t.up);
    return [{ id: "match", rows: rows.slice(0, 8) }];
  }, [q, recent, hot]);

  // One flat list for the arrow keys (the "Search for ..." row is index 0 while typing).
  const flat = useMemo(() => {
    const rows = sections.flatMap((s) => s.rows);
    return q ? [{ text: clean(value), kind: "go" }, ...rows] : rows;
  }, [sections, q, value]);

  function onInputKey(e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!flat.length) return;
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (a + step + flat.length + (a < 0 && step < 0 ? 1 : 0)) % flat.length);
    } else if (e.key === "Enter" && active >= 0 && flat[active]) {
      e.preventDefault();
      go(flat[active].text);
    }
  }

  function fill(text) {
    setValue(text);
    setActive(-1);
    inputRef.current?.focus({ preventScroll: true });
  }

  let n = q ? 1 : 0; // running index into `flat`
  const row = (r) => {
    const i = n++;
    return (
      <li key={`${r.kind}:${r.text}`} className={`so-row${i === active ? " is-active" : ""}${r.kind === "hot" && r.rank && r.rank <= 3 ? ` so-top${r.rank}` : ""}`}>
        <button type="button" className="so-main" onClick={() => go(r.text)} onMouseEnter={() => setActive(i)}>
          {r.kind === "hot" && r.rank ? (
            <span className="so-rank" aria-label={`Number ${r.rank}`}>{r.rank}</span>
          ) : (
            <span className="so-ico">{r.kind === "recent" ? <Clock /> : <Flame />}</span>
          )}
          <span className="so-text">
            <Match text={r.text} q={q} />
          </span>
          {r.up && (
            <span className="so-up" title="Rising fast">
              <Rise />
              Rising
            </span>
          )}
        </button>
        {r.kind === "recent" && !q && (
          <button type="button" className="so-act" onClick={() => removeRecent(r.text)} aria-label={`Remove ${r.text} from recent searches`}>
            <XIcon />
          </button>
        )}
        <button type="button" className="so-act" onClick={() => fill(r.text)} aria-label={`Use ${r.text} in the search box`}>
          <Fill />
        </button>
      </li>
    );
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="so" role="dialog" aria-modal="true" aria-label="Search">
      <div className="so-glow" aria-hidden="true" />
      <form
        className="so-bar"
        role="search"
        action="/search"
        method="get"
        onSubmit={(e) => {
          e.preventDefault();
          // Read the box itself: voice search fills it without going through React.
          go(inputRef.current?.value ?? value);
        }}
      >
        <button type="button" className="so-back" onClick={close} aria-label="Close search">
          <ArrowLeftIcon />
        </button>
        <div className="so-field">
          <span className="so-field-icon" aria-hidden="true">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            className="so-input"
            type="search"
            name="q"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setActive(-1);
            }}
            onKeyDown={onInputKey}
            placeholder="Search posts, people, #tags"
            maxLength={80}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-label="Search GTAFanbase"
          />
          {value && (
            <button type="button" className="so-clear" onClick={() => fill("")} aria-label="Clear">
              <XIcon />
            </button>
          )}
        </div>
        <VoiceSearchButton />
        {type && type !== "all" && <input type="hidden" name="type" value={type} />}
      </form>

      <div className="so-body">
        <div className="so-col">
          {q && (
            <ul className="so-list">
              <li className={`so-row so-go${active === 0 ? " is-active" : ""}`}>
                <button type="button" className="so-main" onClick={() => go(value)} onMouseEnter={() => setActive(0)}>
                  <span className="so-ico">
                    <SearchIcon />
                  </span>
                  <span className="so-text">
                    Search for <b>“{clean(value)}”</b>
                  </span>
                </button>
              </li>
            </ul>
          )}

          {sections.map((s) => (
            <section key={s.id} className={`so-sec so-sec-${s.id}`}>
              {s.title && (
                <header className="so-head">
                  <div>
                    <h2>
                      {s.id === "hot" && (
                        <span className="so-flame">
                          <Flame />
                        </span>
                      )}
                      {s.title}
                    </h2>
                    {s.hint && <p>{s.hint}</p>}
                  </div>
                  {s.id === "recent" && (
                    <button type="button" className="so-clearall" onClick={clearRecent}>
                      Clear all
                    </button>
                  )}
                </header>
              )}
              <ul className="so-list">{s.rows.map(row)}</ul>
            </section>
          ))}

          {!q && hot === null && (
            <div className="so-skel" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
