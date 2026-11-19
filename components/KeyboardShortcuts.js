"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

// Keyboard shortcuts for the whole site, mounted once in the root layout.
//   /      focus the search box (or open Search)
//   ?      show this list
//   g h    go home      g c  communities   g e  events   g m  messages  g v  videos
//   g s    saved posts  g w  world hub     c    create a post
//   j / k  next / previous post in a feed     t    back to the top
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
  ["j|k", "Next / previous post"],
  ["t", "Back to the top"],
  ["↑|↓", "Previous / next clip (Videos)"],
  ["Space", "Pause or play (Videos)"],
  ["l|b|m", "Heat, save, sound (Videos)"],
  ["?", "Show shortcuts"],
];

const typing = (el) =>
  !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

// j / k: scroll to the next or previous post card and flash a ring round it, so you
// can read a feed without touching the mouse. Posts sit 84px under the top of the
// screen (the sticky header; see scroll-margin-top in app/touches.css).
const POST_TOP = 84;
function stepPost(dir) {
  const posts = [...document.querySelectorAll("main article.post")].filter((p) => p.offsetParent !== null);
  if (!posts.length) return false;
  const top = (p) => p.getBoundingClientRect().top;
  const target = dir > 0 ? posts.find((p) => top(p) > POST_TOP + 8) : [...posts].reverse().find((p) => top(p) < POST_TOP - 8);
  if (!target) return true;
  document.querySelectorAll(".post[data-kb]").forEach((el) => el.removeAttribute("data-kb"));
  target.setAttribute("data-kb", "");
  target.scrollIntoView({ block: "start" });
  setTimeout(() => target.removeAttribute("data-kb"), 1400);
  return true;
}

export default function KeyboardShortcuts() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // "g" was just pressed and the next key picks the page; show a reminder of the choices.
  const [hint, setHint] = useState(false);
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
      // The welcome tour is a one-way trip: no jumping to other pages from it.
      if (document.documentElement.dataset.onboarding) return;
      // Leave the keys alone when some other dialog (composer, comments, chat) is open.
      if (!open && document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      const k = e.key;

      if (pending.current) {
        const dest = GO[k.toLowerCase()];
        pending.current = null;
        clearTimeout(timer);
        setHint(false);
        if (dest) {
          e.preventDefault();
          setOpen(false);
          router.push(dest[0]);
        }
        return;
      }
      if (k === "g") {
        pending.current = true;
        setHint(true);
        timer = setTimeout(() => {
          pending.current = null;
          setHint(false);
        }, 1600);
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
      } else if (k === "t") {
        e.preventDefault();
        window.scrollTo({ top: 0 });
      } else if ((k === "j" || k === "k") && !location.pathname.startsWith("/videos")) {
        if (stepPost(k === "j" ? 1 : -1)) e.preventDefault();
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

  if (!open) {
    if (!hint) return null;
    return (
      <div className="ks-pending" role="status">
        <kbd>g</kbd>
        <span>then</span>
        {Object.entries(GO).map(([k, [, label]]) => (
          <span key={k} className="ks-pending-opt" title={label}>
            <kbd>{k}</kbd>
            {label.split(" ")[0]}
          </span>
        ))}
      </div>
    );
  }
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
                {keys.split("|").map((alt, a) => (
                  <span key={a} className="ks-alt">
                    {a > 0 && <small>or</small>}
                    {alt.split(" ").map((k, i) => (
                      <span key={i}>
                        {i > 0 && <small>then</small>}
                        <kbd>{k}</kbd>
                      </span>
                    ))}
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
