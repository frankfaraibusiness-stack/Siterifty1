"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The one toast for the whole app (profile, plans, perks, settings, ads, the AI
// bubble...). A small card at the bottom of the screen with an icon, the
// message, a close button and a thin line that shows how long is left.
//
//   const { toast, show, hide } = useToast();
//   show("Profile updated");              // tone is guessed from the words
//   show("Saved", "success");             // "success" | "error" | "info"
//   show("Couldn’t save that", "error");  // (true also means "error")
//   ...
//   <Toast toast={toast} onClose={hide} />
//
// - Long messages stay one tidy card: the text scrolls inside it instead of
//   the card growing taller and taller.
// - It stays up longer for longer text and for errors, and it holds still while
//   you hover, focus or touch it, so there is time to read or scroll.
// - Showing a new message replaces the old one (the same words twice restart
//   the timer too), so toasts never stack.
const BAD = /(couldn[’']?t|can[’']?t|cannot|unable|failed|error|try again|not allowed|too many|invalid)/i;

export function useToast() {
  const [toast, setToast] = useState(null);
  const counter = useRef(0);
  const show = useCallback((text, tone) => {
    if (!text) return;
    const message = String(text);
    const t = tone === true ? "error" : tone || (BAD.test(message) ? "error" : "success");
    counter.current += 1;
    setToast({ id: counter.current, text: message, tone: t });
  }, []);
  const hide = useCallback(() => setToast(null), []);
  return { toast, show, hide };
}

function lifetime(text, tone) {
  const base = tone === "error" ? 4500 : tone === "info" ? 3400 : 2800;
  return Math.min(14000, base + Math.max(0, text.length - 24) * 45);
}

const ICONS = {
  success: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.4l2.7 2.7L16.2 9.6" />
    </>
  ),
  error: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.6v5.2" />
      <path d="M12 16.2h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.2" />
      <path d="M12 7.8h.01" />
    </>
  ),
};

function Card({ toast, onClose }) {
  const [paused, setPaused] = useState(false);
  const total = lifetime(toast.text, toast.tone);
  const left = useRef(total);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // Counts down while nobody is reading it. Pausing keeps what is left.
  useEffect(() => {
    if (paused) return undefined;
    const started = Date.now();
    const timer = setTimeout(() => closeRef.current?.(), left.current);
    return () => {
      clearTimeout(timer);
      left.current = Math.max(0, left.current - (Date.now() - started));
    };
  }, [paused]);

  const tone = ICONS[toast.tone] ? toast.tone : "info";
  const hold = () => setPaused(true);
  const release = () => setPaused(false);

  return (
    <div className="tt-wrap">
      <div
        className={`tt tt-${tone}`}
        role={tone === "error" ? "alert" : "status"}
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocus={hold}
        onBlur={release}
        onTouchStart={hold}
        onTouchEnd={release}
        onTouchCancel={release}
      >
        <span className="tt-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {ICONS[tone]}
          </svg>
        </span>
        <div className="tt-text" tabIndex={0}>{toast.text}</div>
        <button type="button" className="tt-x" onClick={() => closeRef.current?.()} aria-label="Dismiss message">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <span className="tt-bar" aria-hidden="true" style={{ animationDuration: `${total}ms`, animationPlayState: paused ? "paused" : "running" }} />
      </div>
    </div>
  );
}

export default function Toast({ toast, onClose }) {
  if (!toast) return null;
  // The key restarts the card (and its timer) for every new message.
  return <Card key={toast.id} toast={toast} onClose={onClose} />;
}
