"use client";

import { useState } from "react";
import Link from "next/link";
import { needsClamp, parseTags, profileHref, tagHref, tokenizeText } from "@/lib/card-helpers";

// Post text with @mentions and #tags turned into links. `inert` (the composer
// preview) keeps the look but renders plain spans, so nothing navigates away
// from a draft.
export function RichTokens({ text, inert = false }) {
  const parts = tokenizeText(text);
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === "text") return p.raw;
        const mention = p.type === "mention";
        const cls = mention ? "rt-mention" : "rt-tag";
        if (inert) return <span key={i} className={cls}>{p.raw}</span>;
        return (
          <Link
            key={i}
            href={mention ? profileHref(p.handle) : tagHref(p.tag)}
            className={cls}
            prefetch={false}
          >
            {p.raw}
          </Link>
        );
      })}
    </>
  );
}

// A paragraph that folds long text behind "Show more". The full post page
// (`detail`) always shows everything.
export default function RichText({ text, className = "", inert = false, detail = false, chars = 220, lines = 4, label = "post" }) {
  const [open, setOpen] = useState(false);
  const long = !detail && needsClamp(text, { chars, lines });
  const folded = long && !open;
  return (
    <>
      <p className={`${className}${folded ? " rt-clamp" : ""}`} style={folded ? { "--rt-lines": lines } : undefined}>
        <RichTokens text={text} inert={inert} />
      </p>
      {long && (
        <button
          type="button"
          className="rt-more"
          aria-expanded={open}
          aria-label={open ? `Show less of this ${label}` : `Show more of this ${label}`}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Show more"}
        </button>
      )}
    </>
  );
}

// The post's tags as a row of clickable chips that open a search for the tag.
export function TagList({ post, inert = false, className = "" }) {
  const tags = parseTags(post);
  if (!tags.length) return null;
  return (
    <ul className={`tag-list${className ? ` ${className}` : ""}`} aria-label="Tags">
      {tags.map((t) =>
        <li key={t}>
          {inert ? (
            <span className="tag-chip">#{t}</span>
          ) : (
            <Link href={tagHref(t)} className="tag-chip" prefetch={false}>#{t}</Link>
          )}
        </li>
      )}
    </ul>
  );
}
