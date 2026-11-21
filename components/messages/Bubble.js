"use client";

import { memo, useRef, useState } from "react";
import GtaEmoji from "./GtaEmoji";
import { Avatar, Icon, RichText, STATE_LABEL, Ticks, copyText, emojiOnly, fmtIn, fmtTime, fmtWhen } from "./ui";
import { CODE_KINDS, GAME_MODES, PLATFORMS, REGIONS, STICKERS, labelOf } from "@/lib/chat-config";

const REGION_COLORS = {
  vice: ["#ff3d7f", "#2de2c5"],
  keys: ["#37e8d0", "#ffb347"],
  grass: ["#3dd6a0", "#cdfa4c"],
  port: ["#5ab0ff", "#ffab2e"],
  ambrosia: ["#a24bff", "#ff7ab8"],
  other: ["#8a84a0", "#5a4d7a"],
};

// ---------------------------------------------------------------- cards
function CopyBtn({ value, label = "Copy", onToast }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={`mg-copy${done ? " done" : ""}`}
      onClick={async (e) => {
        e.stopPropagation();
        if (await copyText(value)) {
          setDone(true);
          onToast?.("Copied");
          setTimeout(() => setDone(false), 1600);
        }
      }}
    >
      {done ? <Icon.Check size={14} /> : <Icon.Copy size={14} />}
      {done ? "Copied" : label}
    </button>
  );
}

function InviteCard({ invite, onToast }) {
  const platform = labelOf(PLATFORMS, invite.platform);
  const mode = labelOf(GAME_MODES, invite.mode);
  return (
    <div className="mg-card mg-invite">
      <div className="mg-card-top">
        <span className="mg-card-kind"><Icon.Gamepad size={15} /> Session invite</span>
        <span className={`mg-plat p-${invite.platform}`}>{platform}</span>
      </div>
      <div className="mg-card-main">
        <b className="mg-card-title">{mode}</b>
        <span className="mg-slots">{invite.slots === "open" ? "Open lobby" : `${invite.slots} players`}</span>
      </div>
      {invite.code && (
        <div className="mg-codebox">
          <code>{invite.code}</code>
          <CopyBtn value={invite.code} onToast={onToast} />
        </div>
      )}
      {invite.note && <p className="mg-card-note">{invite.note}</p>}
      {invite.startsAt && (
        <p className="mg-when">
          <Icon.Clock size={14} /> {fmtWhen(invite.startsAt)} <em>{fmtIn(invite.startsAt)}</em>
        </p>
      )}
    </div>
  );
}

function CodeCard({ code, onToast }) {
  const [shown, setShown] = useState(!code.hidden);
  const kind = labelOf(CODE_KINDS, code.kind);
  return (
    <div className="mg-card mg-code">
      <div className="mg-card-top">
        <span className="mg-card-kind"><Icon.Key size={15} /> {code.label || kind}</span>
        {code.label && <span className="mg-plat">{kind}</span>}
      </div>
      <div className="mg-codebox">
        {shown ? <code>{code.code}</code> : <code className="masked">•••• •••• ••••</code>}
        {shown ? (
          <CopyBtn value={code.code} onToast={onToast} />
        ) : (
          <button type="button" className="mg-copy" onClick={() => setShown(true)}>
            Reveal
          </button>
        )}
      </div>
    </div>
  );
}

function MapArt({ region }) {
  const [a, b] = REGION_COLORS[region] || REGION_COLORS.other;
  return (
    <svg className="mg-map" viewBox="0 0 240 90" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="240" height="90" fill={`color-mix(in srgb, ${a} 16%, #1b1925)`} />
      <path d="M-10 62C40 50 70 78 120 58s80-18 140-4v50H-10z" fill={`color-mix(in srgb, ${b} 30%, transparent)`} />
      <g stroke={a} strokeOpacity=".4" strokeWidth="1.2" fill="none">
        <path d="M0 30h240M0 60h240M40 0v90M100 0v90M170 0v90M220 0v90" />
        <path d="M0 80L90 10l150 70" strokeOpacity=".28" />
      </g>
      <circle cx="120" cy="44" r="22" fill={a} opacity=".12" />
    </svg>
  );
}

function MeetupCard({ meetup, onToast }) {
  const region = labelOf(REGIONS, meetup.region);
  return (
    <div className="mg-card mg-meetup">
      <div className="mg-mapwrap">
        <MapArt region={meetup.region} />
        <span className="mg-pin"><GtaEmoji id="pin" size={30} /></span>
        <span className="mg-region">{region}</span>
      </div>
      <div className="mg-card-main col">
        <b className="mg-card-title">{meetup.place}</b>
        {meetup.note && <p className="mg-card-note">{meetup.note}</p>}
        {meetup.startsAt && (
          <p className="mg-when">
            <Icon.Clock size={14} /> {fmtWhen(meetup.startsAt)} <em>{fmtIn(meetup.startsAt)}</em>
          </p>
        )}
        <CopyBtn value={`${meetup.place} (${region})`} label="Copy place" onToast={onToast} />
      </div>
    </div>
  );
}

function Sticker({ id }) {
  const s = STICKERS.find((x) => x.id === id);
  if (!s) return null;
  return (
    <span className="mg-sticker" style={{ "--s1": s.a, "--s2": s.b }}>
      {s.t}
    </span>
  );
}

// ---------------------------------------------------------------- bubble
function Bubble({
  m,
  peer,
  showAvatar,
  first,
  last,
  isLastMine,
  replySource,
  onMenu,
  onReact,
  onReply,
  onRetry,
  onImage,
  onToast,
}) {
  const rowRef = useRef(null);
  const touch = useRef({ x: 0, y: 0, dx: 0, swiping: false, timer: 0, fired: false });
  const mine = m.mine;
  const state = m.local ? m.state : m.state;
  const jumbo = m.type === "text" && !m.deleted ? emojiOnly(m.text) : 0;
  const card = ["invite", "code", "meetup", "sticker"].includes(m.type);
  const image = m.type === "image";
  const bare = !m.deleted && (jumbo || m.type === "sticker");

  // Long-press opens the menu, a swipe to the right starts a reply.
  const onTouchStart = (e) => {
    if (m.local && m.state === "sending") return;
    const t = e.touches[0];
    const s = touch.current;
    s.x = t.clientX;
    s.y = t.clientY;
    s.dx = 0;
    s.swiping = false;
    s.fired = false;
    clearTimeout(s.timer);
    s.timer = setTimeout(() => {
      s.fired = true;
      navigator.vibrate?.(8);
      onMenu(m, rowRef.current?.querySelector(".mg-bubble, .mg-card, .mg-sticker")?.getBoundingClientRect() || null);
    }, 480);
  };
  const onTouchMove = (e) => {
    const s = touch.current;
    const t = e.touches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dy) > 10 || (Math.abs(dx) > 8 && !s.swiping)) clearTimeout(s.timer);
    if (!s.swiping && dx > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) s.swiping = true;
    if (s.swiping && !m.deleted) {
      s.dx = Math.min(dx, 72);
      if (rowRef.current) rowRef.current.style.transform = `translateX(${s.dx}px)`;
    }
  };
  const onTouchEnd = () => {
    const s = touch.current;
    clearTimeout(s.timer);
    if (rowRef.current) {
      rowRef.current.style.transition = "transform .18s ease";
      rowRef.current.style.transform = "";
      setTimeout(() => rowRef.current && (rowRef.current.style.transition = ""), 200);
    }
    if (s.swiping && s.dx > 54 && !m.deleted && !s.fired) {
      navigator.vibrate?.(6);
      onReply(m);
    }
    s.swiping = false;
  };

  const rx = m.rx || {};
  const chips = [];
  if (rx.mine && rx.mine === rx.theirs) chips.push({ id: rx.mine, n: 2, mine: true });
  else {
    if (rx.theirs) chips.push({ id: rx.theirs, n: 1, mine: false });
    if (rx.mine) chips.push({ id: rx.mine, n: 1, mine: true });
  }

  const quote = m.replyTo;
  const quoteDeleted = quote?.deleted || (replySource && replySource.deleted);
  const canMenu = !(m.local && m.state === "sending");

  if (m.gone) return null;

  return (
    <div
      className={`mg-row ${mine ? "mine" : "theirs"}${first ? " first" : ""}${last ? " last" : ""}${m.deleted ? " is-deleted" : ""}${m.state === "failed" ? " is-failed" : ""}`}
      data-id={m.id}
    >
      {!mine && (
        <div className="mg-av-slot">{showAvatar && <Avatar person={peer} size={28} />}</div>
      )}

      <div
        ref={rowRef}
        className="mg-swipe"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onContextMenu={(e) => {
          if (e.pointerType === "touch" || window.matchMedia("(hover: none)").matches) e.preventDefault();
        }}
      >
        <span className="mg-reply-hint" aria-hidden="true"><Icon.Reply size={16} /></span>
        <div className="mg-col">
          {m.deleted ? (
            <div className="mg-bubble mg-gone">
              <Icon.Ban size={14} /> {mine ? "You deleted this message" : "This message was deleted"}
              <span className="mg-meta"><time>{fmtTime(m.createdAt)}</time></span>
            </div>
          ) : (
            <div className={`mg-body ${bare ? "bare" : ""}`}>
              {quote && (
                <button type="button" className="mg-quote" onClick={() => document.querySelector(`[data-id="${quote.id}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" })}>
                  <b>{quote.from === peer.uid ? peer.displayName : "You"}</b>
                  <span>{quoteDeleted ? "Message deleted" : quote.snippet}</span>
                </button>
              )}

              {m.type === "text" && (
                <div className={`mg-bubble${jumbo ? ` jumbo j${jumbo}` : ""}`}>
                  <span className="mg-text"><RichText text={m.text} emojiSize={jumbo ? (jumbo === 1 ? 46 : 38) : 20} /></span>
                  {!jumbo && <MetaInline m={m} mine={mine} state={state} />}
                </div>
              )}
              {m.type === "sticker" && <Sticker id={m.sticker} />}
              {m.type === "invite" && <InviteCard invite={m.invite} onToast={onToast} />}
              {m.type === "code" && <CodeCard code={m.code} onToast={onToast} />}
              {m.type === "meetup" && <MeetupCard meetup={m.meetup} onToast={onToast} />}
              {image && (
                <div className="mg-photo">
                  <button type="button" className="mg-photo-btn" onClick={() => onImage(m)} aria-label="Open photo" style={{ aspectRatio: `${m.media?.w || 4} / ${m.media?.h || 3}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.localSrc || `/api/messages/media/${m.convId}/${m.id}`} alt={m.text || "Photo"} loading="lazy" />
                  </button>
                  {m.text && <p className="mg-caption"><RichText text={m.text} /></p>}
                </div>
              )}
              {(card || image || jumbo > 0) && <MetaBelow m={m} mine={mine} state={state} />}

              {chips.length > 0 && (
                <div className="mg-rx">
                  {chips.map((c) => (
                    <button
                      key={c.id + c.mine}
                      type="button"
                      className={c.mine ? "mine" : ""}
                      onClick={() => c.mine && onReact(m, c.id)}
                      aria-label={`Reaction ${c.id}`}
                    >
                      <GtaEmoji id={c.id} size={16} />
                      {c.n > 1 && <span>{c.n}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mine && isLastMine && (
            <div className={`mg-label s-${state}`}>
              {state === "failed" ? (
                <>
                  {STATE_LABEL.failed} ·{" "}
                  <button type="button" onClick={() => onRetry(m)}>Tap to retry</button>
                </>
              ) : state === "seen" && m.seenAt ? (
                <>Seen {fmtTime(m.seenAt)}</>
              ) : state === "delivered" && m.deliveredAt ? (
                <>Delivered {fmtTime(m.deliveredAt)}</>
              ) : (
                STATE_LABEL[state] || ""
              )}
            </div>
          )}
        </div>

        {canMenu && (
          <button
            type="button"
            className="mg-dots"
            aria-label="Message options"
            onClick={(e) => onMenu(m, e.currentTarget.getBoundingClientRect())}
          >
            <Icon.Dots size={18} />
          </button>
        )}
      </div>
    </div>
  );
}

function MetaInline({ m, mine, state }) {
  return (
    <span className="mg-meta">
      {m.edited && <em>edited</em>}
      <time>{fmtTime(m.createdAt)}</time>
      {mine && <Ticks state={state} />}
    </span>
  );
}
function MetaBelow({ m, mine, state }) {
  return (
    <span className="mg-meta below">
      {m.edited && <em>edited</em>}
      <time>{fmtTime(m.createdAt)}</time>
      {mine && <Ticks state={state} />}
    </span>
  );
}

export default memo(Bubble);
