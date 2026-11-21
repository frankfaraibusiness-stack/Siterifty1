"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import VoiceSearchButton from "./VoiceSearchButton";
import SearchOverlay from "./search/SearchOverlay";
import { warmHot } from "@/lib/search-hot-client";
import { SearchIcon, XIcon } from "./icons";

// The search bar on the home feed, the /search page and the 404 page.
// Tapping it opens the full-screen search (components/search/SearchOverlay.js):
// recent searches, hot topics and suggestions as you type.
//
// It is still a plain HTML GET form underneath, so searching works even
// before the page's JavaScript has loaded: submitting it loads /search?q=...
export default function SearchBar({ defaultValue = "", type, autoFocus = false, compact = false }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  // Focus comes back to the bar when the overlay closes; that must not reopen it.
  const quiet = useRef(false);

  const show = useCallback(() => {
    if (quiet.current) return;
    inputRef.current?.blur();
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    quiet.current = true;
    setTimeout(() => {
      quiet.current = false;
    }, 600);
    setOpen(false);
  }, []);

  // The /search page with nothing searched yet used to focus its box; it now opens the search screen.
  useEffect(() => {
    if (autoFocus) setOpen(true);
  }, [autoFocus]);

  return (
    <>
      <form className={`sb${compact ? " sb-compact" : ""}`} action="/search" method="get" role="search">
        <span className="sb-icon" aria-hidden="true">
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          className="sb-input"
          type="search"
          name="q"
          defaultValue={defaultValue}
          placeholder={compact ? "Search posts, people, #tags…" : "Search posts, people, #tags"}
          maxLength={80}
          autoComplete="off"
          enterKeyHint="search"
          aria-label="Search GTAFanbase"
          aria-haspopup="dialog"
          onFocus={show}
          onClick={show}
          onPointerEnter={warmHot}
          onTouchStart={warmHot}
        />
        {type && type !== "all" && <input type="hidden" name="type" value={type} />}
        {defaultValue && (
          <Link href="/search" className="sb-clear" aria-label="Clear search">
            <XIcon />
          </Link>
        )}
        <VoiceSearchButton />
        <button className="sb-submit" type="submit" aria-label="Search">
          {compact ? <SearchIcon /> : "Search"}
        </button>
      </form>
      {open && <SearchOverlay initialValue={defaultValue} type={type} onClose={hide} />}
    </>
  );
}
