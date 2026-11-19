"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Draws the answer blocks that lib/vibe/kit.js builds. Text supports
// **bold**, `code` and [label](/path); nothing is ever injected as raw HTML.
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

function inline(text, close) {
  return String(text ?? "")
    .split(INLINE)
    .map((part, i) => {
      if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) return <code key={i}>{part.slice(1, -1)}</code>;
      const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (m) {
        const [, label, href] = m;
        if (href.startsWith("/") && !href.startsWith("//")) {
          return <Link key={i} href={href} onClick={close}>{label}</Link>;
        }
        if (/^https:\/\//i.test(href)) {
          return <a key={i} href={href} target="_blank" rel="noopener noreferrer">{label}</a>;
        }
        return label;
      }
      return part;
    });
}

const pad = (n) => String(n).padStart(2, "0");

// Counts down to the start of a YYYY-MM-DD day in the visitor's own time zone.
function Countdown({ to, label }) {
  const [now, setNow] = useState(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const [y, m, d] = String(to).split("-").map(Number);
  const target = new Date(y, (m || 1) - 1, d || 1).getTime();
  if (now === null || Number.isNaN(target)) return <div className="vb-cd" aria-hidden="true" />;
  const left = Math.max(0, target - now);
  if (left === 0) return <div className="vb-cd done"><b>It’s here.</b> {label ? `The wait ${label.replace(/^until\s+/i, "for ")} is over.` : ""}</div>;
  const s = Math.floor(left / 1000);
  const parts = [[Math.floor(s / 86400), "days"], [Math.floor((s % 86400) / 3600), "hrs"], [Math.floor((s % 3600) / 60), "min"], [s % 60, "sec"]];
  return (
    <div className="vb-cd" role="timer" aria-label={`${parts[0][0]} days left ${label || ""}`}>
      <div className="vb-cd-boxes">
        {parts.map(([n, u]) => (
          <div key={u}><b>{pad(n)}</b><small>{u}</small></div>
        ))}
      </div>
      {label && <span className="vb-cd-label">{label}</span>}
    </div>
  );
}

const CALLOUT_ICON = { tip: "Tip", info: "Good to know", warn: "Heads up", soon: "Coming soon", fact: "Fun fact" };

function Block({ b, onAsk, close }) {
  switch (b.t) {
    case "p":
      return <p>{inline(b.x, close)}</p>;
    case "h":
      return <h4>{inline(b.x, close)}</h4>;
    case "ul":
      return <ul>{b.items.map((x, i) => <li key={i}>{inline(x, close)}</li>)}</ul>;
    case "steps":
      return <ol className="vb-steps">{b.items.map((x, i) => <li key={i}>{inline(x, close)}</li>)}</ol>;
    case "callout":
      return (
        <div className={`vb-callout ${b.tone || "info"}`}>
          <b>{CALLOUT_ICON[b.tone] || "Note"}</b>
          <span>{inline(b.x, close)}</span>
        </div>
      );
    case "table":
      return (
        <div className="vb-table">
          <table>
            <thead><tr>{b.head.map((c, i) => <th key={i}>{inline(c, close)}</th>)}</tr></thead>
            <tbody>{b.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{inline(c, close)}</td>)}</tr>)}</tbody>
          </table>
          {b.note && <small>{inline(b.note, close)}</small>}
        </div>
      );
    case "stats":
      return (
        <div className="vb-stats">
          {b.items.map((s, i) => (
            <div key={i}>
              <small>{s.k}</small>
              <b>{s.v}</b>
              {s.hint && <em>{s.hint}</em>}
            </div>
          ))}
        </div>
      );
    case "timeline":
      return (
        <ol className="vb-timeline">
          {b.items.map((it, i) => (
            <li key={i} className={`tone-${it.tone || "dim"}`}>
              <span className="vb-tl-y">{it.y}</span>
              <span className="vb-tl-body"><b>{inline(it.t, close)}</b><small>{inline(it.x, close)}</small></span>
            </li>
          ))}
        </ol>
      );
    case "actions":
      return (
        <div className="vb-actions">
          {b.items.map((it, i) =>
            it.href ? (
              <Link key={i} href={it.href} className="vb-act" onClick={close}>{it.label}</Link>
            ) : (
              <button key={i} type="button" className="vb-act" onClick={() => onAsk(it.ask)}>{it.label}</button>
            )
          )}
        </div>
      );
    case "countdown":
      return <Countdown to={b.to} label={b.label} />;
    default:
      return null; // block kinds the chat doesn't draw yet are skipped, never shown broken
  }
}

export default function VibeMessage({ blocks, onAsk, close }) {
  return (
    <div className="vb-blocks">
      {blocks.map((b, i) => <Block key={i} b={b} onAsk={onAsk} close={close} />)}
    </div>
  );
}
