"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { LinkIcon, PinIcon, CalendarIcon } from "../icons";
import { formatCount } from "@/lib/format-count";

// The About tab (opened from the bio, like YouTube's channel About): the bio,
// how much this member has posted, and the small facts that used to crowd the
// top of the profile.
export default function AboutPanel({ profile, stats, insights, isOwner, onEdit }) {
  const bio = profile.bio || "";
  const bioRef = useRef(null);
  const [full, setFull] = useState(false);
  const [clipped, setClipped] = useState(false);

  // "Read more" only appears when the bio really is cut off at this width.
  useEffect(() => {
    const el = bioRef.current;
    if (!el) return;
    const measure = () => {
      if (!full) setClipped(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [bio, full]);

  const posts = stats.posts;
  const avg = (n) => (posts > 0 ? (n / posts).toFixed(1).replace(/\.0$/, "") : "0");
  const top = insights?.top || {};
  const shortSite = (profile.website || "").replace(/^https?:\/\//, "").replace(/\/$/, "");

  const numbers = [
    { label: "Posts", value: stats.posts },
    { label: "Likes", value: stats.likes, avg: avg(stats.likes) },
    { label: "Comments", value: stats.comments, avg: avg(stats.comments) },
    { label: "Saves", value: stats.saves, avg: avg(stats.saves) },
  ];

  const tops = [
    ["Most liked", top.likes, "like"],
    ["Most commented", top.comments, "comment"],
    ["Most saved", top.saves, "save"],
  ].filter(([, entry]) => entry);

  return (
    <section className="ab" id="pf-about" aria-label="About">
      <div className="ab-card">
        <h2 className="ab-h">About</h2>
        {bio ? (
          <>
            <p ref={bioRef} className={`ab-bio${full ? "" : " clamp"}`}>
              {bio}
            </p>
            {(full || clipped) && (
              <button type="button" className="ab-more" onClick={() => setFull((v) => !v)} aria-expanded={full}>
                {full ? "Show less" : "Read more"}
              </button>
            )}
          </>
        ) : (
          <div className="ab-none">
            <p>No bio yet</p>
            {isOwner && (
              <button type="button" className="pf-btn pf-btn-ghost pf-btn-sm" onClick={onEdit}>
                Add a bio
              </button>
            )}
          </div>
        )}
      </div>

      <div className="ab-card">
        <h2 className="ab-h">Stats</h2>
        <dl className="ab-nums">
          {numbers.map((n) => (
            <div key={n.label}>
              <dt>{n.label}</dt>
              <dd>{formatCount(n.value)}</dd>
              {n.avg !== undefined && <small>{n.avg} per post</small>}
            </div>
          ))}
        </dl>

        {tops.length > 0 && (
          <ul className="ab-tops">
            {tops.map(([label, entry, noun]) => (
              <li key={label}>
                <Link href={`/p/${entry.id}`}>
                  <span>{label}</span>
                  <b>{entry.label}</b>
                  <em>
                    {formatCount(entry.n)} {entry.n === 1 ? noun : `${noun}s`}
                  </em>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {(profile.joined || profile.location || profile.website) && (
        <div className="ab-card">
          <h2 className="ab-h">Details</h2>
          <ul className="ab-facts">
            {profile.joined && (
              <li>
                <span className="pf-ico"><CalendarIcon /></span>
                Joined {profile.joined}
              </li>
            )}
            {profile.location && (
              <li>
                <span className="pf-ico"><PinIcon /></span>
                {profile.location}
              </li>
            )}
            {profile.website && (
              <li>
                <span className="pf-ico"><LinkIcon /></span>
                <a href={profile.website} target="_blank" rel="noopener noreferrer">
                  {shortSite}
                </a>
              </li>
            )}
          </ul>
        </div>
      )}
    </section>
  );
}
