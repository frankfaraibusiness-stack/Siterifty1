"use client";

import { useState } from "react";
import { LinkIcon } from "@/components/icons";

export default function CopyLink({ slug, label = "Copy link" }) {
  const [done, setDone] = useState(false);
  async function copy() {
    const url = `${window.location.origin}/c/${slug}`;
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setDone(true); setTimeout(() => setDone(false), 1800);
  }
  return <button type="button" className="gc-btn ghost" onClick={copy}><LinkIcon />{done ? "Link copied" : label}</button>;
}
