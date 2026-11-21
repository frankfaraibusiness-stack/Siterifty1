"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdCardView, AdCompactView, AdRowView } from "./AdViews";
import { sendTrack } from "./adHooks";

// One ad slot. It asks the server for ONE random ad, and only when the slot is
// about to scroll into view, so ads far down the page never cost a read. An ad
// counts as a view once at least half of it has been on screen for a second.

const shown = []; // ads this visitor has already been shown on this page load
const noAds = {}; // placement -> time before which we won't ask again (nothing is running)

// placement: "feed" | "community" | "messages". Each page has its own look:
// feed = big card, community = compact tinted card, messages (`mini`) = chat row.
export default function AdSlot({ placement, mini = false }) {
  const holder = useRef(null);
  const started = useRef(false); // one ask per slot, even if React re-runs the effect
  const alive = useRef(true);
  const [ad, setAd] = useState(null);
  const [state, setState] = useState(noAds[placement] > Date.now() ? "none" : "idle");

  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);

  useEffect(() => {
    if (started.current || state === "none") return undefined;
    const el = holder.current;
    const load = async () => {
      if (started.current) return;
      started.current = true;
      try {
        const res = await fetch(`/api/ads/serve?placement=${placement}&exclude=${shown.join(",")}`, { cache: "no-store" });
        const j = await res.json();
        if (!alive.current) return;
        if (j.ad) {
          shown.push(j.ad.id);
          if (shown.length > 20) shown.shift();
          setAd(j.ad);
          setState("ready");
        } else {
          noAds[placement] = Date.now() + 120_000;
          setState("none");
        }
      } catch {
        if (alive.current) setState("none");
      }
    };
    if (!el || typeof IntersectionObserver === "undefined") { load(); return undefined; }
    const io = new IntersectionObserver((entries) => { if (entries[0].isIntersecting) { io.disconnect(); load(); } }, { rootMargin: "700px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [state, placement]);

  const onView = useCallback(() => ad && sendTrack(ad.id, placement, "view"), [ad, placement]);
  const onClick = useCallback(() => ad && sendTrack(ad.id, placement, "click"), [ad, placement]);

  if (state === "none") return null;
  if (state !== "ready") {
    // A fixed-height placeholder keeps a chat from jumping when the ad arrives.
    return <div ref={holder} className={mini ? "ad-skel mini" : "ad-skel"} aria-hidden="true" />;
  }
  if (mini) return <AdRowView ad={ad} onView={onView} onClick={onClick} />;
  if (placement === "community") return <AdCompactView ad={ad} onView={onView} onClick={onClick} />;
  return <AdCardView ad={ad} onView={onView} onClick={onClick} />;
}
