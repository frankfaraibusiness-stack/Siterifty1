"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { post } from "@/components/messages/api";
import PlanBadges from "@/components/PlanBadges";
import { CREW_SIZES, LOBBY_LIMITS, PLATFORMS, PLAYSTYLES, REGIONS } from "@/lib/lobby-config";
import Avatar from "./Avatar";

const API = "/api/lobby";

function left(ms) {
  const h = Math.max(0, Math.round((ms - Date.now()) / 3_600_000));
  return h >= 24 ? `${Math.round(h / 24)}d left` : `${Math.max(1, h)}h left`;
}

// Looking-for-crew board. One post per member; it lasts two days. Wave at a
// post to tell the poster you're in: they see who waved on their own card.
export default function CrewBoard({ live, setLive, notify }) {
  const mine = live.crew.find((c) => c.mine) || null;
  const [open, setOpen] = useState(!mine && live.crew.length === 0);
  const [form, setForm] = useState({ platform: mine?.platform || PLATFORMS[0], style: mine?.style || PLAYSTYLES[0], region: mine?.region || REGIONS[0], size: mine?.size || 4, note: mine?.note || "" });
  const [filter, setFilter] = useState({ platform: "", style: "" });
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const shown = useMemo(
    () => live.crew.filter((c) => (!filter.platform || c.platform === filter.platform || c.platform === PLATFORMS[3]) && (!filter.style || c.style === filter.style)),
    [live.crew, filter]
  );

  // Re-read the lobby after a change so the board is exactly what the server has.
  const refresh = async () => {
    const res = await fetch(API, { cache: "no-store" });
    if (res.ok) setLive(await res.json());
  };

  async function run(body, success) {
    setBusy(true);
    try {
      const d = await post(API, body);
      await refresh();
      if (success) notify(success);
      return d;
    } catch (err) {
      notify(err.message);
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e) {
    e.preventDefault();
    const d = await run({ action: "crew-post", ...form }, mine ? "Your post is updated." : "You’re on the board for 48 hours.");
    if (d) setOpen(false);
  }

  return (
    <div className="lb-crew">
      <div className="lb-h-row">
        <h2 className="lb-h">Crew finder</h2>
        <button type="button" className="lb-btn" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
          {open ? "Close" : mine ? "Edit my post" : "Post what I’m after"}
        </button>
      </div>

      {open && (
        <form className="lb-form" onSubmit={submit}>
          <div className="lb-form-grid">
            <label>
              Platform
              <select value={form.platform} onChange={(e) => set("platform", e.target.value)}>
                {PLATFORMS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>
              Playstyle
              <select value={form.style} onChange={(e) => set("style", e.target.value)}>
                {PLAYSTYLES.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>
              Region
              <select value={form.region} onChange={(e) => set("region", e.target.value)}>
                {REGIONS.map((x) => <option key={x}>{x}</option>)}
              </select>
            </label>
            <label>
              Crew size
              <select value={form.size} onChange={(e) => set("size", Number(e.target.value))}>
                {CREW_SIZES.map((x) => <option key={x} value={x}>{x} people</option>)}
              </select>
            </label>
          </div>
          <label>
            What are you after? <span className="lb-fine">(optional)</span>
            <textarea rows={3} maxLength={LOBBY_LIMITS.note} value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Evenings UK time, chill but serious about heists, mics on…" />
          </label>
          <div className="lb-form-foot">
            <span className="lb-fine">{form.note.length}/{LOBBY_LIMITS.note} · your post stays up for 48 hours</span>
            <button type="submit" className="lb-btn solid" disabled={busy}>{mine ? "Update post" : "Post to the board"}</button>
          </div>
        </form>
      )}

      <div className="lb-filters">
        <select aria-label="Filter by platform" value={filter.platform} onChange={(e) => setFilter((f) => ({ ...f, platform: e.target.value }))}>
          <option value="">Any platform</option>
          {PLATFORMS.slice(0, 3).map((x) => <option key={x}>{x}</option>)}
        </select>
        <select aria-label="Filter by playstyle" value={filter.style} onChange={(e) => setFilter((f) => ({ ...f, style: e.target.value }))}>
          <option value="">Any playstyle</option>
          {PLAYSTYLES.map((x) => <option key={x}>{x}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="lb-empty">
          <b>{live.crew.length ? "Nobody matches those filters" : "The board is empty"}</b>
          <p>{live.crew.length ? "Loosen a filter to see more crews." : "Post what you’re after and let people come to you."}</p>
        </div>
      ) : (
        <ul className="lb-crew-list">
          {shown.map((c) => (
            <li key={c.id} className={`lb-crew-card${c.mine ? " mine" : ""}`}>
              <div className="lb-crew-top">
                <Link href={`/u/${c.username}`} className="lb-person">
                  <Avatar p={c} size={38} />
                  <span className="lb-person-text">
                    <b>{c.displayName}<PlanBadges plan={c.plan} />{c.mine ? <em> (you)</em> : null}</b>
                    <small>@{c.username} · {left(c.expiresAt)}</small>
                  </span>
                </Link>
              </div>
              <div className="lb-tags">
                <span>{c.platform}</span>
                <span>{c.style}</span>
                <span>{c.region}</span>
                <span>Crew of {c.size}</span>
              </div>
              {c.note && <p className="lb-crew-note">{c.note}</p>}
              {c.mine ? (
                <div className="lb-crew-foot">
                  <span className="lb-fine">
                    {c.waveCount === 0 ? "No waves yet." : `${c.waveCount} wave${c.waveCount === 1 ? "" : "s"}: `}
                    {c.wavers.map((w, i) => (
                      <span key={w}>
                        {i > 0 && ", "}
                        <Link href={`/u/${w}`} className="lb-link">@{w}</Link>
                      </span>
                    ))}
                  </span>
                  <button type="button" className="lb-btn danger" disabled={busy} onClick={() => run({ action: "crew-remove" }, "Post removed.")}>Remove</button>
                </div>
              ) : (
                <div className="lb-crew-foot">
                  <span className="lb-fine">{c.waveCount} wave{c.waveCount === 1 ? "" : "s"}</span>
                  <span className="lb-crew-actions">
                    <Link href={`/messages?with=${encodeURIComponent(c.username)}`} className="lb-btn">Message</Link>
                    <button type="button" className={`lb-btn${c.waved ? " solid" : ""}`} disabled={busy} aria-pressed={c.waved} onClick={() => run({ action: "crew-wave", id: c.id })}>
                      {c.waved ? "Waved ✓" : "Wave"}
                    </button>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
