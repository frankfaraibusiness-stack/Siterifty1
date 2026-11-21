"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Browser side of the ads on a monetized Long form video. It can't invent anything: the server sent the
// video's ad breaks along with the post, and for each break it hands back (or doesn't) one ad and a
// signed token. The browser plays the ad and reports that it played; the server decides what that is worth
// (lib/instream-ads-data.js).
//
//   const ads = useInstreamAds({ postId, breaks, active, onRestart });
//   ads.hold          true while an ad is on screen (or being fetched): keep the video paused
//   ads.roll          the ad to draw with <InstreamAd roll={ads.roll} onDone={ads.finish} />
//   ads.check(t)      call on every timeupdate with the video's current time (mid-roll ads)
//   ads.onEnded()     call when the video ends: true = an end ad took over, don't loop yet
//
// Every break is asked for at most once per mount. No ad (nothing running, already seen, creator's own video)
// just means the video carries on.

const ASK_TIMEOUT_MS = 4000;
const seen = []; // ads this visitor just saw, so the next break doesn't repeat one

async function ask(body, timeoutMs) {
  const ctl = typeof AbortController === "function" ? new AbortController() : null;
  const timer = ctl && timeoutMs ? setTimeout(() => ctl.abort(), timeoutMs) : null;
  try {
    const res = await fetch("/api/ads/instream", { method: "POST", body: JSON.stringify(body), cache: "no-store", keepalive: true, signal: ctl?.signal });
    return await res.json();
  } catch {
    return {};
  } finally {
    clearTimeout(timer);
  }
}

// The ad has played long enough to count. Fire and forget; the server decides whether it pays.
export function reportInstreamView(token) {
  if (!token) return;
  ask({ action: "complete", token }, 0);
}

export function useInstreamAds({ postId, breaks, active = true, onRestart }) {
  const list = Array.isArray(breaks) && breaks.length ? breaks : null;
  const [roll, setRoll] = useState(null);
  const [loading, setLoading] = useState(false);
  const done = useRef(new Set());
  const busy = useRef(false);
  const gen = useRef(0);
  const restart = useRef(onRestart);
  useEffect(() => {
    restart.current = onRestart;
  });

  const begin = useCallback(
    async (b) => {
      if (!list || busy.current || done.current.has(b.idx)) return;
      done.current.add(b.idx);
      busy.current = true;
      setLoading(true);
      const g = gen.current;
      const j = await ask({ action: "serve", postId, idx: b.idx, exclude: seen.slice(-3) }, ASK_TIMEOUT_MS);
      if (g !== gen.current) return; // the viewer moved on while we waited
      setLoading(false);
      if (!j.ad || !j.token) {
        busy.current = false;
        if (b.kind === "end") restart.current?.();
        return;
      }
      seen.push(j.ad.id);
      if (seen.length > 12) seen.shift();
      // Warm the poster so the ad doesn't flash empty.
      if (j.ad.media?.src && typeof Image !== "undefined") {
        const im = new Image();
        im.referrerPolicy = "no-referrer";
        im.src = j.ad.media.src;
      }
      setRoll({ ad: j.ad, token: j.token, seconds: j.seconds, idx: b.idx, kind: b.kind, n: b.idx + 1, of: list.length });
    },
    [list, postId]
  );

  // The ad is over (finished or skipped).
  const finish = useCallback(() => {
    const kind = roll?.kind;
    busy.current = false;
    setRoll(null);
    if (kind === "end") restart.current?.();
  }, [roll]);

  // Pre-roll: as soon as the video would start playing.
  const start = list?.find((b) => b.kind === "start");
  useEffect(() => {
    if (active && start) begin(start);
  }, [active, start, begin]);

  // Leaving the screen drops whatever was in flight or on screen; what was already counted stays counted.
  useEffect(() => {
    if (active) return;
    gen.current += 1;
    busy.current = false;
    setRoll(null);
    setLoading(false);
  }, [active]);

  const check = useCallback(
    (t) => {
      if (!list || busy.current) return;
      const due = list.find((b) => b.kind === "mid" && !done.current.has(b.idx) && t >= b.at);
      if (due) begin(due);
    },
    [list, begin]
  );

  const onEnded = useCallback(() => {
    if (!list || busy.current) return false;
    const end = list.find((b) => b.kind === "end" && !done.current.has(b.idx));
    if (!end) return false;
    begin(end);
    return true;
  }, [list, begin]);

  return { enabled: !!list, hold: loading || !!roll, roll, check, onEnded, finish };
}
