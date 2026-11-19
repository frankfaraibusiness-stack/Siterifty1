"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XP, comboMultiplier } from "@/lib/videos-config";

// Everything the Videos tab knows about the player: server state, the
// not-yet-confirmed XP shown straight away, the combo, and the little banners
// ("+20 XP", "Mission passed") that fly across the screen.
//
// The browser only REPORTS what happened. Claims wait ~1.4s, go to the server
// in one batch, and the server's answer replaces the browser's guess.

const FLUSH_MS = 1400;
const POP_MS = 2400;
const JSON_HEADERS = { "Content-Type": "application/json" };

export const tzMinutes = () => -new Date().getTimezoneOffset();

export function useReelProgress({ signedIn }) {
  const [view, setView] = useState(null);
  const [bonus, setBonus] = useState(0); // XP shown but not yet confirmed
  const [chain, setChain] = useState(0);
  const [pops, setPops] = useState([]);
  const [found, setFound] = useState(() => new Set());
  const queue = useRef([]);
  const timer = useRef(null);
  const busy = useRef(false);
  const again = useRef(false);
  const bonusRef = useRef(0);
  const chainRef = useRef(0);
  const popId = useRef(0);

  const pop = useCallback((kind, text, sub) => {
    const id = (popId.current += 1);
    setPops((list) => [...list.slice(-3), { id, kind, text, sub }]);
    setTimeout(() => setPops((list) => list.filter((p) => p.id !== id)), POP_MS);
  }, []);

  // First load.
  useEffect(() => {
    if (!signedIn) return undefined;
    let live = true;
    fetch(`/api/videos/progress?tz=${tzMinutes()}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!live || !d?.view) return;
        setView(d.view);
        // A new visit always starts a fresh combo (the server's chain times out the same way).
        chainRef.current = 0;
        setChain(0);
        setFound(new Set(d.view.found));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [signedIn]);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    if (!queue.current.length) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    const events = queue.current.splice(0, 20);
    const sent = bonusRef.current;
    try {
      const res = await fetch("/api/videos/progress", {
        method: "POST",
        headers: JSON_HEADERS,
        body: JSON.stringify({ events, tz: tzMinutes() }),
        keepalive: true,
      });
      const d = await res.json().catch(() => null);
      if (res.ok && d?.view) {
        bonusRef.current -= sent;
        setBonus(bonusRef.current);
        setView(d.view);
        setFound(new Set(d.view.found));
        for (const m of d.missionsDone || []) pop("mission", "Mission passed", `${m.title} · +${m.xp} XP`);
        if (d.streak) pop("streak", `${d.streak.days}-day streak`, `+${d.streak.xp} XP`);
        if (d.rankUp) pop("rank", "Rank up", d.rankUp.name);
      } else if (res.status === 401) {
        bonusRef.current = 0;
        setBonus(0);
      }
    } catch {
      // Offline: the claims are dropped, the next real state from the server corrects the numbers.
      bonusRef.current -= sent;
      setBonus(bonusRef.current);
    } finally {
      busy.current = false;
      if (again.current || queue.current.length) {
        again.current = false;
        timer.current = setTimeout(flush, 250);
      }
    }
  }, [pop]);

  const send = useCallback(
    (event) => {
      if (!signedIn) return;
      queue.current.push(event);
      clearTimeout(timer.current);
      timer.current = setTimeout(flush, FLUSH_MS);
    },
    [signedIn, flush]
  );

  const gain = useCallback((xp) => {
    bonusRef.current += xp;
    setBonus(bonusRef.current);
  }, []);

  // A clip played to the end (80%+). Returns the multiplier it was paid at.
  const finished = useCallback(
    ({ id, seconds, duration }) => {
      const mult = comboMultiplier(chainRef.current);
      chainRef.current += 1;
      setChain(chainRef.current);
      if (signedIn) {
        gain(XP.watch * mult);
        pop("xp", `+${XP.watch * mult} XP`, mult > 1 ? `Combo ×${mult}` : "Clip finished");
      }
      send({ type: "watch", postId: id, seconds, duration });
      return mult;
    },
    [signedIn, gain, pop, send]
  );

  // Swiped away before it counted: the combo breaks.
  const skipped = useCallback(() => {
    if (chainRef.current > 0) {
      chainRef.current = 0;
      setChain(0);
      send({ type: "skip" });
    }
  }, [send]);

  const claimed = useCallback(
    (type, postId) => {
      if (!signedIn) return;
      if (XP[type]) gain(XP[type]);
      send({ type, postId });
    },
    [signedIn, gain, send]
  );

  const foundPackage = useCallback(
    (postId) => {
      setFound((s) => new Set(s).add(postId));
      if (signedIn) {
        gain(XP.package);
        pop("package", "Package found", `+${XP.package} XP`);
      }
      send({ type: "package", postId });
    },
    [signedIn, gain, pop, send]
  );

  // Don't lose claims when the tab is closed or hidden.
  useEffect(() => {
    const out = () => flush();
    const vis = () => document.visibilityState === "hidden" && flush();
    window.addEventListener("pagehide", out);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("pagehide", out);
      document.removeEventListener("visibilitychange", vis);
      flush();
      clearTimeout(timer.current);
    };
  }, [flush]);

  return { view, bonus, chain, pops, found, pop, finished, skipped, claimed, foundPackage };
}
