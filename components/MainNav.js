"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { getServerSnapshot, getSnapshot, subscribe } from "@/lib/message-sync";

// Small outline icons, drawn to match the rest of the UI (24px grid, 2px stroke).
const ICONS = {
  home: <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" />
      <circle cx="17.4" cy="9.4" r="2.4" />
      <path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  chat: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" />
    </>
  ),
};

const NAV_LINKS = [
  { label: "Main Feed", href: "/", icon: "home", match: (p) => p === "/" },
  { label: "Communities", href: "/communities", icon: "people", match: (p) => p.startsWith("/communities") || p.startsWith("/c/") },
  { label: "Messages", href: "/messages", icon: "chat", match: (p) => p.startsWith("/messages") },
  { label: "Events", href: "/events", icon: "calendar", match: (p) => p.startsWith("/events") },
];

// Scrolling down tucks the nav away under the header. It comes back when the
// reader scrolls up, or after the page has been still for this long.
const SHOW_AFTER_IDLE_MS = 3000;
// Ignore tiny scroll movements (trackpad jitter, momentum tail) so the nav
// doesn't flicker.
const SCROLL_THRESHOLD = 6;

export default function MainNav() {
  const pathname = usePathname() || "/";
  const sync = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const badge = sync.unread + sync.requests;
  const shell = useRef(null);

  useEffect(() => {
    const el = shell.current;
    if (!el) return undefined;
    const root = document.documentElement;
    let hidden = false;
    let lastY = window.scrollY;
    let idleTimer = null;

    // Sticky elements further down the page read --nav-h so they sit just
    // under the nav while it is showing, and tuck up under the header when not.
    const setHidden = (next) => {
      hidden = next;
      el.classList.toggle("is-hidden", next);
      root.style.setProperty("--nav-h", next ? "0px" : `${el.offsetHeight}px`);
    };
    setHidden(false);

    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      if (y < 8) {
        // Back at the very top: the nav is part of the page again.
        clearTimeout(idleTimer);
        lastY = y;
        if (hidden) setHidden(false);
        return;
      }
      const dy = y - lastY;
      if (dy > SCROLL_THRESHOLD) {
        // Scrolling down: hide, and bring it back once scrolling has stopped.
        lastY = y;
        if (!hidden) setHidden(true);
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => setHidden(false), SHOW_AFTER_IDLE_MS);
      } else if (dy < -SCROLL_THRESHOLD) {
        // Scrolling up: show straight away. Scrolling up never hides it.
        lastY = y;
        clearTimeout(idleTimer);
        if (hidden) setHidden(false);
      }
    };

    // Keyboard users tabbing into the nav should never find it hidden.
    const onKey = (e) => {
      if (e.key === "Tab" && hidden) {
        clearTimeout(idleTimer);
        setHidden(false);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKey);
      clearTimeout(idleTimer);
      root.style.removeProperty("--nav-h");
    };
  }, [pathname]);

  return (
    <div className="main-nav-shell" ref={shell}>
    <nav className={`main-nav${pathname === "/" ? " main-nav-home" : ""}`} aria-label="Main">
      {NAV_LINKS.map(({ label, href, icon, match }) => {
        const active = match ? match(pathname) : false;
        const Tag = Link;
        return (
          <Tag key={label} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill={active && icon === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[icon]}
            </svg>
            <span>{label}</span>
            {icon === "chat" && badge > 0 && (
              <b className="nav-badge" aria-label={`${badge} unread`}>
                {badge > 99 ? "99+" : badge}
              </b>
            )}
          </Tag>
        );
      })}
    </nav>
    </div>
  );
}
