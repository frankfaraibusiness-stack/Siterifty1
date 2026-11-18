"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Keyboard shortcuts for the whole site, mounted once in the root layout.
//   /      focus the search box (or open Search)
//   ?      show this list
//   g h    go home      g c  communities   g e  events   g m  messages  g v  videos
//   g s    saved posts  g w  world hub     c    create a post
//   Esc    close this list
// Nothing fires while typing in a field, with Ctrl/Cmd/Alt held, or while
// another dialog is open, so it never gets in the way.

const GO = {
  h: ["/", "Home feed"],
  v: ["/videos", "Videos"],
  c: ["/communities", "Communities"],
  e: ["/events", "Events"],
  m: ["/messages", "Messages"],
  s: ["/saved", "Saved posts"],
  w: ["/world", "Leonida World Hub"],
};

const LIST = [
  ["/", "Focus search"],
  ["c", "Create a post"],
  ...Object.entries(GO).map(([k, [, label]]) => [`g ${k}`, label]),
  ["↑ ↓", "Previous / next clip (Videos)"],
  ["Space", "Pause or play (Videos)"],
  ["l  b  m", "Heat, save, sound (Videos)"],
  ["?", "Show shortcuts"],
];

const typing = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const pending = useRef(null);
  const closeRef = useRef(null);
  const lastFocus = useRef(null);

  const close = useCallback(() => {
    setOpen(false);
    lastFocus.current?.focus?.();
  }, []);

  useEffect(() => {
    let timer;
    function onKey(e) {
      if (e.key === "Escape" && open) return close();
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      // Leave the keys alone when some other dialog (composer, comments, chat) is open.
      if (!open && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const k = e.key;

      if (pending.current) {
        const dest = GO[k.toLowerCase()];
        pending.current = null;
        clearTimeout(timer);
        if (dest) {
          e.preventDefault();
          setOpen(false);
          router.push(dest[0]);
        }
        return;
      }
      if (k === "g") {
        pending.current = true;
        timer = setTimeout(() => (pending.current = null), 1200);
      } else if (k === "?") {
        e.preventDefault();
        lastFocus.current = document.activeElement;
        setOpen((v) => !v);
      } else if (k === "/") {
        const box = document.querySelector('input[type="search"], input[name="q"]');
        e.preventDefault();
        if (box) {
          box.focus();
          box.select?.();
        } else router.push("/search");
      } else if (k === "c") {
        e.preventDefault();
        router.push("/create");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
    };
  }, [open, close, router]);

  useEffect(() => {
    if (open) closeRef.current?.focus();
  }, [open]);

  if (!open) return null;
  return (
    <div className="ks-back" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className="ks" role="dialog" aria-modal="true" aria-labelledby="ks-title">
        <header className="ks-head">
          <h2 id="ks-title">Keyboard shortcuts</h2>
          <button ref={closeRef} type="button" className="ks-x" onClick={close} aria-label="Close shortcuts">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </header>
        <ul className="ks-list">
          {LIST.map(([keys, label]) => (
            <li key={keys}>
              <span>{label}</span>
              <span className="ks-keys">
                {keys.split(" ").map((k, i) => (
                  <span key={i}>
                    {i > 0 && <small>then</small>}
                    <kbd>{k}</kbd>
                  </span>
                ))}
              </span>
            </li>
          ))}
        </ul>
        <p className="ks-foot">Shortcuts pause while you’re typing.</p>
      </div>
    </div>
  );
}
