// Small icons for the Videos tab, drawn on the same 24px grid as the rest of
// the site (components/icons.js). Fills use currentColor so CSS can tint them.

export function FlameIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12.4 2.8c.5 3-1 4.6-2.6 6.3C8.2 10.8 7 12.3 7 14.6a5 5 0 0 0 10 0c0-1.7-.7-3-1.7-4.1-.2 1.2-.8 2-1.7 2.4.5-3.3-.2-6.8-1.2-10.1z" />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 2.8 2.9 5.9 6.5.9-4.7 4.6 1.1 6.4L12 17.5l-5.8 3.1 1.1-6.4L2.6 9.6l6.5-.9z" />
    </svg>
  );
}

// The Hidden Package: a floating crate with a glowing core.
export function CrateIcon() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path className="vr-crate-top" d="M24 5 42 14v7L24 30 6 21v-7z" />
      <path className="vr-crate-left" d="M6 21 24 30v13L6 34z" />
      <path className="vr-crate-right" d="M42 21 24 30v13l18-9z" />
      <path className="vr-crate-mark" d="M24 15.5 29.5 18.2 24 21 18.5 18.2z" />
    </svg>
  );
}

export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 5.2v13.6a1 1 0 0 0 1.5.9l11-6.8a1 1 0 0 0 0-1.7l-11-6.8A1 1 0 0 0 8 5.2z" />
    </svg>
  );
}

export function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="6" y="5" width="4.2" height="14" rx="1.2" />
      <rect x="13.8" y="5" width="4.2" height="14" rx="1.2" />
    </svg>
  );
}

const line = { fill: "none", stroke: "currentColor", strokeWidth: 2.4, strokeLinecap: "round", strokeLinejoin: "round" };

export function UpIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <path d="m6 14.5 6-6 6 6" />
    </svg>
  );
}

export function DownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...line}>
      <path d="m6 9.5 6 6 6-6" />
    </svg>
  );
}

export function TargetIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...line} strokeWidth="2">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3" />
    </svg>
  );
}

// ---- Fullscreen + share sheet ---------------------------------------------
// Line icons (stroke = currentColor, set in videos.css). The brand glyphs below are
// simple one-colour marks sitting on a coloured tile, not the official artwork.

export function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    </svg>
  );
}

export function ShrinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    </svg>
  );
}

export function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7 10.5l5 5 5-5M5 20h14" />
    </svg>
  );
}

export function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15" />
    </svg>
  );
}

export function TickIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="5.5" cy="12" r="1.6" className="fill" />
      <circle cx="12" cy="12" r="1.6" className="fill" />
      <circle cx="18.5" cy="12" r="1.6" className="fill" />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="m4 8 8 6 8-6" />
    </svg>
  );
}

export function SmsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 12a7.5 7.5 0 0 1-11 6.6L4 20l1.4-4.2A7.5 7.5 0 1 1 20 12z" />
    </svg>
  );
}

export function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z" />
      <path d="M9.2 8.4c.3-.3.7-.2.9.2l.7 1.5c.1.3 0 .5-.2.7l-.4.5c.7 1.3 1.6 2.1 2.8 2.7l.5-.5c.2-.2.5-.3.7-.1l1.5.8c.4.2.5.5.3.9-.4.9-1.3 1.3-2.3 1.1-2.9-.7-5-2.8-5.7-5.6-.2-.8.2-1.5.7-2.2z" className="fill" />
    </svg>
  );
}

export function TelegramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.5 4.2 3.6 10.9c-.7.3-.7 1.2 0 1.4l4.2 1.4 1.6 5c.2.6.9.7 1.3.3l2.3-2.1 4.2 3.1c.5.3 1.1.1 1.3-.5l2.9-14.2c.2-.8-.6-1.4-1.3-1.1z" className="fill" />
    </svg>
  );
}

export function XMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M17.7 3.5h3.1l-6.8 7.8 8 10.6h-6.3l-4.9-6.4-5.6 6.4H2.1l7.3-8.3L1.7 3.5h6.4l4.4 5.9zm-1.1 16.5h1.7L7.3 5.3H5.5z" className="fill" />
    </svg>
  );
}

// Lettermarks for the rest: they read at a glance on the coloured tile.
export function Letters({ text, size = 13 }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <text x="12" y="12" textAnchor="middle" dominantBaseline="central" fontSize={size} className="fill vr-letters">{text}</text>
    </svg>
  );
}
