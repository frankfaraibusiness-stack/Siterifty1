"use client";

import Link from "next/link";
import PollCard from "../PollCard";
import TypeIcon from "../composer/TypeIcon";
import { HeartIcon, CommentIcon } from "../icons";
import Money from "../Money";
import { useNow } from "../eventClock";
import { formatCount } from "@/lib/format-count";
import { postImageUrl } from "@/lib/media-url";
import { postHrefFor } from "@/lib/post-href";
import { EVENT_MODES, TYPES, confidenceLabel } from "@/lib/post-schema";
import { eventPhase } from "@/lib/event-rules";
import { capacityState, confidenceTone, dayChip, mediaChip, readMinutes } from "@/lib/card-helpers";

// One card design per kind of post. Each one links to the post's own page
// (/p/[id]) so people and search engines land on a real, shareable URL.
// Polls are the exception: the live poll sits in the card so it can be voted on.

const postHref = postHrefFor;
const accent = (type) => ({ "--a": TYPES[type].a, "--b": TYPES[type].b });
const oneLine = (s) => String(s || "").replace(/\s+/g, " ").trim();

function thumbSrc(post) {
  const m = post.media;
  if (!m) return null;
  if (m.type === "images") return postImageUrl(post.id, 0);
  if (m.type === "video") {
    if (m.kind === "youtube" && m.ytId) return `https://i.ytimg.com/vi/${m.ytId}/hqdefault.jpg`;
    if (m.hasPoster) return postImageUrl(post.id, 0);
  }
  return null;
}

function Flags({ post }) {
  const s = post.settings;
  const flags = [];
  if (s.pinned) flags.push("Pinned");
  if (post.scheduled) flags.push("Scheduled");
  if (s.visibility === "private") flags.push("Only you");
  if (!flags.length) return null;
  return (
    <span className="pt-flags">
      {flags.map((f) => (
        <i key={f}>{f}</i>
      ))}
    </span>
  );
}

function Meta({ post }) {
  const likesHidden = post.settings.hideLikes && !post.isOwner;
  return (
    <div className="pt-meta">
      {!likesHidden && (
        <span>
          <span className="pf-ico"><HeartIcon /></span>
          {formatCount(post.likesCount)}
        </span>
      )}
      <span>
        <span className="pf-ico"><CommentIcon /></span>
        {formatCount(post.comments)}
      </span>
      <span className="pt-when">{post.timeAgo}</span>
    </div>
  );
}

// ---- Posts: photo cards ----------------------------------------------------
export function PostTile({ post }) {
  const src = thumbSrc(post);
  const m = post.media;
  const spoiler = !!post.settings.spoiler;
  const tile = m?.tiles?.[0];
  const a = tile?.a || post.avatarA;
  const b = tile?.b || post.avatarB;
  const count = m?.type === "grid" ? m.tiles.length : m?.type === "images" ? m.count : 1;
  const text = oneLine(post.title || post.text);

  return (
    <Link href={postHref(post)} className="pt pt-photo" style={accent("post")}>
      <span className="pt-thumb" style={src ? undefined : { background: `linear-gradient(135deg, ${a}, ${b})` }}>
        {src && <img src={src} alt="" loading="lazy" decoding="async" className={spoiler ? "blur" : undefined} />}
        {!m && !spoiler && (
          <span className="pt-quote">
            <span className="pt-quote-in">{text}</span>
          </span>
        )}
        {spoiler && <span className="pt-spoil">Spoiler</span>}
        {count > 1 && <span className="pt-chip">{count} photos</span>}
        {post.tag && <span className="pt-tag">{post.tag}</span>}
        <Flags post={post} />
      </span>
      <span className="pt-body">
        <span className="pt-title">{spoiler ? "Spoiler post" : text || "Untitled post"}</span>
        <Meta post={post} />
      </span>
    </Link>
  );
}

// ---- Videos: 16:9 with a play button and length ----------------------------
export function VideoTile({ post }) {
  const src = thumbSrc(post);
  const spoiler = !!post.settings.spoiler;
  const chip = mediaChip(post.media);
  const text = oneLine(post.title || post.text);

  return (
    <Link href={postHref(post)} className="pt pt-video" style={accent("video")}>
      <span className="pt-thumb">
        {src && <img src={src} alt="" loading="lazy" decoding="async" className={spoiler ? "blur" : undefined} />}
        <span className="pt-play" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
        </span>
        {spoiler && <span className="pt-spoil">Spoiler</span>}
        {chip && <span className="pt-chip">{chip.label}</span>}
        <Flags post={post} />
      </span>
      <span className="pt-body">
        <span className="pt-title">{spoiler ? "Spoiler video" : text || "Untitled video"}</span>
        <Meta post={post} />
      </span>
    </Link>
  );
}

// ---- Polls: the live poll itself -------------------------------------------
export function PollTile({ post }) {
  return (
    <article className="pt pt-poll" style={accent("poll")}>
      <header className="pt-poll-head">
        <span className="pt-kind">
          <TypeIcon type="poll" size={14} />
          Poll
        </span>
        <Flags post={post} />
      </header>
      <h3 className="pt-poll-q">
        <Link href={postHref(post)}>{oneLine(post.title) || "Untitled poll"}</Link>
      </h3>
      {post.poll && (
        <PollCard
          postId={post.id}
          poll={post.poll}
          isOwner={post.isOwner}
          resultsFirst={post.settings.resultsFirst}
        />
      )}
      <footer className="pt-foot">
        <Meta post={post} />
        <Link href={postHref(post)} className="pt-open">
          Open
        </Link>
      </footer>
    </article>
  );
}

// ---- Theories: words first, with the author's confidence -------------------
export function TheoryTile({ post }) {
  const c = Math.min(100, Math.max(0, post.theory?.confidence ?? 0));
  const tone = confidenceTone(c);
  const spoiler = !!post.settings.spoiler;
  const body = oneLine(post.text);

  return (
    <Link href={postHref(post)} className="pt pt-theory" style={accent("theory")}>
      <span className="pt-theory-top">
        <span className="pt-kind">
          <TypeIcon type="theory" size={14} />
          Theory
        </span>
        <span className="pt-verdict" data-tone={tone}>{confidenceLabel(c)}</span>
        <Flags post={post} />
      </span>
      <span className="pt-theory-title">{oneLine(post.title) || "Untitled theory"}</span>
      {spoiler ? (
        <span className="pt-theory-text pt-theory-hidden">Spoiler: open the theory to read it.</span>
      ) : (
        body && <span className="pt-theory-text">{body}</span>
      )}
      <span className="pt-conf" data-tone={tone} role="img" aria-label={`Author confidence ${c}%`}>
        <span className="pt-conf-track"><i style={{ width: `${c}%` }} /></span>
        <b>{c}%</b>
      </span>
      <span className="pt-theory-foot">
        <span className="pt-when">{readMinutes(post.text)} min read</span>
        <Meta post={post} />
      </span>
    </Link>
  );
}

// ---- Events: date block, place and who's going -----------------------------
const PHASE_LABEL = { upcoming: "Upcoming", live: "Live now", ended: "Ended" };

export function EventTile({ post }) {
  const ev = post.event;
  const now = useNow(ev.startsAtMs, ev.endsAtMs, ev.closedAtMs);
  const phase = now === null ? ev.phase || "upcoming" : eventPhase(ev.startsAtMs, ev.endsAtMs, now, ev.closedAtMs);
  const modeLabel = EVENT_MODES.find((m) => m.value === ev.mode)?.label || "";
  const cap = capacityState(ev.going, ev.capacity, { waitlist: ev.waitlist, waiting: ev.waitlistCount });
  const soon = now === null ? "" : dayChip(ev.startsAtMs, now);
  const place =
    ev.mode === "irl"
      ? ev.spotHidden
        ? "Real world, spot shared with guests"
        : ev.venue || ev.address || "Real world"
      : ev.mode === "online"
      ? ev.platforms?.join(", ") || "Online"
      : [post.location, ev.spot].filter(Boolean).join(" · ") || "In-game";
  // Dates are only drawn once the browser has the clock, so they always show the viewer's own time zone.
  const start = new Date(ev.startsAtMs);

  return (
    <Link href={postHref(post)} className={`pt pt-event is-${phase}`} style={accent("event")}>
      <span className="pt-date" aria-hidden={now === null}>
        {now !== null ? (
          <>
            <small>{start.toLocaleDateString([], { month: "short" })}</small>
            <b>{start.getDate()}</b>
            <small>{start.toLocaleDateString([], { weekday: "short" })}</small>
          </>
        ) : (
          <TypeIcon type="event" size={26} />
        )}
      </span>
      <span className="pt-event-main">
        <span className="pt-event-top">
          <span className="pt-kind">
            <TypeIcon type="event" size={14} />
            {ev.category}
          </span>
          <span className={`pt-phase ${phase}`}>
            {phase === "live" && <i aria-hidden="true" />}
            {PHASE_LABEL[phase]}
          </span>
          <Flags post={post} />
        </span>
        <span className="pt-event-title">{oneLine(post.title) || "Untitled event"}</span>
        <span className="pt-event-line">
          {modeLabel && <b>{modeLabel}</b>}
          <span>{place}</span>
        </span>
        {now !== null && (
          <span className="pt-event-line">
            {start.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            {soon && <em>{soon}</em>}
          </span>
        )}
        <span className="pt-event-foot">
          <span className="pt-going">
            <b>{formatCount(ev.going)}</b> going
            {ev.capacity != null && <> · {cap.label}</>}
          </span>
          <span className="pt-price">{ev.priceUsd ? <Money usd={ev.priceUsd} /> : "Free"}</span>
        </span>
        {ev.capacity != null && (
          <span className={`pt-cap ${cap.tone}`} aria-hidden="true">
            <i style={{ width: `${cap.pct}%` }} />
          </span>
        )}
      </span>
    </Link>
  );
}

export const TILES = {
  post: PostTile,
  video: VideoTile,
  poll: PollTile,
  theory: TheoryTile,
  event: EventTile,
};
