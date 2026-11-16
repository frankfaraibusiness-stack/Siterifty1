"use client";

import { useState } from "react";

function timeLeft(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return "Ended";
  const m = Math.ceil(diff / 60000);
  if (m < 60) return `${m}m left`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h left`;
  return `${Math.floor(h / 24)}d left`;
}

// Works for both polls and a theory's "Facts or Cap" verdict. Votes are stored
// server-side (POST /api/posts/vote); `preview` renders it inert in the composer.
export default function PollCard({ postId, poll, isOwner, resultsFirst, preview }) {
  const [state, setState] = useState(poll);
  const [picks, setPicks] = useState(poll.mine);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ended = state.endsAtMs != null && state.endsAtMs < Date.now();
  const voted = state.mine.length > 0;
  const showResults = preview
    ? !!resultsFirst
    : ended || (!editing && (voted || isOwner || resultsFirst));
  const total = state.multi ? state.voters : state.counts.reduce((a, b) => a + b, 0);
  const lead = Math.max(...state.counts);

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

      {error && <p className="poll-error" role="alert">{error}</p>}

      <div className="poll-foot">
        <span>
          {state.voters} {state.voters === 1 ? "vote" : "votes"}
          {state.endsAtMs != null && <> &middot; {ended ? "Final results" : timeLeft(state.endsAtMs)}</>}
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
