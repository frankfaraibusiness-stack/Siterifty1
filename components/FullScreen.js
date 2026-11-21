"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { ArrowLeftIcon } from "./icons";

// The one full-screen shell for anything that deserves its own screen (edit
// profile, people lists, a perk, a join request, add funds...). It has the same
// look as the log in / sign up screen: its own sticky header with a back button,
// a scrolling body, and an optional pinned footer for the main action.
//
//   title / subtitle  header text
//   right             extra header buttons (optional)
//   subhead           pinned under the header (tabs, a search box)
//   footer            pinned at the bottom (Save, Pay, Send...)
//   size              "sm" | "md" | "lg": width of the content column
//   style / className lets a screen bring its own colours (--a / --b)
//
// Escape and the back button both close it. Page scroll is frozen while it is
// open, and focus goes back to whatever opened it.
const stack = [];

export default function FullScreen({
  title,
  subtitle,
  onClose,
  children,
  footer,
  subhead,
  right,
  size = "md",
  className = "",
  style,
  backLabel = "Back",
}) {
  useScrollLock(true);
  const root = useRef(null);
  const idRef = useRef(Symbol("fs"));
  const closeRef = useRef(onClose);
  const timer = useRef(null);
  const [closing, setClosing] = useState(false);
  closeRef.current = onClose;

  const requestClose = useCallback(() => {
    setClosing((was) => {
      if (was) return was;
      timer.current = setTimeout(() => closeRef.current?.(), 170);
      return true;
    });
  }, []);

  useEffect(() => {
    const id = idRef.current;
    const opener = document.activeElement;
    stack.push(id);
    root.current?.focus({ preventScroll: true });
    const onKey = (e) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id && !e.defaultPrevented) requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer.current);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
      if (opener && typeof opener.focus === "function" && document.contains(opener)) opener.focus({ preventScroll: true });
    };
  }, [requestClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={root}
      className={`fs fs-${size}${closing ? " is-closing" : ""}${className ? ` ${className}` : ""}`}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      tabIndex={-1}
    >
      <header className="fs-top">
        <button type="button" className="fs-back" onClick={requestClose} aria-label={backLabel}>
          <ArrowLeftIcon />
        </button>
        <div className="fs-titles">
          <h1 className="fs-title">{title}</h1>
          {subtitle && <p className="fs-subtitle">{subtitle}</p>}
        </div>
        {right && <div className="fs-right">{right}</div>}
        <span className="fs-esc" aria-hidden="true">Esc</span>
      </header>

      {subhead && <div className="fs-sub"><div className="fs-col">{subhead}</div></div>}

      <div className="fs-scroll">
        <div className="fs-col fs-page">{children}</div>
      </div>

      {footer && <footer className="fs-foot"><div className="fs-col">{footer}</div></footer>}
    </div>,
    document.body
  );
}
