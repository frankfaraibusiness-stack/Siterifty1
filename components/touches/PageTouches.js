"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/message-sync";
import { saveRecent } from "@/lib/recent-searches";

// Small global touches, mounted once in the root layout (see app/touches.css):
//   - a thin reading-progress bar along the top, plus --scroll-p on <html> (0 to 1)
//     that the scroll-to-top button's ring reads
//   - data-scrolled on <html>, so the header can lift off the page once you scroll
//   - an "You're offline" / "Back online" pill
//   - the unread message count in the browser tab title, "(2) Messages · GTAFanbase"
//   - remembers what you search for (shown as chips on /search)
//   - an old-school cheat code. Up up down down left right left right B A.

const CHEAT = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
const typing = (el) => !!el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));

const onlineStore = {
  subscribe(fn) {
    window.addEventListener("online", fn);
    window.addEventListener("offline", fn);
    return () => {
      window.removeEventListener("online", fn);
      window.removeEventListener("offline", fn);
    };
  },
  get: () => navigator.onLine,
  server: () => true,
};

const stripBadge = (t) => t.replace(/^\(\d+\+?\)\s/, "");

export default function PageTouches() {
  const pathname = usePathname();
  const online = useSyncExternalStore(onlineStore.subscribe, onlineStore.get, onlineStore.server);
  const sync = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const unread = (sync.unread || 0) + (sync.requests || 0);
  const [backFlash, setBackFlash] = useState(false);
  const [cheat, setCheat] = useState(false);
  const wasOffline = useRef(false);

  // Scroll progress + header lift.
  useEffect(() => {
    const root = document.documentElement;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const y = Math.max(0, window.scrollY);
      const max = root.scrollHeight - window.innerHeight;
      const p = max > 0 ? Math.min(1, y / max) : 0;
      root.style.setProperty("--scroll-p", p.toFixed(4));
      if (y > 8) root.setAttribute("data-scrolled", "");
      else root.removeAttribute("data-scrolled");
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    // Page height changes as posts, images and comments load.
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(queue) : null;
    ro?.observe(document.body);
    return () => {
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      ro?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      root.removeAttribute("data-scrolled");
      root.style.removeProperty("--scroll-p");
    };
  }, [pathname]);

  // "Back online" flash after an offline spell.
  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return undefined;
    }
    if (!wasOffline.current) return undefined;
    wasOffline.current = false;
    const show = setTimeout(() => setBackFlash(true), 0);
    const hide = setTimeout(() => setBackFlash(false), 2600);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [online]);

  // Unread count in the tab title. Next rewrites the title on every page change,
  // so a MutationObserver puts the badge back on the new title.
  useEffect(() => {
    let applying = false;
    const apply = () => {
      const base = stripBadge(document.title);
      const next = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
      if (document.title !== next) {
        applying = true;
        document.title = next;
        applying = false;
      }
    };
    apply();
    const mo = new MutationObserver(() => {
      if (!applying) apply();
    });
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => {
      mo.disconnect();
      document.title = stripBadge(document.title);
    };
  }, [unread]);

  // Remember searches (any form marked role="search": the header bar, the /search page).
  useEffect(() => {
    const onSubmit = (e) => {
      const form = e.target;
      if (!form?.matches?.('form[role="search"]')) return;
      const q = new FormData(form).get("q");
      if (typeof q === "string") saveRecent(q);
    };
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, []);

  // The cheat code.
  useEffect(() => {
    let at = 0;
    let hide;
    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e.target)) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (k === "Escape") return setCheat(false);
      at = k === CHEAT[at] ? at + 1 : k === CHEAT[0] ? 1 : 0;
      if (at === CHEAT.length) {
        at = 0;
        setCheat(true);
        clearTimeout(hide);
        hide = setTimeout(() => setCheat(false), 4800);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(hide);
    };
  }, []);

  return (
    <>
      <div className="pt-progress" aria-hidden="true">
        <i />
      </div>

      {(!online || backFlash) && (
        <div className={`pt-net${online ? " back" : ""}`} role="status" aria-live="polite">
          <span className="pt-net-dot" aria-hidden="true" />
          {online ? "Back online" : "You’re offline. Posts you’ve opened still work."}
        </div>
      )}

      {cheat && (
        <button type="button" className="pt-mission" onClick={() => setCheat(false)} title="Tap to dismiss">
          <span className="pt-mission-title">Mission passed</span>
          <span className="pt-mission-sub">Respect +</span>
        </button>
      )}
    </>
  );
}
