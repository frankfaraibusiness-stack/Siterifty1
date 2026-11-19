"use client";

import { useEffect } from "react";

// Freezes page scroll while a modal is open. Reference-counted so stacked
// modals don't unlock the page early, and it pads for the scrollbar so the
// layout doesn't jump sideways when the scrollbar disappears.
let locks = 0;
let saved = null;

export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;

    if (locks === 0) {
      const html = document.documentElement;
      const body = document.body;
      const scrollbar = window.innerWidth - html.clientWidth;
      saved = {
        htmlOverflow: html.style.overflow,
        bodyOverflow: body.style.overflow,
        bodyPaddingRight: body.style.paddingRight,
        htmlOverscroll: html.style.overscrollBehavior,
      };
      html.style.overflow = "hidden";
      html.style.overscrollBehavior = "none";
      body.style.overflow = "hidden";
      if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
    }
    locks += 1;

    return () => {
      locks -= 1;
      if (locks === 0 && saved) {
        const html = document.documentElement;
        const body = document.body;
        html.style.overflow = saved.htmlOverflow;
        html.style.overscrollBehavior = saved.htmlOverscroll;
        body.style.overflow = saved.bodyOverflow;
        body.style.paddingRight = saved.bodyPaddingRight;
        saved = null;
      }
    };
  }, [active]);
}
