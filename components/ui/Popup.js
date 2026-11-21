"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Shared floating panel for the date and time pickers (same behaviour as the Select list): drawn in
// a portal on <body> at position: fixed so nothing can clip or cover it; a popover under the button
// on wide screens (flips above when tight, follows the button on scroll), a bottom sheet on phones.
// Escape closes only this panel, not the dialog it sits in.

export function useIsPhone() {
  const [phone, setPhone] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const read = () => setPhone(mq.matches);
    read();
    mq.addEventListener("change", read);
    return () => mq.removeEventListener("change", read);
  }, []);
  return phone;
}

export default function Popup({ open, onClose, rootRef, anchorRef, title, width = 320, children }) {
  const phone = useIsPhone();
  const pop = useRef(null);
  const [pos, setPos] = useState(null);

  const place = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    if (r.bottom < 0 || r.top > vh) { onClose(false); return; } // the button scrolled out of view
    const want = pop.current ? pop.current.scrollHeight + 2 : 380;
    const below = vh - r.bottom - 12;
    const above = r.top - 12;
    const up = below < Math.min(want, 300) && above > below;
    const w = Math.min(width, vw - 16);
    const left = Math.min(Math.max(8, r.left), Math.max(8, vw - w - 8));
    setPos({ left, width: w, up, top: up ? undefined : r.bottom + 6, bottom: up ? vh - r.top + 6 : undefined, maxH: Math.max(180, (up ? above : below) - 6) });
  }, [anchorRef, onClose, width]);

  useLayoutEffect(() => {
    if (open && !phone) place();
  }, [open, phone, place]);

  useEffect(() => {
    if (!open) return undefined;
    const onScroll = (e) => {
      if (pop.current && pop.current.contains(e.target)) return;
      if (!phone) place();
    };
    const onDown = (e) => {
      if (rootRef.current?.contains(e.target) || pop.current?.contains(e.target)) return;
      onClose(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", place);
    document.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", place);
      document.removeEventListener("pointerdown", onDown, true);
    };
  }, [open, phone, place, onClose, rootRef]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation(); // React events bubble through portals to the parents
  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onClose(true); }
  };

  return createPortal(
    phone ? (
      <div className="cs-back" onClick={stop} onPointerDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); onClose(false); } }}>
        <div className="cs-sheet dp-sheet" ref={pop} role="dialog" aria-label={title || "Choose"} onKeyDown={onKeyDown}>
          <span className="cs-grab" aria-hidden="true" />
          {title && <p className="cs-sheet-t">{title}</p>}
          <div className="dp-body">{children}</div>
        </div>
      </div>
    ) : (
      <div
        className={`cs-pop dp-pop${pos?.up ? " up" : ""}`}
        ref={pop}
        role="dialog"
        aria-label={title || "Choose"}
        onClick={stop}
        onKeyDown={onKeyDown}
        style={pos ? { left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, "--cs-max": `${pos.maxH}px` } : { left: 0, top: 0, width, opacity: 0, pointerEvents: "none" }}
      >
        <div className="dp-body">{children}</div>
      </div>
    ),
    document.body
  );
}
