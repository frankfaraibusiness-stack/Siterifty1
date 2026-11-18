"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CommentIcon, HeartIcon } from "@/components/icons";
import TypeIcon from "@/components/composer/TypeIcon";
import { useViewed } from "@/components/ads/adHooks";
import { reportClick, reportSeen } from "@/lib/track-client";
import { formatCount } from "@/lib/format-count";

// "Recommended for you": a horizontally scrolling row on top of the home feed. Every card is the
// same size (picture on the side, text beside it). WHAT is shown is decided on the server
// (lib/recommend-data.js, matched to the member's interests); each card carries a server-signed
// tracking token, so a card counts as a view only when it was really on screen and a click only
// when it was really opened, and the browser can't make either up.

const BADGE = { video: "Video", poll: "Poll", theory: "Theory", event: "Event" };

function Card({ r }) {
  const ref = useRef(null);
  useViewed(ref, () => reportSeen(r.trk), !!r.trk);
  const t = r.thumb;
  const badge = BADGE[r.type] || (r.hasMedia && r.type === "post" ? "Photo" : "");
  const headline = r.title || r.text;
  const tint = t?.a ? { "--ta": t.a, "--tb": t.b } : { "--ta": r.avatarA, "--tb": r.avatarB };
  return (
    <li className="rr-item" ref={ref}>
      <Link href={`/p/${r.id}`} className={`rr-card${r.spoiler ? " covered" : ""}`} onClick={() => reportClick(r.trk)}>
        <span className={`rr-thumb${t?.src ? " has-img" : ""}`} style={tint}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t?.src && <img src={t.src} alt="" loading="lazy" decoding="async" />}
          {!t?.src && !r.spoiler && (
            <span className="rr-glyph" aria-hidden="true">{r.type === "post" && !r.hasMedia ? "“" : <TypeIcon type={r.type} size={26} />}</span>
          )}
          {r.spoiler && <span className="rr-cover"><b>Spoiler</b></span>}
          {t?.play && <span className="rr-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg></span>}
          {badge && !r.spoiler && <span className="rr-badge">{badge}</span>}
        </span>
        <span className="rr-body">
          <span className="rr-why">{r.why || "Trending"}</span>
          <span className="rr-title">{headline || (r.spoiler ? "Hidden post" : "Untitled post")}</span>
          <span className="rr-by">
            <span className="rr-av" style={{ "--a": r.avatarA, "--b": r.avatarB }} aria-hidden="true">
              {r.initial}
              {r.hasAvatar && <i style={{ backgroundImage: `url("/avatar/${encodeURIComponent(r.user)}?v=${r.avatarV}")` }} />}
            </span>
            <span className="rr-user">{r.user}</span><span className="rr-dot">·</span><span>{r.timeAgo}</span>
          </span>
          {(r.likes != null || r.comments != null) && (
            <span className="rr-stats">
              {r.likes != null && <span><HeartIcon />{formatCount(r.likes)}</span>}
              {r.comments != null && <span><CommentIcon />{formatCount(r.comments)}</span>}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export default function RecommendedRail({ items }) {
  const track = useRef(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  useEffect(() => {
    const el = track.current;
    if (!el) return undefined;
    const read = () => setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
    read();
    el.addEventListener("scroll", read, { passive: true });
    window.addEventListener("resize", read);
    return () => { el.removeEventListener("scroll", read); window.removeEventListener("resize", read); };
  }, [items.length]);

  if (!items.length) return null;
  const personal = items.some((r) => r.why && r.why !== "Trending" && r.why !== "Something new");
  const nudge = (dir) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * Math.max(240, el.clientWidth * 0.8), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <section className="rr" aria-label="Recommended for you">
      <div className="rr-head">
        <div>
          <h2>Recommended for you</h2>
          <p>{personal ? "Picked from what you like and talk about" : "Trending in the fanbase right now"}</p>
        </div>
        <div className="rr-nav" aria-hidden="true">
          <button type="button" tabIndex={-1} onClick={() => nudge(-1)} disabled={edge.start} aria-label="Scroll left">‹</button>
          <button type="button" tabIndex={-1} onClick={() => nudge(1)} disabled={edge.end} aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className={`rr-wrap${edge.start ? "" : " fade-l"}${edge.end ? "" : " fade-r"}`}>
        <ul className="rr-track" ref={track}>
          {items.map((r) => <Card key={r.id} r={r} />)}
        </ul>
      </div>
    </section>
  );
}
