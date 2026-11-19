"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { post } from "@/components/messages/api";
import { ArrowLeftIcon } from "@/components/icons";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { LOBBY_LIMITS, ROOM_TOPICS } from "@/lib/lobby-config";

// "Start a session": a name, a topic and a size. The sizes offered (and how many
// sessions you can run at once) depend on your plan.
export default function SessionSheet({ me, onClose, onCreated }) {
  useScrollLock(true);
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState(ROOM_TOPICS[0]);
  const [max, setMax] = useState(me.sizes[Math.min(1, me.sizes.length - 1)]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await post("/api/lobby", { action: "create-room", title, topic, max });
      onCreated(d.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="lb-sheet-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="lb-sheet" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Start a session">
        <button type="button" className="lb-sheet-close" onClick={onClose} aria-label="Back">
          <ArrowLeftIcon />
        </button>
        <h2>Start a session</h2>
        <p className="lb-fine">A live room you host. It stays open while people are chatting and closes itself after a few quiet hours.</p>
        <label>
          Session name
          <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} maxLength={LOBBY_LIMITS.title} placeholder="Trailer 2 frame-by-frame" />
        </label>
        <label>
          Topic
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>
            {ROOM_TOPICS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <label>
          Size
          <select value={max} onChange={(e) => setMax(Number(e.target.value))}>
            {me.sizes.map((n) => <option key={n} value={n}>Up to {n} people</option>)}
          </select>
        </label>
        {me.nextPlan && <p className="lb-fine">Bigger sessions and more of them unlock as you <Link href="/upgrade">rank up</Link>.</p>}
        {error && <p className="lb-error" role="alert">{error}</p>}
        <div className="lb-sheet-foot">
          <button type="button" className="lb-btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="lb-btn solid" disabled={busy || title.trim().length < 3}>Open session</button>
        </div>
      </form>
    </div>
  );
}
