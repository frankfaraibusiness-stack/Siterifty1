"use client";

import { useState } from "react";
import { EyeOffIcon } from "./icons";
import { topicLabel } from "@/lib/spoilers";
import { useSpoilerMode } from "@/lib/use-spoiler-mode";

// A comment marked as a spoiler. Until it is revealed its words are not on the
// page at all (so screen readers and select-all can't leak them). Your own
// comments, and everything when you chose "Show them" in Settings, are never covered.
export default function SpoilerText({ spoiler, topic = "", mine = false, children }) {
  const mode = useSpoilerMode();
  const [open, setOpen] = useState(false);
  if (!spoiler) return children;

  const label = topicLabel(topic);
  const tag = label ? `Spoiler: ${label}` : "Spoiler";

  if (mine || mode === "show" || open) {
    return (
      <>
        <span className="cm-spoil-tag">{tag}</span>
        {!mine && mode !== "show" && (
          <button type="button" className="cm-spoil-hide" onClick={() => setOpen(false)}>
            Hide
          </button>
        )}
        {children}
      </>
    );
  }
  return (
    <button type="button" className="cm-spoil-cover" onClick={() => setOpen(true)}>
      <EyeOffIcon />
      <span>{tag}</span>
      <small>Tap to read</small>
    </button>
  );
}
