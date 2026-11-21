"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import TypeIcon from "../composer/TypeIcon";
import { ArrowLeftIcon, ShareIcon } from "../icons";

// The sticky bar on a post's own page. Back returns to wherever the reader came
// from on this site (a profile tab, the feed, search), with their scroll spot.
// With no earlier page (a shared link) it is a plain link to the feed.
export default function PostBar({ type, label, user, id, title }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const noteTimer = useRef(null);

  function flash(text) {
    setNote(text);
    clearTimeout(noteTimer.current);
    noteTimer.current = setTimeout(() => setNote(""), 2000);
  }

  // Share sheet where the phone has one, else copy the post's one canonical link.
  async function share() {
    const url = `${window.location.origin}/p/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: title || `@${user} on GTAFanbase`, url });
      } catch {
        // The share sheet was dismissed.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      flash("Link copied");
    } catch {
      flash("Couldn’t copy the link");
    }
  }

  function back(e) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    let fromHere = false;
    try {
      fromHere = !!document.referrer && new URL(document.referrer).origin === window.location.origin;
    } catch {
      fromHere = false;
    }
    if (fromHere && window.history.length > 1) {
      e.preventDefault();
      router.back();
    }
  }

  return (
    <div className="pd-bar">
      <Link href="/" className="pd-bar-back" onClick={back} aria-label="Go back">
        <ArrowLeftIcon />
      </Link>
      <div className="pd-bar-title">
        <span className="pd-bar-type">
          <TypeIcon type={type} size={15} />
          {label}
        </span>
        <span className="pd-bar-by">
          by <Link href={`/u/${encodeURIComponent(user)}`}>@{user}</Link>
        </span>
      </div>
      {id && (
        <button type="button" className="pd-bar-share" onClick={share} aria-label="Share this post">
          <ShareIcon />
        </button>
      )}
      {note && <span className="pd-bar-note" role="status">{note}</span>}
    </div>
  );
}
