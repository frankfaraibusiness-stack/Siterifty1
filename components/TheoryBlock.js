"use client";

import { confidenceLabel } from "@/lib/post-schema";

// A theory's body text with a spoiler cover and the author's confidence meter.
// `covered` and `onReveal` are controlled by PostCard so one tap reveals the
// text and any evidence image together.
export default function TheoryBlock({ text, confidence, covered, onReveal }) {
  const c = Math.min(100, Math.max(0, confidence ?? 0));
  return (
    <div className="theory">
      <div className={`theory-body${covered ? " covered" : ""}`}>
        <p className="theory-text">{text}</p>
        {covered && (
          <button type="button" className="spoiler-cover" onClick={onReveal}>
            <strong>Theory spoiler</strong>
            <span>Tap to read</span>
          </button>
        )}
      </div>
      <div className="theory-meter" role="img" aria-label={`Author confidence ${c}%, ${confidenceLabel(c)}`}>
        <div className="theory-track">
          <i style={{ left: `${c}%` }} />
        </div>
        <div className="theory-meta">
          <span>Author’s confidence</span>
          <b>{c}% &middot; {confidenceLabel(c)}</b>
        </div>
      </div>
    </div>
  );
}
