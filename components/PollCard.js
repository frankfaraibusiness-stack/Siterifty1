"use client";

import { useEffect, useState } from "react";
import { pollSummary } from "@/lib/card-helpers";

// Works for both polls and a theory's "Facts or Cap" verdict. Votes are stored
// server-side (POST /api/posts/vote); `preview` renders it inert in the composer.
export default function PollCard({ postId, poll, isOwner, resultsFirst, preview }) {
  const [state, setState] = useState(poll);
  const [picks, setPicks] = useState(poll.mine);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Re-checked every 30s so "2h left" ticks down and a poll flips to its final
  // results on its own. Only polls with an end time need the timer.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state.endsAtMs == null || state.endsAtMs <= Date.now()) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [state.endsAtMs]);

  const sum = pollSummary(state, now);
  const ended = sum.ended;
  const voted = state.mine.length > 0;
  const showResults = preview
    ? !!resultsFirst
    : ended || (!editing && (voted || isOwner || resultsFirst));
  const total = sum.total;
  const lead = Math.max(...state.counts);
  const verdict = state.kind === "verdict";

  async function send(choices) {
    if (preview || busy || ended) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/posts/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, choices }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn’t save your vote.");
      setState(data.poll);
      setPicks(data.poll.mine);
      setEditing(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function choose(i) {
    if (state.multi) {
      setPicks((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));
    } else {
      send([i]);
    }
  }

  return (
    <div className={`poll poll-${state.kind}`}>
      {!verdict && (
        <div className="poll-head">
          <span className={`poll-status${ended ? " ended" : ""}`}>
            <i aria-hidden="true" />
            {ended ? "Final results" : state.endsAtMs != null ? "Live" : "Open"}
          </span>
          {!ended && sum.left && <span className="poll-left" suppressHydrationWarning>{sum.left}</span>}
          {state.multi && <span className="poll-left">Pick any</span>}
        </div>
      )}
      <div className="poll-list" role={state.multi ? "group" : "radiogroup"}>
        {state.options.map((label, i) => {
          const pct = total ? Math.round((state.counts[i] / total) * 100) : 0;
          const mine = state.mine.includes(i);
          if (showResults) {
            return (
              <div key={i} className={`poll-row result${mine ? " mine" : ""}${lead > 0 && state.counts[i] === lead ? " lead" : ""}`}>
                <span className="poll-fill" style={{ width: `${pct}%` }} />
                <span className="poll-label">
                  {mine && <b className="poll-check" aria-label="Your vote">✓</b>}
                  {label}
                  {!verdict && sum.leaders.includes(i) && (
                    <em className="poll-tag">{sum.tie ? "Tied" : ended ? "Winner" : "Leading"}</em>
                  )}
                </span>
                <span className="poll-pct">{pct}%</span>
              </div>
            );
          }
          const on = picks.includes(i);
          return (
            <button
              key={i}
              type="button"
              role={state.multi ? "checkbox" : "radio"}
              aria-checked={on}
              className={`poll-row choice${on ? " on" : ""}`}
              disabled={busy}
              onClick={() => choose(i)}
            >
              <span className={`poll-mark${state.multi ? " box" : ""}`} aria-hidden="true" />
              <span className="poll-label">{label}</span>
            </button>
          );
        })}
      </div>

      {!showResults && state.multi && (
        <button
          type="button"
          className="poll-submit"
          disabled={busy || preview || picks.length === 0}
          onClick={() => send(picks)}
        >
          {busy ? "Voting..." : `Vote${picks.length > 1 ? ` (${picks.length})` : ""}`}
        </button>
      )}

      {ended && !verdict && sum.leaders.length > 0 && (
        <p className="poll-winner" role="status">
          {sum.tie
            ? `A tie at ${sum.leadPct}%: ${sum.leaders.map((i) => state.options[i]).join(" and ")}`
            : `${state.options[sum.leaders[0]]} won with ${sum.leadPct}%`}
        </p>
      )}

      {error && <p className="poll-error" role="alert">{error}</p>}

      <div className="poll-foot">
        <span>
          {state.voters} {state.voters === 1 ? "vote" : "votes"}
          {ended && verdict && <> &middot; Final results</>}
        </span>
        {!preview && !ended && voted && showResults && (
          <button type="button" className="poll-link" onClick={() => setEditing(true)}>
            Change vote
          </button>
        )}
        {!preview && editing && (
          <button type="button" className="poll-link" onClick={() => { setEditing(false); setPicks(state.mine); }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
