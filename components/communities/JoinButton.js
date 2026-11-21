"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { communityApi } from "@/lib/community-client";
import { FIXED_RULE } from "@/lib/community-schema";
import FullScreen from "@/components/FullScreen";

// state: none | member | owner | pending | banned
export default function JoinButton({ community: c, state, signedIn, big }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [asking, setAsking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [note, setNote] = useState(false);
  const cls = (v) => `gc-btn ${v}${big ? " big" : ""}`;

  async function run(action, extra) {
    setBusy(true); setError("");
    try {
      await communityApi(action, { communityId: c.id, ...extra });
      setAsking(false); setLeaving(false);
      router.refresh();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  if (state === "banned") return <span className="gc-state-note">You can’t join this community.</span>;
  if (state === "owner") return <span className={cls("ghost")} aria-disabled="true">You run this</span>;
  if (state === "member") {
    return leaving ? (
      <span className="gc-inline-confirm">
        <button className={cls("danger")} disabled={busy} onClick={() => run("leave")}>{busy ? "Leaving…" : "Yes, leave"}</button>
        <button className={cls("ghost")} onClick={() => setLeaving(false)}>Stay</button>
      </span>
    ) : (
      <button className={cls("ghost joined")} onClick={() => setLeaving(true)}><span className="gc-tick" aria-hidden="true">✓</span> Joined</button>
    );
  }
  if (state === "pending") {
    return (
      <span className="gc-inline-confirm">
        <span className={cls("ghost")} aria-disabled="true">Request sent</span>
        <button className="gc-link-btn" disabled={busy} onClick={() => run("cancel-request")}>Cancel</button>
      </span>
    );
  }

  const label = c.privacy === "private" ? "Request to join" : "Join";
  const onClick = () => {
    if (!signedIn) return setNote(true);
    if (c.privacy === "private") setAsking(true); else run("join");
  };
  return (
    <>
      <button className={cls("solid")} disabled={busy} onClick={onClick} style={{ "--a": c.a, "--b": c.b }}>
        {busy ? "Joining…" : label}
      </button>
      {note && <span className="gc-state-note" role="status">Log in from the top bar first.</span>}
      {error && !asking && <span className="gc-state-note bad" role="alert">{error}</span>}
      {asking && <RequestModal c={c} busy={busy} error={error} onClose={() => { setAsking(false); setError(""); }} onSend={(answers) => run("request", { answers, agreed: true })} />}
    </>
  );
}

function RequestModal({ c, busy, error, onClose, onSend }) {
  const [answers, setAnswers] = useState(() => c.questions.map(() => ""));
  const [agreed, setAgreed] = useState(false);
  const missing = c.questions.some((q, i) => q.required && answers[i].trim().length < 2);
  const rules = [FIXED_RULE, ...c.rules];
  return (
    <FullScreen
      title={`Request to join ${c.name}`}
      subtitle="Admins read your answers before letting you in"
      onClose={onClose}
      size="sm"
      className="gc-fs"
      style={{ "--a": c.a, "--b": c.b }}
      footer={
        <>
          {error && <p className="cmp-error banner" role="alert">{error}</p>}
          <div className="fs-foot-row">
            <button type="button" className="gc-btn ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="gc-btn solid grow" disabled={busy || missing || !agreed} onClick={() => onSend(answers)}>
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        </>
      }
    >
      <p className="gc-req-lead">It usually takes a short wait. Answer honestly: this is what the admins see first.</p>
      <div className="gc-req-body">
        {c.questions.map((q, i) => (
          <label key={q.id} className="gc-q">
            <span>{q.text}{q.required ? "" : " (optional)"}</span>
            <textarea className="cmp-input" rows={4} maxLength={400} value={answers[i]} onChange={(e) => setAnswers(answers.map((a, j) => (j === i ? e.target.value : a)))} />
          </label>
        ))}
        <details className="gc-rules-peek">
          <summary>Read the {rules.length} community rules</summary>
          <ol>{rules.map((r) => <li key={r.title}><b>{r.title}</b>{r.body && <small>{r.body}</small>}</li>)}</ol>
        </details>
        <label className="gc-check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>I’ll follow the rules and keep it about GTA 6.</span>
        </label>
      </div>
    </FullScreen>
  );
}
