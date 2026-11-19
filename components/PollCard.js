"use client";

import { useEffect, useRef, useState } from "react";
import { pollSummary } from "@/lib/card-helpers";

// Works for both polls and a theory's "Facts or Cap" verdict. Votes are stored
// server-side (POST /api/posts/vote); `preview` renders it inert in the composer.
// There is no Vote button: a single-choice poll votes on tap, and a pick-any poll
// saves on its own once the viewer pauses for a moment after their last tap.
const AUTO_VOTE_MS = 1100;

const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));

export default function PollCard({ postId, poll, isOwner, resultsFirst, preview }) {
  const [state, setState] = useState(poll);
  const [picks, setPicks] = useState(poll.mine);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false); // a pick-any vote is waiting to auto-save
  const timer = useRef(null);
  const clearTimer = () => {
    clearTimeout(timer.current);
    timer.current = null;
    setPending(false);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  // Re-checked every 30s so "2h left" ticks down and a poll flips to its final
  // results on its own. Only polls with an end time need the timer. (A poll
  // with no end time stays live; once an expiring one runs out it is deleted on
  // the next visit, see lib/poll-expiry.js.)
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
    clearTimer();
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
    if (!state.multi) {
      send([i]);
      return;
    }
    const next = picks.includes(i) ? picks.filter((x) => x !== i) : [...picks, i];
    setPicks(next);
    if (preview) return;
    // Restart the countdown on every tap so people can tick several options
    // before it saves. Nothing to save if they're back to what's already stored.
    clearTimer();
    if (sameSet(next, state.mine)) return;
    setPending(true);
    timer.current = setTimeout(() => send(next), AUTO_VOTE_MS);
  }

  return (
    <div className={`poll poll-${state.kind}`}>
      {!verdict && (
        <div className="poll-head">
          <span className={`poll-status${ended ? " ended" : ""}`}>
            <i aria-hidden="true" />
            {ended ? "Final results" : "Live"}
          </span>
          {!ended && <span className="poll-left" suppressHydrationWarning>{sum.left || "No expiry"}</span>}
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

      {!showResults && state.multi && !preview && (
        <p className="poll-hint" role="status">
          {busy ? "Saving your vote..." : pending ? "Saving..." : "Pick any. Your vote saves automatically."}
        </p>
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
          <button type="button" className="poll-link" onClick={() => { clearTimer(); setEditing(false); setPicks(state.mine); }}>
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
