"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import GtaEmoji from "./GtaEmoji";
import { EMOJI_IDS, SHORTCODE_RE } from "@/lib/chat-config";
import { useScrollLock } from "@/lib/use-scroll-lock";

// ------------------------------------------------------------- icons
const I = ({ children, size = 20, fill = "none", sw = 2, ...rest }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill={fill} stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
    {children}
  </svg>
);
export const Icon = {
  Back: (p) => <I {...p}><path d="M15 5l-7 7 7 7" /></I>,
  Close: (p) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>,
  Compose: (p) => <I {...p}><path d="M12 20h8" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z" /></I>,
  Send: (p) => <I {...p} fill="currentColor" sw={1.6}><path d="M3.4 11.2 20 3.6c.8-.4 1.6.4 1.2 1.2L13.6 20.6c-.4.8-1.5.7-1.7-.2l-1.5-6.3-6.3-1.6c-.9-.2-1-1.3-.2-1.6z" /></I>,
  Plus: (p) => <I {...p}><path d="M12 5v14M5 12h14" /></I>,
  Smile: (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.2c1 1.3 2.1 1.9 3.5 1.9s2.5-.6 3.5-1.9" /><path d="M9 9.8h.01M15 9.8h.01" sw="3" /></I>,
  Dots: (p) => <I {...p} fill="currentColor" sw={0}><circle cx="5" cy="12" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="19" cy="12" r="1.9" /></I>,
  Search: (p) => <I {...p}><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></I>,
  Reply: (p) => <I {...p}><path d="M10 8L4 13l6 5" /><path d="M4 13h10a6 6 0 0 1 6 6" /></I>,
  Copy: (p) => <I {...p}><rect x="9" y="9" width="11" height="11" rx="2.5" /><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" /></I>,
  Trash: (p) => <I {...p}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.2A1.8 1.8 0 0 0 8.8 21h6.4a1.8 1.8 0 0 0 1.8-1.8L18 7M9 7V4.8A.8.8 0 0 1 9.8 4h4.4a.8.8 0 0 1 .8.8V7" /></I>,
  Edit: (p) => <I {...p}><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="M13.5 6.5l4 4" /></I>,
  Info: (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v5.2M12 7.6h.01" /></I>,
  Pin: (p) => <I {...p}><path d="M14.5 3.5l6 6-2.2.9-3.1 3.1.4 4.3-1.4 1.4-3.6-3.6-5 5-1-1 5-5-3.6-3.6 1.4-1.4 4.3.4 3.1-3.1z" /></I>,
  Bell: (p) => <I {...p}><path d="M6 17V11a6 6 0 0 1 12 0v6l1.6 2H4.4z" /><path d="M10 21a2.2 2.2 0 0 0 4 0" /></I>,
  BellOff: (p) => <I {...p}><path d="M8.6 4.8A6 6 0 0 1 18 11v4M6 11v6l-1.6 2H15" /><path d="M10 21a2.2 2.2 0 0 0 4 0M3 3l18 18" /></I>,
  Ban: (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></I>,
  User: (p) => <I {...p}><circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" /></I>,
  UserPlus: (p) => <I {...p}><circle cx="9.5" cy="8" r="3.8" /><path d="M2.8 20.5a6.7 6.7 0 0 1 13.4 0M19 8v6M16 11h6" /></I>,
  UserCheck: (p) => <I {...p}><circle cx="9.5" cy="8" r="3.8" /><path d="M2.8 20.5a6.7 6.7 0 0 1 13.4 0M16 11.5l2.2 2.2 4-4.4" /></I>,
  Users: (p) => <I {...p}><circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" /><circle cx="17.4" cy="9.4" r="2.4" /><path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" /></I>,
  Image: (p) => <I {...p}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="M21 16l-5-5-8 8" /></I>,
  Bolt: (p) => <I {...p}><path d="M13 2L5 13.5h6L10 22l9-12h-6.2z" /></I>,
  Gamepad: (p) => <I {...p}><path d="M7 7h10c3 0 4.6 2 5.2 6l.6 4a2.5 2.5 0 0 1-4.4 1.8L16 16H8l-2.4 2.8A2.5 2.5 0 0 1 1.2 17l.6-4C2.4 9 4 7 7 7z" /><path d="M8 10v4M6 12h4M16 11h.01M18.5 13h.01" /></I>,
  Key: (p) => <I {...p}><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></I>,
  MapPin: (p) => <I {...p}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></I>,
  Download: (p) => <I {...p}><path d="M12 4v11M7.5 11 12 15.5 16.5 11M5 20h14" /></I>,
  Alert: (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7.5v5M12 16h.01" /></I>,
  Chevron: (p) => <I {...p}><path d="M9 5l7 7-7 7" /></I>,
  Check: (p) => <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>,
  Lock: (p) => <I {...p}><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></I>,
  Clock: (p) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>,
  Arrow: (p) => <I {...p}><path d="M12 19V5M6 11l6-6 6 6" /></I>,
  Mail: (p) => <I {...p}><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m3.5 7.5 8.5 6 8.5-6" /></I>,
  Controller: (p) => <I {...p}><path d="M7 7h10c3 0 4.6 2 5.2 6l.6 4a2.5 2.5 0 0 1-4.4 1.8L16 16H8l-2.4 2.8A2.5 2.5 0 0 1 1.2 17l.6-4C2.4 9 4 7 7 7z" /></I>,
};

// ------------------------------------------------------------ avatar
export function Avatar({ person, size = 44, online = null, className = "" }) {
  const name = person.displayName || person.username || "?";
  return (
    <span className={`ms-av ${className}`.trim()} style={{ "--a": person.a, "--b": person.b, "--s": `${size}px` }}>
      <span className="ms-av-ini">{name.trim().charAt(0).toUpperCase()}</span>
      {person.hasAvatar && person.username && (
        <span className="ms-av-img" style={{ backgroundImage: `url("/avatar/${encodeURIComponent(person.username)}?v=${person.avatarV || 0}")` }} />
      )}
      {online === true && <i className="ms-online" aria-label="Online" />}
    </span>
  );
}

// The "Story replies" chat icon: a dashed story ring with a play mark.
export function StoryIcon({ size = 20 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" strokeDasharray="3.2 2.6" />
      <path d="M10 8.6v6.8l5.4-3.4z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// ------------------------------------------------------- ticks + labels
const TickPath = ({ x = 0 }) => <path d={`M${3.2 + x} 12.6l3.6 3.6 6.4-7.4`} />;
export function Ticks({ state, size = 15 }) {
  if (state === "sending") return <Icon.Clock size={size - 3} sw={2.2} className="ms-tick sending" />;
  if (state === "failed") return <Icon.Alert size={size - 1} sw={2.2} className="ms-tick failed" />;
  if (state === "sent") {
    return (
      <svg className="ms-tick one" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 12.6l3.8 3.8 8-9" />
      </svg>
    );
  }
  return (
    <svg className={`ms-tick two ${state === "seen" ? "seen" : ""}`} viewBox="0 0 24 24" width={size + 3} height={size} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1.8 12.8l3.7 3.7 7.4-8.6" />
      <path d="M10.2 15.6l1.2 1 8.9-9.8" />
    </svg>
  );
}

// The words that go with the ticks.
export const STATE_LABEL = {
  sending: "Sending…",
  sent: "Not delivered",
  delivered: "Delivered",
  seen: "Seen",
  failed: "Failed to send",
};

// ------------------------------------------------------------- time
const pad = (n) => String(n).padStart(2, "0");
export function fmtTime(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function dayKey(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fmtDay(ms) {
  const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(ms))) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return new Date(ms).toLocaleDateString([], { weekday: "long" });
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric", year: new Date(ms).getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}
export function fmtListTime(ms) {
  if (!ms) return "";
  const diff = Math.round((startOfDay(new Date()) - startOfDay(new Date(ms))) / 86400000);
  if (diff === 0) return fmtTime(ms);
  if (diff === 1) return "Yesterday";
  if (diff < 7) return new Date(ms).toLocaleDateString([], { weekday: "short" });
  return new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" });
}
export function fmtWhen(ms) {
  const diff = Math.round((startOfDay(new Date(ms)) - startOfDay(new Date())) / 86400000);
  const t = fmtTime(ms);
  if (diff === 0) return `Today ${t}`;
  if (diff === 1) return `Tomorrow ${t}`;
  if (diff > 1 && diff < 7) return `${new Date(ms).toLocaleDateString([], { weekday: "short" })} ${t}`;
  return `${new Date(ms).toLocaleDateString([], { month: "short", day: "numeric" })} ${t}`;
}
export function fmtIn(ms) {
  const d = ms - Date.now();
  if (d < -3600_000) return "ended";
  if (d <= 0) return "starting now";
  const m = Math.round(d / 60000);
  if (m < 60) return `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h}h ${m % 60 ? `${m % 60}m` : ""}`.trim();
  return `in ${Math.round(h / 24)}d`;
}
export function fmtActive(ms) {
  if (!ms) return "";
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "Active just now";
  if (m < 60) return `Active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Active ${h}h ago`;
  return "";
}

// --------------------------------------------------------- rich text
const TOKEN = /(:[a-z0-9]{2,12}:)|(https?:\/\/[^\s<]+)/g;

export function parseText(text) {
  const out = [];
  let last = 0;
  for (const m of String(text).matchAll(TOKEN)) {
    if (m.index > last) out.push({ k: "t", v: text.slice(last, m.index) });
    if (m[1]) {
      const id = m[1].slice(1, -1);
      if (EMOJI_IDS.has(id)) out.push({ k: "e", id });
      else out.push({ k: "t", v: m[1] });
    } else {
      const url = m[2].replace(/[.,!?;:)\]]+$/, "");
      out.push({ k: "u", v: url });
      if (url.length < m[2].length) out.push({ k: "t", v: m[2].slice(url.length) });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ k: "t", v: text.slice(last) });
  return out;
}

// 1 to 3 emoji and nothing else: shown big, with no bubble.
export function emojiOnly(text) {
  const t = String(text || "").trim();
  if (!t) return 0;
  const rest = t.replace(SHORTCODE_RE, (m, id) => (EMOJI_IDS.has(id) ? "" : m)).replace(/\s/g, "");
  if (rest) return 0;
  const n = (t.match(SHORTCODE_RE) || []).filter((m) => EMOJI_IDS.has(m.slice(1, -1))).length;
  return n >= 1 && n <= 3 ? n : 0;
}

const INTERNAL = /^\/(p|u|c)\/([^/?#]+)/;
function LinkChip({ url }) {
  let href = url;
  let label = url.replace(/^https?:\/\//, "");
  let internal = false;
  try {
    const u = new URL(url);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      const m = INTERNAL.exec(u.pathname);
      if (m) {
        internal = true;
        href = u.pathname;
        label = m[1] === "p" ? "Shared post" : m[1] === "u" ? `@${decodeURIComponent(m[2])}` : "Community";
      }
    }
  } catch {
    // not a valid URL: show as plain text
  }
  if (internal) {
    return (
      <Link href={href} className="mg-chip">
        {label}
      </Link>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="mg-link">
      {label.length > 42 ? `${label.slice(0, 41)}…` : label}
    </a>
  );
}

export function RichText({ text, emojiSize = 20 }) {
  return parseText(text).map((p, i) =>
    p.k === "e" ? (
      <GtaEmoji key={i} id={p.id} size={emojiSize} className="inline" />
    ) : p.k === "u" ? (
      <LinkChip key={i} url={p.v} />
    ) : (
      <span key={i}>{p.v}</span>
    )
  );
}

// ------------------------------------------------------------- sheet
const stack = [];

// Bottom sheet on phones, full screen on desktop (md / lg sizes). Pass `anchor`
// (a DOMRect) to turn it into a small popover next to a button on desktop.
export function Sheet({ title, onClose, children, size = "md", className = "", footer, headerExtra, anchor }) {
  useScrollLock(true);
  const ref = useRef(null);
  const idRef = useRef(Symbol("sheet"));
  const [pos, setPos] = useState(null);
  const drag = useRef({ y: 0, dy: 0, on: false });
  const pop = !!anchor && typeof window !== "undefined" && window.innerWidth >= 900;

  useEffect(() => {
    const id = idRef.current;
    stack.push(id);
    const onKey = (e) => {
      if (e.key === "Escape" && stack[stack.length - 1] === id) onClose();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus({ preventScroll: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      const i = stack.indexOf(id);
      if (i >= 0) stack.splice(i, 1);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!pop || !ref.current) return;
    const el = ref.current.getBoundingClientRect();
    const zoom = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom")) || 1;
    const vw = window.innerWidth / zoom;
    const vh = window.innerHeight / zoom;
    const a = { left: anchor.left / zoom, right: anchor.right / zoom, top: anchor.top / zoom, bottom: anchor.bottom / zoom };
    let left = a.left - el.width / zoom + (a.right - a.left);
    if (left < 8) left = a.left;
    left = Math.min(Math.max(8, left), vw - el.width / zoom - 8);
    let top = a.bottom + 6;
    if (top + el.height / zoom > vh - 8) top = Math.max(8, a.top - el.height / zoom - 6);
    setPos({ left, top });
  }, [pop, anchor, children]);

  // Swipe the header down to dismiss (phones).
  const onDown = (e) => {
    if (pop || e.target.closest("button")) return;
    drag.current = { y: e.clientY, dy: 0, on: true };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onMove = (e) => {
    if (!drag.current.on) return;
    const dy = Math.max(0, e.clientY - drag.current.y);
    drag.current.dy = dy;
    if (ref.current) ref.current.style.transform = `translateY(${dy}px)`;
  };
  const onUp = () => {
    if (!drag.current.on) return;
    drag.current.on = false;
    if (drag.current.dy > 90) onClose();
    else if (ref.current) ref.current.style.transform = "";
  };

  return createPortal(
    <div className={`ms-sheet-wrap${pop ? " is-pop" : ""}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`ms-sheet ms-sheet-${size} ${className}`.trim()}
        role="dialog"
        aria-modal="true"
        aria-label={title || "Dialog"}
        tabIndex={-1}
        style={pop ? { position: "fixed", left: pos?.left ?? -9999, top: pos?.top ?? -9999, visibility: pos ? "visible" : "hidden" } : undefined}
      >
        <div className="ms-sheet-top" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="ms-sheet-grab" aria-hidden="true" />
          {title && (
            <header className="ms-sheet-head">
              <h2>{title}</h2>
              {headerExtra}
              <button type="button" className="ms-x" onClick={onClose} aria-label="Close">
                <span className="ms-x-close"><Icon.Close size={18} /></span>
                <span className="ms-x-back"><Icon.Back size={18} /></span>
              </button>
            </header>
          )}
        </div>
        <div className="ms-sheet-body">{children}</div>
        {footer}
      </div>
    </div>,
    document.body
  );
}

// Copy text, with a fallback for browsers/pages without the async clipboard.
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}
