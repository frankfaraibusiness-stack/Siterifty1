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
