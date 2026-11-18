"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CommentIcon, HeartIcon } from "@/components/icons";
import TypeIcon from "@/components/composer/TypeIcon";
import { formatCount } from "@/lib/format-count";
import { useViewed } from "@/components/ads/adHooks";
import { reportClick, reportSeen } from "@/lib/track-client";

const BADGE = { video: "Video", poll: "Poll", theory: "Theory", event: "Event" };

function Avatar({ r }) {
  return (
    <span className="rc-av" style={{ "--a": r.avatarA, "--b": r.avatarB }} aria-hidden="true">
      {r.initial}
      {r.hasAvatar && <i style={{ backgroundImage: `url("/avatar/${encodeURIComponent(r.user)}?v=${r.avatarV}")` }} />}
    </span>
  );
}

// A small card for one recommended post. The whole card is one link, so there
// is nothing to mis-tap while scrolling a long list.
function RecCard({ r }) {
  const ref = useRef(null);
  useViewed(ref, () => reportSeen(r.trk), !!r.trk);
  const badge = BADGE[r.type] || (r.hasMedia && r.type === "post" ? "Photo" : "");
  const t = r.thumb;
  const headline = r.title || r.text;
  const tint = t?.a ? { "--ta": t.a, "--tb": t.b } : { "--ta": r.avatarA, "--tb": r.avatarB };

  return (
    <li className="rc-item" ref={ref}>
      <Link href={`/p/${r.id}`} className={`rc${r.spoiler ? " covered" : ""}`} onClick={() => reportClick(r.trk)}>
        <span className={`rc-thumb${t?.src ? " has-img" : ""}`} style={tint}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {t?.src && <img src={t.src} alt="" loading="lazy" decoding="async" />}
          {!t?.src && !r.spoiler && (
            <span className="rc-glyph" aria-hidden="true">
              {r.type === "post" && !r.hasMedia ? "“" : <TypeIcon type={r.type === "post" ? "post" : r.type} size={26} />}
            </span>
          )}
          {r.spoiler && <span className="rc-cover"><b>Spoiler</b><small>Open to reveal</small></span>}
          {t?.play && (
            <span className="rc-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg></span>
          )}
          {badge && !r.spoiler && <span className="rc-badge">{badge}</span>}
          {t?.count > 1 && <span className="rc-count">{t.count} photos</span>}
        </span>
        <span className="rc-body">
          <span className="rc-title">{headline || (r.spoiler ? "Hidden post" : "Untitled post")}</span>
          <span className="rc-by"><Avatar r={r} /><span className="rc-user">{r.user}</span><span className="rc-dot">·</span><span>{r.timeAgo}</span></span>
          {(r.likes != null || r.comments != null) && (
            <span className="rc-stats">
              {r.likes != null && <span><HeartIcon />{formatCount(r.likes)}</span>}
              {r.comments != null && <span><CommentIcon />{formatCount(r.comments)}</span>}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function Skeletons({ n = 6 }) {
  return Array.from({ length: n }, (_, i) => (
    <li key={`s${i}`} className="rc-item" aria-hidden="true">
      <div className="rc rc-skel"><span className="rc-thumb" /><span className="rc-body"><i /><i /><i /></span></div>
    </li>
  ));
}

// The endless "more to explore" list under a post. The first page arrives with
// the page; everything after loads by itself a little before the reader gets to
// the bottom, so it never stops and never shows a "load more" button. The
// server decides what comes next (lib/recommend-data.js), so a smarter
// algorithm later changes nothing here.
export default function PostRecommendations({ postId, initial }) {
  const [items, setItems] = useState(initial.items);
  const [more, setMore] = useState(initial.more);
  const [next, setNext] = useState(initial.next);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false); // set synchronously, so two observers can't fire one fetch twice
  const end = useRef(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  const loadMore = useCallback(async () => {
    if (busy.current || !more) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ exclude: postId });
      if (next) qs.set("before", String(next));
      const res = await fetch(`/api/posts/recommend?${qs}`, { cache: "no-store" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Couldn’t load more posts.");
      if (!alive.current) return;
      setItems((cur) => {
        const have = new Set(cur.map((r) => r.id));
        return [...cur, ...j.items.filter((r) => !have.has(r.id))];
      });
      setMore(!!j.more);
      setNext(j.next);
    } catch (e) {
      if (alive.current) setError(e.message || "Couldn’t load more posts.");
    } finally {
      busy.current = false;
      if (alive.current) setLoading(false);
    }
  }, [more, next, postId]);

  // Ask for the next page when the end of the list is within ~1.5 screens.
  useEffect(() => {
    const el = end.current;
    if (!el || !more || error || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: "1200px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, error, loadMore, items.length]);

  if (!items.length && !more && !loading) return null;

  return (
    <section className="pr" aria-labelledby="pr-h">
      <div className="pr-head">
        <h2 id="pr-h">More to explore</h2>
        <p>Posts from around the fanbase</p>
      </div>
      <ul className="pr-grid">
        {items.map((r) => <RecCard key={r.id} r={r} />)}
        {loading && <Skeletons />}
      </ul>
      <div className="pr-end" ref={end}>
        {error && (
          <p role="alert">{error} <button type="button" onClick={loadMore}>Try again</button></p>
        )}
        {!more && !error && items.length > 0 && (
          <div className="pr-done">
            <p>You’ve seen everything for now.</p>
            <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}>Back to the top</button>
          </div>
        )}
      </div>
    </section>
  );
}
