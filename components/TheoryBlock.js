"use client";

import { confidenceLabel } from "@/lib/post-schema";
import { confidenceTone, readMinutes } from "@/lib/card-helpers";
import RichText from "./RichText";

// A theory's body text with a spoiler cover, a verdict chip and the author's
// confidence meter. `covered` and `onReveal` are controlled by PostCard so one
// tap reveals the text and any evidence image together.
export default function TheoryBlock({ text, confidence, covered, onReveal, inert = false, detail = false, topic = "" }) {
  const c = Math.min(100, Math.max(0, confidence ?? 0));
  const tone = confidenceTone(c);
  const mins = readMinutes(text);
  return (
    <div className="theory">
      <div className="theory-chips">
        <span className="theory-chip verdict-chip" data-tone={tone}>{confidenceLabel(c)}</span>
        <span className="theory-chip">{mins} min read</span>
      </div>
      <div className={`theory-body${covered ? " covered" : ""}`}>
        <RichText
          text={text}
          className="theory-text"
          inert={inert}
          detail={detail}
          chars={420}
          lines={8}
          label="theory"
        />
        {covered && (
          <button type="button" className="spoiler-cover" onClick={onReveal}>
            <strong>{topic ? `Theory spoiler: ${topic}` : "Theory spoiler"}</strong>
            <span>Tap to read</span>
          </button>
        )}
      </div>
      <div className="theory-meter" data-tone={tone} role="img" aria-label={`Author confidence ${c}%, ${confidenceLabel(c)}`}>
        <div className="theory-track">
          <i style={{ left: `${c}%` }} />
        </div>
        <div className="theory-meta">
          <span>Author’s confidence</span>
          <b>{c}%</b>
        </div>
      </div>
    </div>
  );
}
