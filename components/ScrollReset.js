"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";

// Every page you OPEN starts at the top. Going BACK (browser/phone back, or the post bar's back
// button) is left alone, so the main feed keeps the spot you were reading at.
//
// Next already does the forward reset, but this site sets `scroll-behavior: smooth` on <html>
// (app/enhance.css). Without data-scroll-behavior="smooth" on <html> (see app/layout.js) Next's
// reset becomes a slow animated scroll that gets cut short when the loading skeleton swaps for the
// real page, leaving the new page scrolled down. This is the belt-and-braces part: when the path
// changes by a forward navigation, jump to the top instantly.
//
// Tabs and filters that only change the query string (?tab=, ?type=, saved tabs) keep their scroll
// on purpose: the path stays the same, so nothing happens here.

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export default function ScrollReset() {
  const pathname = usePathname();
  const last = useRef(pathname);
  const popped = useRef(false);

  // Back / forward buttons fire popstate before the path changes.
  useEffect(() => {
    const onPop = () => { popped.current = true; };
    // A fresh click on a link means the next path change is a forward one again.
    const onClick = () => { popped.current = false; };
    window.addEventListener("popstate", onPop);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  useIsoLayoutEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    if (popped.current) {
      popped.current = false;
      return;
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
}
