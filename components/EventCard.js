"use client";

import { useState } from "react";
import Link from "next/link";
import { EVENT_JOIN, EVENT_MODES, EVENT_PRIVACY } from "@/lib/post-schema";
import { TICKETS_FREE_WHILE_TESTING, eventEndMs, eventPhase } from "@/lib/event-rules";
import { useMoney } from "./CurrencyProvider";
import EventGroup from "./EventGroup";
import { pad, span, split, useNow } from "./eventClock";
import { capacityState, dayChip, needsClamp } from "@/lib/card-helpers";
import { RichTokens, TagList } from "./RichText";

function Countdown({ ev, now }) {
  if (now === null) return <div className="evc-cd" aria-hidden="true" />;
  const phase = eventPhase(ev.startsAtMs, ev.endsAtMs, now, ev.closedAtMs);
  if (phase === "upcoming") {
    const t = split(ev.startsAtMs - now);
    return (
      <div className="evc-cd" role="timer" aria-label={`Starts in ${span(ev.startsAtMs - now)}`}>
        <span className="evc-cd-label">Starts in</span>
        <div className="evc-cd-boxes">
          {[["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]].map(([k, label]) => (
            <div key={k}>
              <b>{pad(t[k])}</b>
              <small>{label}</small>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (phase === "live") {
    return (
      <div className="evc-cd live" role="timer">
        <span className="evc-live"><i aria-hidden="true" />Live now</span>
        <small>
          {ev.endsAtMs ? `Ends in ${span(ev.endsAtMs - now)}` : `Started ${span(now - ev.startsAtMs)} ago`}
        </small>
      </div>
    );
  }
  return (
    <div className="evc-cd ended">
      <span className="evc-cd-label">{ev.closedAtMs != null ? "The host ended this event" : "This event has ended"}</span>
    </div>
  );
}

const fmtDay = (ms) => new Date(ms).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
const fmtClock = (ms) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

function whenText(ev) {
  const start = fmtClock(ev.startsAtMs);
  if (!ev.endsAtMs) return start;
  const sameDay = new Date(ev.endsAtMs).toDateString() === new Date(ev.startsAtMs).toDateString();
  return `${start} to ${fmtClock(ev.endsAtMs)}${sameDay ? "" : " (next day)"}`;
}

const mapsUrl = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
const osmUrl = (p) => `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`;
const embedUrl = (p) =>
  `https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.008},${p.lat - 0.0048},${p.lng + 0.008},${p.lat + 0.0048}&layer=mapnik&marker=${p.lat},${p.lng}`;
const isHttp = (u) => /^https?:\/\//i.test(u || "");

// --- add to calendar (.ics) --------------------------------------------------
const icsText = (s) => String(s || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const icsDate = (ms) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
function fold(line) {
  const out = [line.slice(0, 74)];
  for (let rest = line.slice(74); rest.length; rest = rest.slice(73)) out.push(` ${rest.slice(0, 73)}`);
  return out.join("\r\n");
}

function downloadIcs(post, ev) {
  const where =
    ev.mode === "irl"
      ? [ev.venue, ev.address].filter(Boolean).join(", ")
      : ev.mode === "online"
      ? ev.link
      : [post.location, ev.spot].filter(Boolean).join(" - ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//GTAFanbase//Events//EN",
    "BEGIN:VEVENT",
    `UID:${post.id}@gta6fanbase`,
    `DTSTAMP:${icsDate(Date.now())}`,
    `DTSTART:${icsDate(ev.startsAtMs)}`,
    `DTEND:${icsDate(Math.max(ev.startsAtMs + 60_000, eventEndMs(ev.startsAtMs, ev.endsAtMs, ev.closedAtMs)))}`,
    `SUMMARY:${icsText(post.title)}`,
    `DESCRIPTION:${icsText(post.text)}`,
    where && `LOCATION:${icsText(where)}`,
    `URL:${location.origin}/p/${post.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  const blob = new Blob([lines.map(fold).join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${(post.title || "event").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "event"}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function Icon({ d }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
const PIN = <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>;
const CLOCK = <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>;
const LOCK = <><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>;
const USERS = <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.8a3.5 3.5 0 0 1 0 6.4M18 14.8c2 .6 3.2 2.4 3.5 5.2" /></>;

function Person({ p, children }) {
  return (
    <li>
      <Link href={`/u/${encodeURIComponent(p.user)}`}>@{p.user}</Link>
      {p.plusOne && <em>+1</em>}
      {children}
    </li>
  );
}

// The event as it appears in the feed and on its own page. `post.event` is the
// server's per-viewer view of the event (see lib/event-rules.js serializeEvent):
// counts, the guest list and any hidden pin are already decided there.
export default function EventCard({ post, preview = false, detail = false }) {
  const [live, setLive] = useState(null); // the server's latest answer after an RSVP
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [plus, setPlus] = useState(false);
  const [more, setMore] = useState(false);
  const money = useMoney();
  const ev = live ?? post.event;
  const price = ev.priceUsd > 0 ? ev.priceUsd : null; // null = free entry
  const now = useNow(ev.startsAtMs, ev.endsAtMs, ev.closedAtMs);
  const phase = now === null ? ev.phase || "upcoming" : eventPhase(ev.startsAtMs, ev.endsAtMs, now, ev.closedAtMs);
  const isOwner = post.isOwner;
  const mine = ev.mine;
  const cap = ev.capacity;
  const full = cap !== null && ev.going >= cap;
  const left = cap !== null ? Math.max(0, cap - ev.going) : null;
  const joinLabel = EVENT_JOIN.find((j) => j.value === ev.join)?.label;
  const privacyLabel = EVENT_PRIVACY.find((p) => p.value === ev.privacy)?.label;
  const modeLabel = EVENT_MODES.find((m) => m.value === ev.mode)?.label;
  const aboutLong = needsClamp(post.text);
  const capInfo = capacityState(ev.going, cap, { waitlist: ev.waitlist, waiting: ev.waitlistCount });
  const soon = now === null ? "" : dayChip(ev.startsAtMs, now);

  async function rsvp(action, extra = {}) {
    if (preview || busy) return;
    setBusy(action + (extra.targetUid || ""));
    setErr("");
    try {
      const res = await fetch("/api/posts/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId: post.id, action, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return setErr(data.error || "Couldn’t update your RSVP.");
      setLive(data.event);
    } catch {
      setErr("You appear to be offline. Try again in a moment.");
    } finally {
      setBusy("");
    }
  }

  const status = mine?.status;
  let main;
  if (isOwner) {
    main = <span className="evc-host"><Icon d={USERS} /> You’re hosting this</span>;
  } else if (phase === "ended") {
    main = <button type="button" className="evc-btn" disabled>Event ended</button>;
  } else if (status === "going") {
    main = (
      <>
        <span className="evc-state ok">You’re going ✓</span>
        <button type="button" className="evc-link" disabled={!!busy} onClick={() => rsvp("leave")}>Can’t make it</button>
      </>
    );
  } else if (status === "pending") {
    main = (
      <>
        <span className="evc-state">Request sent</span>
        <button type="button" className="evc-link" disabled={!!busy} onClick={() => rsvp("leave")}>Cancel request</button>
      </>
    );
  } else if (status === "waitlist") {
    main = (
      <>
        <span className="evc-state">On the waitlist</span>
        <button type="button" className="evc-link" disabled={!!busy} onClick={() => rsvp("leave")}>Leave waitlist</button>
      </>
    );
  } else if (!ev.canJoin) {
    main = <button type="button" className="evc-btn" disabled>{/Sign in/.test(ev.joinNote) ? "Sign in to join" : "Not open to you"}</button>;
  } else if (full && !ev.waitlist) {
    main = <button type="button" className="evc-btn" disabled>Event full</button>;
  } else {
    main = (
      <button type="button" className="evc-btn primary" disabled={!!busy} onClick={() => rsvp("join", { plusOne: plus })} suppressHydrationWarning>
        {busy === "join"
          ? "..."
          : full
            ? "Join waitlist"
            : price
              ? `${ev.approval ? "Request to join" : "Get ticket"} · ${money(price)}`
              : ev.approval
                ? "Request to join"
                : "Join event"}
      </button>
    );
  }

  const canPlus = ev.plusOnes && !isOwner && phase !== "ended" && ev.canJoin !== false;
  const plusOn = status ? !!mine?.plusOne : plus;
  const shown = ev.guests.slice(0, 3);
  const others = Math.max(0, ev.people - shown.length);

  return (
    <section className="evc" aria-label="Event details">
      <div className="evc-top">
        <div className="evc-date" aria-hidden={now === null}>
          {now !== null && (
            <>
              <small>{new Date(ev.startsAtMs).toLocaleDateString([], { month: "short" })}</small>
              <b>{new Date(ev.startsAtMs).getDate()}</b>
            </>
          )}
        </div>
        <div className="evc-when">
          <span className="evc-cat">{ev.category}</span>
          {price && <span className="evc-price" suppressHydrationWarning>{money(price)}</span>}
          {soon && <span className="evc-soon">{soon}</span>}
          {now !== null && (
            <>
              <b>{fmtDay(ev.startsAtMs)}</b>
              <span><Icon d={CLOCK} /> {whenText(ev)}{ev.tz ? ` · ${ev.tz.replace(/_/g, " ")}` : ""}</span>
            </>
          )}
        </div>
      </div>

      <Countdown ev={ev} now={now} />

      <div className="evc-block">
        <h4><Icon d={PIN} /> {modeLabel}</h4>
        {ev.mode === "ingame" && (
          <>
            <p><b>{post.location}</b></p>
            {ev.spot && <p className="evc-sub">Meet at {ev.spot}</p>}
          </>
        )}
        {ev.mode === "irl" && (ev.spotHidden ? (
          <p className="evc-lock"><Icon d={LOCK} /> The exact spot unlocks when you RSVP.</p>
        ) : (
          <>
            <p><b>{ev.venue}</b></p>
            {ev.address && <p className="evc-sub">{ev.address}</p>}
            {ev.spot && <p className="evc-sub">Meet at {ev.spot}</p>}
            {ev.pin && (
              <div className="evc-maps">
                <a href={mapsUrl(ev.pin)} target="_blank" rel="noopener noreferrer">Google Maps</a>
                <a href={osmUrl(ev.pin)} target="_blank" rel="noopener noreferrer">OpenStreetMap</a>
              </div>
            )}
            {detail && ev.pin && (
              <iframe className="evc-map" title="Map of the meeting spot" src={embedUrl(ev.pin)} loading="lazy" referrerPolicy="no-referrer" />
            )}
          </>
        ))}
        {ev.mode === "online" && ev.spot && <p className="evc-sub">{ev.spot}</p>}
        {ev.platforms.length > 0 && (
          <ul className="evc-chips" aria-label="Platforms">
            {ev.platforms.map((p) => <li key={p}>{p}</li>)}
          </ul>
        )}
        {isHttp(ev.link) && (
          <a className="evc-ext" href={ev.link} target="_blank" rel="noopener noreferrer nofollow ugc">
            {ev.mode === "online" ? "Open the link" : "Event link"} <span aria-hidden="true">&#8599;</span>
          </a>
        )}
      </div>

      {post.text && (
        <div className="evc-block">
          <h4>About</h4>
          <p className={`evc-about${aboutLong && !more && !detail ? " clamp" : ""}`}><RichTokens text={post.text} inert={preview} /></p>
          {aboutLong && !detail && (
            <button type="button" className="evc-link" onClick={() => setMore((v) => !v)}>{more ? "Show less" : "Read more"}</button>
          )}
        </div>
      )}

      {(ev.bring || ev.rules) && (
        <details className="evc-more" open={detail}>
          <summary>Good to know</summary>
          {ev.bring && <p><b>Bring / know:</b> {ev.bring}</p>}
          {ev.rules && <p><b>House rules:</b> {ev.rules}</p>}
        </details>
      )}

      <ul className="evc-chips meta" aria-label="Event settings">
        <li>Open to: {joinLabel}</li>
        <li>{privacyLabel}</li>
        <li suppressHydrationWarning>{price ? `Entry ${money(price)}` : "Free entry"}</li>
        {ev.approval && <li>Host approves RSVPs</li>}
        {ev.plusOnes && <li>+1 welcome</li>}
      </ul>
      <TagList post={post} inert={preview} />

      <div className="evc-count">
        <div className="evc-count-top">
          <span className="evc-n"><Icon d={USERS} /><b>{ev.going}</b> going</span>
          <span className="evc-left" data-tone={capInfo.tone}>
            {capInfo.tone === "filling" && "Filling fast · "}
            {capInfo.label}
          </span>
        </div>
        {cap !== null && (
          <div className="evc-bar" data-tone={capInfo.tone} role="progressbar" aria-valuemin={0} aria-valuemax={cap} aria-valuenow={Math.min(ev.going, cap)} aria-label="Spots taken">
            <i style={{ width: `${capInfo.pct}%` }} />
          </div>
        )}
        {ev.showGuests ? (
          <p className="evc-who">
            {ev.people === 0
              ? "Nobody yet. Be the first."
              : `${shown.map((g) => `@${g.user}`).join(", ")}${others ? ` and ${others} other${others === 1 ? "" : "s"}` : ""} ${ev.people === 1 ? "is" : "are"} going`}
          </p>
        ) : (
          <p className="evc-who">The host keeps the guest list private.</p>
        )}
        {ev.waitlistCount > 0 && cap !== null && left > 0 && <p className="evc-who">{ev.waitlistCount} waiting for a spot</p>}
        {isOwner && ev.pendingCount > 0 && <p className="evc-req">{ev.pendingCount} request{ev.pendingCount === 1 ? "" : "s"} waiting for you</p>}
      </div>

      {canPlus && (
        <label className="evc-plus">
          <input
            type="checkbox"
            checked={plusOn}
            disabled={!!busy || preview}
            onChange={(e) => (status ? rsvp("join", { plusOne: e.target.checked }) : setPlus(e.target.checked))}
          />
          <span>Bringing a +1</span>
        </label>
      )}

      <div className="evc-actions">
        <div className="evc-main">{main}</div>
        <button type="button" className="evc-ics" onClick={() => !preview && downloadIcs(post, ev)}>Add to calendar</button>
      </div>
      {!isOwner && !ev.canJoin && ev.joinNote && !/Sign in/.test(ev.joinNote) && <p className="evc-err" role="status">{ev.joinNote}</p>}
      {price && !isOwner && !status && phase !== "ended" && ev.canJoin && TICKETS_FREE_WHILE_TESTING && (
        <p className="evc-note">Ticket checkout is still in testing, so you won’t be charged yet.</p>
      )}
      {err && <p className="evc-err" role="alert">{err}</p>}

      <EventGroup post={post} ev={ev} isOwner={isOwner} preview={preview} onEvent={setLive} />

      {(ev.guests.length > 0 || (isOwner && (ev.pending.length > 0 || ev.waiting.length > 0))) && (
        <details className="evc-people">
          <summary>{isOwner ? "Manage guests" : `See who’s going (${ev.people})`}</summary>
          {isOwner && ev.pending.length > 0 && (
            <>
              <h5>Requests</h5>
              <ul>
                {ev.pending.map((p) => (
                  <Person key={p.uid} p={p}>
                    <span className="evc-row-btns">
                      <button type="button" disabled={!!busy} onClick={() => rsvp("approve", { targetUid: p.uid })}>Approve</button>
                      <button type="button" disabled={!!busy} onClick={() => rsvp("decline", { targetUid: p.uid })}>Decline</button>
                    </span>
                  </Person>
                ))}
              </ul>
            </>
          )}
          {isOwner && ev.waiting.length > 0 && (
            <>
              <h5>Waitlist</h5>
              <ul>
                {ev.waiting.map((p) => (
                  <Person key={p.uid} p={p}>
                    <span className="evc-row-btns">
                      <button type="button" disabled={!!busy} onClick={() => rsvp("remove", { targetUid: p.uid })}>Remove</button>
                    </span>
                  </Person>
                ))}
              </ul>
            </>
          )}
          {ev.guests.length > 0 && (
            <>
              {isOwner && <h5>Going</h5>}
              <ul>
                {ev.guests.map((p) => (
                  <Person key={p.uid || p.user} p={p}>
                    {isOwner && (
                      <span className="evc-row-btns">
                        <button type="button" disabled={!!busy} onClick={() => rsvp("remove", { targetUid: p.uid })}>Remove</button>
                      </span>
                    )}
                  </Person>
                ))}
              </ul>
              {ev.people > ev.guests.length && <p className="evc-sub">and {ev.people - ev.guests.length} more</p>}
            </>
          )}
        </details>
      )}
    </section>
  );
}
