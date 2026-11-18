"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { post } from "@/components/messages/api";
import PlanBadges from "@/components/PlanBadges";
import { PING_MS, STATUSES, statusLabel, untilLabel } from "@/lib/lobby-config";
import Avatar from "./Avatar";
import RoomChat from "./RoomChat";
import CrewBoard from "./CrewBoard";
import SessionSheet from "./SessionSheet";

const API = "/api/lobby";
const send = (body) => post(API, body);

const TABS = [
  ["rooms", "Rooms"],
  ["crew", "Crew finder"],
  ["people", "Who’s here"],
];

export default function LobbyApp({ user, soon }) {
  const [live, setLive] = useState(null);
  const [tab, setTab] = useState("rooms");
  const [roomId, setRoomId] = useState(null);
  const [status, setStatus] = useState("cruising");
  const [notice, setNotice] = useState("");
  const [sheet, setSheet] = useState(false);
  const [now, setNow] = useState(null);
  const roomRef = useRef(null);
  const statusRef = useRef("cruising");
  const noticeTimer = useRef(null);

  const notify = useCallback((text) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 4500);
  }, []);

  const pingNow = useCallback(async (extra = {}) => {
    const d = await send({ action: "ping", status: statusRef.current, roomId: roomRef.current, ...extra });
    setLive(d);
    return d;
  }, []);

  const leaveRoomLocally = useCallback(() => {
    roomRef.current = null;
    setRoomId(null);
  }, []);

  // The check-in loop: tells the server you're here, and brings back the live
  // lobby. Pauses while the tab is hidden, so a background tab drops off the list.
  useEffect(() => {
    if (!user) return undefined;
    let timer;
    let dead = false;
    let busy = false;
    const tick = async () => {
      if (busy || dead) return;
      busy = true;
      clearTimeout(timer);
      if (!document.hidden) {
        try {
          const d = await pingNow();
          if (d.me.status !== statusRef.current) {
            statusRef.current = d.me.status;
            setStatus(d.me.status);
          }
        } catch (err) {
          if (err.status === 401) {
            dead = true;
            notify("You were signed out. Log in again to stay in the lobby.");
          } else if (err.data?.ended || err.data?.full) {
            leaveRoomLocally();
            notify(err.message);
          }
        }
      }
      busy = false;
      if (!dead) timer = setTimeout(tick, PING_MS);
    };
    const onVisible = () => {
      if (!document.hidden) tick();
    };
    const leave = () => {
      fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "leave" }), keepalive: true }).catch(() => {});
    };
    tick();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pagehide", leave);
    return () => {
      dead = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [user, pingNow, notify, leaveRoomLocally]);

  // Clock for the "Starting soon" strip (kept null until mounted so server and
  // browser markup match).
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  async function changeStatus(id) {
    statusRef.current = id;
    setStatus(id);
    try {
      await pingNow();
    } catch (err) {
      notify(err.message);
    }
  }

  async function enter(id) {
    try {
      await pingNow({ roomId: id });
      roomRef.current = id;
      setRoomId(id);
      window.scrollTo({ top: 0 });
    } catch (err) {
      notify(err.message);
    }
  }

  async function leaveRoom() {
    leaveRoomLocally();
    try {
      await pingNow({ roomId: null });
    } catch {
      /* the next check-in sorts it out */
    }
  }

  const roomTitle = (id) => live?.official.find((r) => r.id === id)?.title || live?.rooms.find((r) => r.id === id)?.title || "a session";
  const inRoom = roomId ? { id: roomId, title: roomTitle(roomId) } : null;
  const roomCount = live ? live.official.length + live.rooms.length : 0;

  return (
    <main className="lb-wrap" id="main">
      <section className="lb-hero">
        <div className="lb-hero-copy">
          <span className="lb-kicker">LEONIDA · LIVE</span>
          <h1>
            The <i>Lobby</i>
          </h1>
          <p>Hang out with other fans in real time. Jump into a room, start your own session, or find a crew for day one.</p>
          <div className="lb-live" aria-live="polite">
            <span className="lb-pulse" aria-hidden="true" />
            <b>{user ? (live ? live.total : "…") : "Live"}</b>
            <span>{user ? (live?.total === 1 ? "fan in the lobby" : "fans in the lobby") : "rooms, crews and meetups"}</span>
          </div>
        </div>
        {user && (
          <div className="lb-status" role="group" aria-label="Your status">
            <span className="lb-status-label">Your status</span>
            <div className="lb-status-row">
              {STATUSES.map((s) => (
                <button key={s.id} type="button" className={`lb-chip${status === s.id ? " on" : ""}`} aria-pressed={status === s.id} onClick={() => changeStatus(s.id)} title={s.hint}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {notice && (
        <div className="lb-notice" role="status">
          {notice}
        </div>
      )}

      {soon?.length > 0 && !inRoom && (
        <section className="lb-soon" aria-label="Starting soon">
          <h2 className="lb-h">Starting soon</h2>
          <div className="lb-soon-row">
            {soon.map((e) => (
              <Link key={e.id} href={`/p/${e.id}`} className="lb-soon-card">
                <span className={`lb-soon-when${e.phase === "live" ? " live" : ""}`}>{e.phase === "live" ? "LIVE NOW" : now ? untilLabel(e.startsAtMs, now).toUpperCase() : "SOON"}</span>
                <b>{e.title}</b>
                <small>hosted by @{e.host}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      {!user ? (
        <Gate />
      ) : (
        <div className="lb-layout">
          <div className="lb-main">
            {inRoom ? (
              <RoomChat key={inRoom.id} room={inRoom} live={live} onLeave={leaveRoom} notify={notify} onEnded={() => { leaveRoomLocally(); notify("That session has ended."); }} />
            ) : (
              <>
                <div className="lb-tabs" role="tablist" aria-label="Lobby sections">
                  {TABS.map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={`lb-tab${tab === id ? " on" : ""}${id === "people" ? " lb-tab-people" : ""}`} onClick={() => setTab(id)}>
                      {label}
                      {live && <em>{id === "rooms" ? roomCount : id === "crew" ? live.crew.length : live.people.length}</em>}
                    </button>
                  ))}
                </div>

                {!live ? (
                  <div className="lb-loading" aria-busy="true">Connecting to the lobby…</div>
                ) : tab === "rooms" ? (
                  <Rooms live={live} onEnter={enter} onStart={() => setSheet(true)} />
                ) : tab === "crew" ? (
                  <CrewBoard live={live} setLive={setLive} notify={notify} />
                ) : (
                  <div className="lb-people-mobile">
                    <People live={live} roomId={roomId} onEnter={enter} />
                  </div>
                )}
              </>
            )}
          </div>

          <aside className="lb-side" aria-label="Who’s here">
            {live ? <People live={live} roomId={roomId} onEnter={enter} /> : <div className="lb-loading">Looking around…</div>}
          </aside>
        </div>
      )}

      {sheet && live && (
        <SessionSheet
          me={live.me}
          onClose={() => setSheet(false)}
          onCreated={(id) => {
            setSheet(false);
            enter(id);
          }}
        />
      )}
    </main>
  );
}

function Gate() {
  return (
    <section className="lb-gate">
      <h2>Log in to enter the lobby</h2>
      <p>The lobby is for members. Use the menu in the top corner to log in or create a free account, then come back here.</p>
      <ul>
        <li><b>Live rooms</b><span>Official rooms and sessions started by other fans</span></li>
        <li><b>Who’s here</b><span>See who’s online and what they’re up to</span></li>
        <li><b>Crew finder</b><span>Post what you’re after and find people to squad up with</span></li>
      </ul>
    </section>
  );
}

function Rooms({ live, onEnter, onStart }) {
  const { official, rooms, me } = live;
  const full = (r) => r.max && r.count >= r.max;
  return (
    <div className="lb-rooms">
      <h2 className="lb-h">Official rooms</h2>
      <div className="lb-grid">
        {official.map((r) => (
          <button key={r.id} type="button" className={`lb-room lb-tone-${r.tone}`} onClick={() => onEnter(r.id)}>
            <span className="lb-room-count">
              <span className="lb-dot" aria-hidden="true" />
              {r.count} here
            </span>
            <b>{r.title}</b>
            <small>{r.desc}</small>
          </button>
        ))}
      </div>

      <div className="lb-h-row">
        <h2 className="lb-h">Member sessions</h2>
        <button type="button" className="lb-btn" onClick={onStart}>
          Start a session
        </button>
      </div>
      {rooms.length === 0 ? (
        <div className="lb-empty">
          <b>No sessions running</b>
          <p>Be the first. Name a session, pick a topic and a size, and other members can join you.</p>
        </div>
      ) : (
        <div className="lb-session-list">
          {rooms.map((r) => (
            <button key={r.id} type="button" className="lb-session" disabled={!!full(r) && !r.mine} onClick={() => onEnter(r.id)}>
              <span className="lb-session-main">
                <b>{r.title}</b>
                <small>
                  {r.topic} · hosted by @{r.owner}
                  {r.mine ? " (you)" : ""}
                </small>
              </span>
              <span className={`lb-session-count${full(r) ? " full" : ""}`}>
                {r.count}/{r.max}
                <small>{full(r) ? "full" : "join"}</small>
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="lb-fine">
        You can run {me.rules.active} session{me.rules.active === 1 ? "" : "s"} at once, up to {me.rules.max} people.
        {me.nextPlan ? (
          <>
            {" "}
            <Link href="/upgrade">Rank up</Link> for more.
          </>
        ) : null}
      </p>
    </div>
  );
}

function People({ live, roomId, onEnter }) {
  const hiddenCount = Math.max(0, live.total - live.people.length);
  const where = (id) => live.official.find((r) => r.id === id)?.title || live.rooms.find((r) => r.id === id)?.title || null;
  return (
    <div className="lb-people">
      <div className="lb-h-row">
        <h2 className="lb-h">Who’s here</h2>
        <span className="lb-count">{live.total} online</span>
      </div>
      <ul>
        {live.people.map((p) => {
          const spot = p.roomId ? where(p.roomId) : null;
          return (
            <li key={p.username} className={p.roomId && p.roomId === roomId ? "with-me" : ""}>
              <Link href={`/u/${p.username}`} className="lb-person">
                <Avatar p={p} size={36} />
                <span className="lb-person-text">
                  <b>
                    {p.displayName}
                    {p.self ? <em> (you)</em> : null}
                    <PlanBadges plan={p.plan} />
                  </b>
                  <small>@{p.username}</small>
                </span>
              </Link>
              <span className="lb-person-state">
                <span className={`lb-status-pill st-${p.status}`}>{statusLabel(p.status)}</span>
                {spot && (
                  <button type="button" className="lb-link" onClick={() => onEnter(p.roomId)}>
                    in {spot}
                  </button>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && <p className="lb-fine">+{hiddenCount} laying low</p>}
      {live.people.length === 0 && <p className="lb-fine">It’s quiet right now. Start something.</p>}
    </div>
  );
}
