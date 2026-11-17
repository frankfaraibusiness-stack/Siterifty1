"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useScrollLock } from "@/lib/use-scroll-lock";
import { PLANS, getPlan, planRank } from "@/lib/plans";
import PlanBadges from "./PlanBadges";
import { HELP_PAGES, LEGAL_PAGES } from "@/lib/site";

// The slide-out menu behind the hamburger (opened from SiteHeaderClient).
//
// Layout, top to bottom:
//   sticky top bar   logo + close
//   scrolling body   player card (name, rank, Upgrade for free members)
//                    Missions   (the products: need an account, blurred and
//                                locked behind a sign-in card when signed out)
//                    Fine print (legal pages: always open)
//                    Help       (about / help / contact: always open)
//   sticky bottom    Log out (only when signed in)
//
// Styles live in app/sidemenu.css.

// 24px grid, 2px stroke outline icons, same style as MainNav.
const ICONS = {
  feed: <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  chat: (
    <>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1H10l-4.6 3.6a.5.5 0 0 1-.8-.4V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
      <path d="M8 10.2h8M8 13h5" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" />
      <circle cx="17.4" cy="9.4" r="2.4" />
      <path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
    </>
  ),
  create: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <path d="M12 8v8M8 12h8" />
    </>
  ),
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.5" r="3.6" />
      <path d="M4.8 20c.7-4 3.7-6 7.2-6s6.5 2 7.2 6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4z" />
    </>
  ),
  rank: (
    <>
      <path d="m6 13.5 6-6 6 6" />
      <path d="m6 19 6-6 6 6" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M12 9v11M3.5 9h17M12 9C9.5 9 7.5 7.8 7.5 6.2 7.5 4.9 8.7 4.2 9.8 4.5 11 4.9 12 7 12 9zm0 0c2.5 0 4.5-1.2 4.5-2.8 0-1.3-1.2-2-2.3-1.7C13 4.9 12 7 12 9z" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5M12 14.5v2.5" />
    </>
  ),
  out: (
    <>
      <path d="M9.5 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3.5" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  bookmark: <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  doc: (
    <>
      <path d="M7 3.5h7l4.5 4.5v11A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5z" />
      <path d="M14 3.5V8h4.5M8.5 12.5h7M8.5 16h7" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 5 6v5.5c0 4.2 2.8 7.2 7 9 4.2-1.8 7-4.8 7-9V6z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </>
  ),
  cookie: (
    <>
      <path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5 3.5 3.5 0 0 0 15 7a3.5 3.5 0 0 0 3.5 3.5 2 2 0 0 0 2 2z" />
      <path d="M8.5 11h.01M12 16h.01M15.5 14.5h.01" />
    </>
  ),
  flag: <path d="M6 21V4M6 5h11l-2.5 4 2.5 4H6" />,
  copyright: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M14.8 9.6a3.4 3.4 0 1 0 0 4.8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8h.01" />
    </>
  ),
  star: <path d="m12 3.8 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.8 1-5.8-4.2-4.1 5.8-.8z" />,
  help: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.6a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9M12 16.8h.01" />
    </>
  ),
  mail: (
    <>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2.5" />
      <path d="m4.5 7.5 7.5 6 7.5-6" />
    </>
  ),
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

// Products. Each one is a "mission" with a coloured radar blip, like the map.
function missions(username, isFree) {
  return [
    { key: "feed", title: "Main feed", note: "Catch up on Leonida", href: "/", icon: "feed", tone: "cyan", here: (p) => p === "/" },
    { key: "communities", title: "Communities", note: "Find your crew", href: "/communities", icon: "people", tone: "violet", here: (p) => p.startsWith("/communities") || p.startsWith("/c/") },
    { key: "events", title: "Events", note: "Meetups, game nights, watch parties", href: "/events", icon: "calendar", tone: "orange", here: (p) => p.startsWith("/events") },
    { key: "world", title: "Leonida World Hub", note: "Discover, collect and predict", href: "/world", icon: "map", tone: "cyan", here: (p) => p.startsWith("/world") },
    { key: "create", title: "Create", note: "Drop a post, clip or poll", href: "/create", icon: "create", tone: "pink", here: (p) => p.startsWith("/create") },
    { key: "messages", title: "Messages", note: "Chat, swap codes, plan heists", href: "/messages", icon: "chat", tone: "violet", here: (p) => p.startsWith("/messages") },
    { key: "search", title: "Search", note: "Track something down", href: "/search", icon: "search", tone: "lime", here: (p) => p.startsWith("/search") },
    { key: "saved", title: "Saved posts", note: "Your bookmarks", href: "/saved", icon: "bookmark", tone: "lime", here: (p) => p.startsWith("/saved") },
    {
      key: "profile",
      title: "Your profile",
      note: "Your character",
      href: username ? `/u/${username}` : "/profile",
      icon: "user",
      tone: "blue",
      here: (p) => p === "/profile" || (!!username && p.toLowerCase() === `/u/${username}`.toLowerCase()),
    },
    { key: "settings", title: "Settings", note: "Tune the city", href: "/settings", icon: "gear", tone: "orange", here: (p) => p.startsWith("/settings") },
    { key: "upgrade", title: "Upgrade", note: isFree ? "Rank up your account" : "Change your plan", href: "/upgrade", icon: "rank", tone: "gold", here: (p) => p.startsWith("/upgrade") },
    { key: "perks", title: "Perks shop", note: "One-time upgrades, yours forever", href: "/perks", icon: "gift", tone: "pink", here: (p) => p.startsWith("/perks") },
  ];
}

// The fine-print and help links come from lib/site.js (INFO_PAGES), the one
// list every info page, the sitemap and this menu read. Edit titles there.
const LEGAL = LEGAL_PAGES.map((p) => ({ title: p.menuTitle, href: p.href, icon: p.icon }));
const HELP = HELP_PAGES.map((p) => ({ title: p.menuTitle, href: p.href, icon: p.icon }));

function Avatar({ username }) {
  const [broken, setBroken] = useState(false);
  const letter = (username || "?").charAt(0).toUpperCase();
  return (
    <span className="pm-av" aria-hidden="true">
      <span className="pm-av-in">
        <span className="pm-av-letter">{letter}</span>
        {username && !broken && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/avatar/${encodeURIComponent(username)}`}
            alt=""
            draggable={false}
            onError={() => setBroken(true)}
          />
        )}
      </span>
    </span>
  );
}

export default function SideMenu({ user, closing, onClose, onNavigate, onAuth }) {
  const pathname = usePathname() || "/";
  const panel = useRef(null);
  const closeBtn = useRef(null);
  const touch = useRef(null);
  const [plan, setPlan] = useState(null); // plan id once known
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState("");

  const signedIn = !!user;
  const uid = user?.uid;
  const info = plan ? getPlan(plan) : null;
  const rank = plan ? planRank(plan) : -1;
  const isFree = !!plan && rank === 0;

  useScrollLock(true);

  // Land on the close button, so keyboard and screen reader users start inside.
  useEffect(() => {
    closeBtn.current?.focus();
  }, []);

  // Escape closes, Tab stays inside the panel.
  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !panel.current) return;
      const nodes = [...panel.current.querySelectorAll("a[href], button:not([disabled])")].filter(
        (n) => !n.closest("[inert]")
      );
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!panel.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Which plan are they on? Decides the rank pips and whether Upgrade shows.
  useEffect(() => {
    if (!uid) return undefined;
    let live = true;
    fetch("/api/plan", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (live && d?.plan) setPlan(d.plan);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [uid]);

  // Swipe left on the panel to close it.
  function onTouchStart(e) {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e) {
    const s = touch.current;
    touch.current = null;
    if (!s) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (dx < -70 && Math.abs(dy) < 60) onClose();
  }

  async function logout() {
    setLoggingOut(true);
    setError("");
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout failed");
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
      setError("Couldn’t log out. Try again.");
    }
  }

  const rows = missions(user?.username, isFree);
  const vars = info ? { "--a": info.a, "--b": info.b } : undefined;

  return createPortal(
    <div className="pm-root" data-state={closing ? "closing" : "open"}>
      <div className="pm-scrim" onClick={onClose} aria-hidden="true" />

      <aside
        ref={panel}
        id="site-menu"
        className="pm"
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Sticky top bar */}
        <div className="pm-top">
          <Link href="/" className="brand" aria-label="GTAFanbase.com home" onClick={onNavigate}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.webp" alt="" width="540" height="300" decoding="async" />
            <span className="brand-word" aria-hidden="true">
              GTAFANBASE<em>.COM</em>
            </span>
          </Link>
          <button ref={closeBtn} type="button" className="pm-x" aria-label="Close menu" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>

        <div className="pm-body">
          {/* Player card */}
          <section className="pm-card" style={vars} aria-label="Your account">
            <div className="pm-who">
              <Avatar username={user?.username} />
              <div className="pm-who-text">
                {signedIn ? (
                  <>
                    <div className="pm-name-row">
                      <span className="pm-name">{user.username || "Player"}</span>
                      {plan && <PlanBadges plan={plan} />}
                    </div>
                    <div className={`pm-rank${plan ? "" : " pm-loading"}`}>
                      <span className="pm-pips" aria-hidden="true">
                        {PLANS.map((p, i) => (
                          <i key={p.id} className={i <= rank ? "on" : ""} style={{ "--p": i }} />
                        ))}
                      </span>
                      {info && <span className="pm-rank-name">{info.name}</span>}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="pm-name-row">
                      <span className="pm-name">Guest</span>
                    </div>
                    <div className="pm-rank">
                      <span className="pm-rank-name">Not signed in</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {isFree && (
              <Link href="/upgrade" className="pm-upgrade" onClick={onNavigate}>
                <Icon name="rank" />
                <span>Upgrade</span>
              </Link>
            )}
          </section>

          {/* Missions: the products. Locked and blurred when signed out. */}
          <section className={`pm-sec pm-missions${signedIn ? "" : " pm-locked"}`} aria-labelledby="pm-h-missions">
            <h2 id="pm-h-missions" className="pm-h">
              Missions
            </h2>
            <ul className="pm-list" inert={signedIn ? undefined : true} aria-hidden={signedIn ? undefined : true}>
              {rows.map((r, i) => {
                const here = signedIn && r.here(pathname);
                return (
                  <li key={r.key} style={{ "--i": i }}>
                    <Link
                      href={r.href}
                      className={`pm-row pm-t-${r.tone}${here ? " pm-here" : ""}`}
                      aria-current={here ? "page" : undefined}
                      onClick={onNavigate}
                    >
                      <span className="pm-row-in">
                        <span className="pm-blip">
                          <Icon name={r.icon} />
                        </span>
                        <span className="pm-row-t">
                          <span className="pm-row-title">{r.title}</span>
                          <span className="pm-row-note">{r.note}</span>
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>

            {!signedIn && (
              <div className="pm-gate">
                <div className="pm-gate-card" role="group" aria-labelledby="pm-gate-h">
                  <span className="pm-gate-lock">
                    <Icon name="lock" />
                  </span>
                  <h3 id="pm-gate-h">Locked until you sign in</h3>
                  <p>Post, join communities and build your profile with a free account.</p>
                  <button type="button" className="pm-btn" onClick={() => onAuth("signup")}>
                    Join the Heist
                  </button>
                  <button type="button" className="pm-btn ghost" onClick={() => onAuth("login")}>
                    I already have an account
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="pm-sec" aria-labelledby="pm-h-legal">
            <h2 id="pm-h-legal" className="pm-h">
              Fine print
            </h2>
            <ul className="pm-quiet">
              {LEGAL.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} prefetch={false} className="pm-q" onClick={onNavigate}>
                    <Icon name={l.icon} />
                    <span>{l.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="pm-sec" aria-labelledby="pm-h-help">
            <h2 id="pm-h-help" className="pm-h">
              Help
            </h2>
            <ul className="pm-quiet">
              {HELP.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} prefetch={false} className="pm-q" onClick={onNavigate}>
                    <Icon name={l.icon} />
                    <span>{l.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Sticky bottom: log out */}
        {signedIn && (
          <div className="pm-foot">
            {error && (
              <p className="pm-err" role="alert">
                {error}
              </p>
            )}
            <button type="button" className="pm-out" onClick={logout} disabled={loggingOut}>
              <span>{loggingOut ? "Logging out…" : "Log out"}</span>
              <Icon name="out" />
            </button>
          </div>
        )}
      </aside>
    </div>,
    document.body
  );
}
