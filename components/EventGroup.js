"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { eventEndMs, eventPhase } from "@/lib/event-rules";
import { useMoney } from "./CurrencyProvider";
import { pad, span, split, useNow } from "./eventClock";

// The event's own group chat. It's made automatically when the event is
// published (the host is the admin), so nobody pastes a link. Rules are in
// lib/event-group.js; the server enforces them, this only shows them.
//   free event  : anyone can join while there's room. Members write, everyone
//                 else reads.
//   paid event  : locked behind the ticket, priced in the visitor's currency.
// The open panel starts with the event's name, date, status and countdown, so
// people are reminded what the chat is for and whether it has started or ended.
// The host also gets "End event" and "Delete group" there; the server checks
// the host again on every one of them.

const POLL_MS = 6000;

const CHAT =
  "M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z";
const LOCK = "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z";

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

const fmtDate = (ms) =>
  new Date(ms).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
const fmtClock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

// Short status for the toggle row and the panel header. Empty until mounted, so
// server and browser markup match.
function statusOf(ev, phase, now) {
  if (now === null) return "";
  if (phase === "upcoming") return `Starts in ${span(ev.startsAtMs - now)}`;
  if (phase === "live") return "Live now";
  return ev.closedAtMs != null ? "Ended by the host" : "Ended";
}

// Event name, date, status and a ticking countdown.
function Header({ post, ev, phase, now }) {
  const label = statusOf(ev, phase, now);
  const t = phase === "upcoming" && now !== null ? split(ev.startsAtMs - now) : null;
  const endedAt = eventEndMs(ev.startsAtMs, ev.endsAtMs, ev.closedAtMs);
  return (
    <header className="evg-hero" data-phase={phase}>
      <span className={`evg-status ${phase}`}>
        <i aria-hidden="true" />
        {label || "\u00a0"}
      </span>
      <h4 className="evg-name">{post.title || "Event"}</h4>
      {now !== null && (
        <p className="evg-date">
          <time dateTime={new Date(ev.startsAtMs).toISOString()}>
            {fmtDate(ev.startsAtMs)} · {fmtClock(ev.startsAtMs)}
          </time>
        </p>
      )}
      {t && (
        <p className="evg-cd" role="timer" aria-label={label}>
          <span><b>{pad(t.d)}</b>d</span>
          <span><b>{pad(t.h)}</b>h</span>
          <span><b>{pad(t.m)}</b>m</span>
          <span><b>{pad(t.s)}</b>s</span>
        </p>
      )}
      {phase === "live" && now !== null && (
        <p className="evg-line" role="timer">
          {ev.endsAtMs ? `Ends in ${span(ev.endsAtMs - now)}` : `Started ${span(now - ev.startsAtMs)} ago`}
        </p>
      )}
      {phase === "ended" && now !== null && (
        <p className="evg-line">
          {ev.closedAtMs != null ? "The host ended this event" : "This event ended"} {span(Math.max(0, now - endedAt))} ago.
        </p>
      )}
    </header>
  );
}

export default function EventGroup({ post, ev, isOwner, preview = false, onEvent }) {
  const money = useMoney();
  const price = ev.priceUsd > 0 ? ev.priceUsd : null;
  const ticket = ev.mine?.status === "going";
  const lockedHint = !!price && !isOwner && !ticket;

  const [open, setOpen] = useState(false);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");
  const [text, setText] = useState("");
  const [confirm, setConfirm] = useState(""); // "", "end" or "delete": the host's are-you-sure step
  const listRef = useRef(null);
  const stick = useRef(true);
  const now = useNow(ev.startsAtMs, ev.endsAtMs, ev.closedAtMs);
  const phase = now === null ? ev.phase || "upcoming" : eventPhase(ev.startsAtMs, ev.endsAtMs, now, ev.closedAtMs);

  // The server sends the event along with the group. When the host has ended it
  // (from here, or from another tab), the card above and this panel both follow.
  const syncEvent = useCallback(
    (next) => {
      if (next && (next.closedAtMs ?? null) !== (ev.closedAtMs ?? null)) onEvent?.(next);
    },
    [ev.closedAtMs, onEvent]
  );

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/posts/group?postId=${encodeURIComponent(post.id)}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(j.error || "Couldn’t load the group.");
      setErr("");
      setData(j);
      syncEvent(j.event);
    } catch {
      setErr("You appear to be offline. Try again in a moment.");
    }
  }, [post.id, syncEvent]);

  // While the chat is open, check for new messages every few seconds (and
  // again straight away when the person's ticket status changes).
  useEffect(() => {
    if (!open || preview) return undefined;
    load();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, preview, load, ticket]);

  const count = data?.messages?.length || 0;
  useEffect(() => {
    const el = listRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [count, open]);

  async function act(action, extra = {}) {
    if (busy) return false;
    setBusy(action);
    setErr("");
    try {
      const res = await fetch("/api/posts/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action, ...extra }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(j.error || "That didn’t work. Try again.");
        return false;
      }
      setData(j);
      syncEvent(j.event);
      if (action === "send") {
        setText("");
        stick.current = true;
      }
      return true;
    } catch {
      setErr("You appear to be offline. Try again in a moment.");
      return false;
    } finally {
      setBusy("");
    }
  }

  // Host controls: the second tap is the confirmation.
  async function hostAct(action) {
    await act(action);
    setConfirm("");
  }

  if (preview) {
    return (
      <div className="evg evg-preview">
        <p className="evg-title"><Icon d={CHAT} /> <b>Group chat</b></p>
        <p className="evg-sub">
          Made for your event automatically when you publish, with you as the admin.{" "}
          {price
            ? "It’s locked behind the ticket, so only people who’ve got one can read or write."
            : `Anyone can join until the ${ev.capacity ? `${ev.capacity} spots are` : "group is"} full. Members can write, everyone else can read.`}
        </p>
      </div>
    );
  }

  const g = data?.group;
  const who = g?.gone
    ? "Deleted by the host"
    : lockedHint
      ? `Ticket holders only · ${money(price)}`
      : price
        ? "Ticket holders chat here"
        : isOwner
          ? "You’re the admin"
          : "Free to join · members can chat";
  const status = statusOf(ev, phase, now);
  const sub = status ? `${status} · ${who}` : who;

  function onScroll(e) {
    const el = e.currentTarget;
    stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  return (
    <div className="evg">
      <button type="button" className="evg-toggle" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        <Icon d={lockedHint ? LOCK : CHAT} />
        <span className="evg-toggle-text">
          <b>Event group chat</b>
          <small suppressHydrationWarning>{sub}</small>
        </span>
        <span className="evg-toggle-act">{open ? "Hide" : "Open"}</span>
      </button>

      {open && (
        <div className="evg-panel">
          <Header post={post} ev={ev} phase={phase} now={now} />

          {isOwner && (
            <div className="evg-host" role="group" aria-label="Host controls" aria-live="polite">
              {confirm === "end" && (
                <>
                  <p>
                    End this event now? It shows as ended for everyone and nobody new can join.
                    The group chat stays open.
                  </p>
                  <div className="evg-host-btns">
                    <button type="button" className="evg-btn danger" disabled={!!busy} onClick={() => hostAct("endEvent")}>
                      {busy === "endEvent" ? "Ending…" : "Yes, end event"}
                    </button>
                    <button type="button" className="evg-btn" disabled={!!busy} onClick={() => setConfirm("")}>Keep it going</button>
                  </div>
                </>
              )}
              {confirm === "delete" && (
                <>
                  <p>
                    Delete the group? Every message is removed for everyone and the chat closes.
                    The event stays up, and you can start a new group later.
                  </p>
                  <div className="evg-host-btns">
                    <button type="button" className="evg-btn danger" disabled={!!busy} onClick={() => hostAct("deleteGroup")}>
                      {busy === "deleteGroup" ? "Deleting…" : "Yes, delete group"}
                    </button>
                    <button type="button" className="evg-btn" disabled={!!busy} onClick={() => setConfirm("")}>Keep the group</button>
                  </div>
                </>
              )}
              {confirm === "" && (
                <div className="evg-host-btns">
                  {phase !== "ended" && (
                    <button type="button" className="evg-btn danger" disabled={!!busy} onClick={() => setConfirm("end")}>End event</button>
                  )}
                  {g && !g.gone && (
                    <button type="button" className="evg-btn danger" disabled={!!busy} onClick={() => setConfirm("delete")}>Delete group</button>
                  )}
                  {g?.gone && (
                    <button type="button" className="evg-btn" disabled={!!busy} onClick={() => act("newGroup")}>
                      {busy === "newGroup" ? "Starting…" : "Start a new group"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {!g && !err && <p className="evg-sub">Loading…</p>}
          {err && <p className="evc-err" role="alert">{err}</p>}

          {g?.gone && (
            <div className="evg-lock">
              <Icon d={CHAT} />
              <div>
                <b>This group was deleted</b>
                <p>{isOwner ? "The messages are gone for good. Start a new group whenever you like." : "The host deleted the group chat."}</p>
              </div>
            </div>
          )}

          {g?.locked && (
            <div className="evg-lock">
              <Icon d={LOCK} />
              <div>
                <b>This group is for ticket holders</b>
                <p suppressHydrationWarning>
                  Get your ticket for {money(g.priceUsd)} and the group unlocks right away.
                </p>
              </div>
            </div>
          )}

          {g && !g.locked && !g.gone && (
            <>
              <div className="evg-head">
                <span>
                  {g.guests + 1} in the group
                  {g.slots ? ` · ${Math.max(0, g.slots - g.guests)} place${g.slots - g.guests === 1 ? "" : "s"} left` : ""}
                </span>
                {g.isAdmin && <em className="evg-badge">You’re the admin</em>}
              </div>

              <ul className="evg-list" ref={listRef} onScroll={onScroll} aria-label="Group messages" aria-live="polite">
                {data.messages.length === 0 && <li className="evg-empty">No messages yet.{g.canWrite ? " Say hi." : ""}</li>}
                {data.messages.map((m) => (
                  <li key={m.id} className={`evg-msg${m.mine ? " mine" : ""}${m.deleted ? " gone" : ""}`}>
                    <div className="evg-meta">
                      <b>@{m.user}</b>
                      {m.host && <em className="evg-badge">Admin</em>}
                      {m.at && <time dateTime={new Date(m.at).toISOString()}>{new Date(m.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</time>}
                    </div>
                    <p>{m.deleted ? "Message removed" : m.text}</p>
                    {!m.deleted && (m.mine || g.isAdmin) && (
                      <span className="evg-tools">
                        <button type="button" className="evc-link" disabled={!!busy} onClick={() => act("delete", { messageId: m.id })}>Delete</button>
                        {g.isAdmin && !m.mine && !m.host && m.uid && (
                          <button type="button" className="evc-link" disabled={!!busy} onClick={() => act("remove", { targetUid: m.uid })}>Remove from group</button>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>

              {g.canWrite ? (
                <>
                  <form
                    className="evg-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (text.trim()) act("send", { text });
                    }}
                  >
                    <textarea
                      value={text}
                      rows={1}
                      maxLength={500}
                      placeholder="Message the group"
                      aria-label="Message the group"
                      onChange={(e) => setText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          e.preventDefault();
                          if (text.trim()) act("send", { text });
                        }
                      }}
                    />
                    <button type="submit" className="evc-btn primary" disabled={!!busy || !text.trim()}>Send</button>
                  </form>
                  {!g.isAdmin && (
                    <button type="button" className="evc-link" disabled={!!busy} onClick={() => act("leave")}>Leave group</button>
                  )}
                </>
              ) : (
                <div className="evg-readonly">
                  <p>You can read the group, but only members can write in it.</p>
                  {g.canJoin ? (
                    <button type="button" className="evc-btn primary" disabled={!!busy} onClick={() => act("join")}>
                      {busy === "join" ? "..." : "Join the group"}
                    </button>
                  ) : (
                    g.note && <p className="evg-sub">{g.note}</p>
                  )}
                </div>
              )}

              {g.isAdmin && g.people?.length > 0 && (
                <details className="evg-people">
                  <summary>Members ({g.people.length})</summary>
                  <ul>
                    {g.people.map((p) => (
                      <li key={p.uid}>
                        <span>@{p.user}</span>
                        <button type="button" className="evc-link" disabled={!!busy} onClick={() => act("remove", { targetUid: p.uid })}>Remove</button>
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
