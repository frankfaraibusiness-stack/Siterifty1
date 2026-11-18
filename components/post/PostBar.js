"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import TypeIcon from "../composer/TypeIcon";
import { ArrowLeftIcon } from "../icons";

// The sticky bar on a post's own page. Back returns to wherever the reader came
// from on this site (a profile tab, the feed, search), with their scroll spot.
// With no earlier page (a shared link) it is a plain link to the feed.
export default function PostBar({ type, label, user }) {
  const router = useRouter();

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
        <span className="pd-bar-ico">
          <ArrowLeftIcon />
        </span>
        Back
      </Link>
      <span className="pd-bar-title">
        <span className="pd-bar-type">
          <TypeIcon type={type} size={14} />
          {label}
        </span>
        <span className="pd-bar-by">
          by <Link href={`/u/${encodeURIComponent(user)}`}>@{user}</Link>
        </span>
      </span>
    </div>
  );
}
