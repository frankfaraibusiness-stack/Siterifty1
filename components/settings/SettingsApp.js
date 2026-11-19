"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PlanBadges from "../PlanBadges";
import Discover from "../Discover";
import Skyline from "./Skyline";
import { SettingsContext } from "./context";
import CharacterPanel from "./CharacterPanel";
import StashPanel from "./StashPanel";
import WantedPanel from "./WantedPanel";
import LeakPanel from "./LeakPanel";
import LookPanel from "./LookPanel";
import ReelsPanel from "./ReelsPanel";
import AccessPanel from "./AccessPanel";
import MembershipPanel from "./MembershipPanel";
import StoriesPanel from "./StoriesPanel";
import RegionPanel from "./RegionPanel";
import {
  AccessIcon,
  BackIcon,
  CharacterIcon,
  ChevronIcon,
  GlobeIcon,
  LeakIcon,
  LockIcon,
  LogoutIcon,
  LookIcon,
  MembershipIcon,
  ReelIcon,
  StashIcon,
  StoriesIcon,
  WantedIcon,
} from "./icons";
import { getTheme } from "@/lib/profile-themes";
import { exposureStars } from "@/lib/settings";
import { accessSummary, applyAccess } from "@/lib/access";
import { getPlan } from "@/lib/plans";
import { audienceLabel } from "@/lib/story-schema";
import { readCurrencyChoice, rememberCurrency } from "@/lib/currency";
import { PRESETS, applyLook, hasLookCookie, isAiBubbleHidden, setAiBubble } from "@/lib/look";
import Toast, { useToast } from "../Toast";

// The ten panels. `id` is the URL hash (/settings#look). `summary(prefs, me)` is
// the live status chip shown on the panel's row.
const PANELS = [
  {
    id: "character",
    title: "Character",
    blurb: "Account: name, photo, privacy and sign-in",
    Icon: CharacterIcon,
    Panel: CharacterPanel,
    tile: ["--accent-pink", "--accent-cyan"],
    summary: (p) => (p.account.isPrivate ? "Private account" : "Public account"),
  },
  {
    id: "stash",
    title: "The Stash",
    blurb: "Content: how your posts start out",
    Icon: StashIcon,
    Panel: StashPanel,
    tile: ["--accent-lime", "--accent-pink"],
    summary: (p) =>
      ({ public: "Posts go to everyone", private: "Posts go to only you", ask: "Asks every time" })[
        p.content.visibility
      ],
  },
  {
    id: "wanted",
    title: "Wanted Level",
    blurb: "Privacy and safety: who finds and reaches you",
    Icon: WantedIcon,
    Panel: WantedPanel,
    tile: ["--accent-cyan", "--accent-lime"],
    summary: (p) => `${exposureStars(p)} of 5 stars`,
  },
  {
    id: "leaks",
    title: "Leak Filter",
    blurb: "Feed: spoilers, muted words and home layout",
    Icon: LeakIcon,
    Panel: LeakPanel,
    tile: ["--accent-pink", "--accent-lime"],
    summary: (p) => {
      const n = p.feed.mutedWords.length;
      return n ? `${n} muted ${n === 1 ? "word" : "words"}` : "No muted words";
    },
  },
  {
    id: "stories",
    title: "Stories",
    blurb: "Stories: who can watch and whether people reply",
    Icon: StoriesIcon,
    Panel: StoriesPanel,
    tile: ["--accent-pink", "--accent-lime"],
    summary: (p) => `${audienceLabel(p.stories.audience)}${p.stories.replies ? "" : ", no replies"}`,
  },
  {
    id: "reels",
    title: "Vice Reel",
    blurb: "Videos: sound, which reel opens and data use",
    Icon: ReelIcon,
    Panel: ReelsPanel,
    tile: ["--accent-lime", "--accent-cyan"],
    summary: (p) => `${p.reels.sound ? "Sound on" : "Starts muted"}${p.reels.dataSaver ? ", data saver" : ""}`,
  },
  {
    id: "look",
    title: "City Look",
    blurb: "Appearance: colours across the whole city",
    Icon: LookIcon,
    Panel: LookPanel,
    tile: ["--accent-cyan", "--accent-pink"],
    summary: (p) =>
      p.look.preset === "custom"
        ? "Custom colours"
        : PRESETS.find((x) => x.id === p.look.preset)?.name || "Vice City Neon",
  },
  {
    id: "region",
    title: "Region",
    blurb: "Currency: how prices are shown to you",
    Icon: GlobeIcon,
    Panel: RegionPanel,
    tile: ["--accent-lime", "--accent-pink"],
    summary: (p) => (p.region.currency === "auto" ? "Automatic" : p.region.currency),
  },
  {
    id: "access",
    title: "Access",
    blurb: "Accessibility: contrast, links and bigger buttons",
    Icon: AccessIcon,
    Panel: AccessPanel,
    tile: ["--accent-cyan", "--accent-lime"],
    summary: (p) => accessSummary(p.access),
  },
  {
    id: "membership",
    title: "Membership",
    blurb: "Plan and perks: what you have and what’s next",
    Icon: MembershipIcon,
    Panel: MembershipPanel,
    tile: ["--accent-pink", "--accent-cyan"],
    summary: (p, me) => getPlan(me.plan).short,
  },
];
const IDS = PANELS.map((p) => p.id);

export default function SettingsApp({ me: initialMe, prefs: initialPrefs, stats: initialStats, email }) {
  const [me, setMe] = useState(initialMe);
  const [prefs, setPrefs] = useState(initialPrefs);
  const { toast, show: showToast, hide: hideToast } = useToast();
  const [active, setActive] = useState(null); // null = the panel list (phones)
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();

  const confirmed = useRef(initialPrefs); // what the server last confirmed
  const pending = useRef({});
  const timers = useRef({});

  const notify = useCallback((text, bad = false) => showToast(text, bad ? "error" : "success"), [showToast]);

  const flush = useCallback(
    async (section) => {
      const patch = pending.current[section];
      if (!patch) return;
      delete pending.current[section];
      try {
        const res = await fetch("/api/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, patch }),
          keepalive: true,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Couldn’t save that.");
        confirmed.current = { ...confirmed.current, [section]: data.prefs };
        notify("Saved");
      } catch (err) {
        setPrefs(confirmed.current);
        if (section === "look") {
          applyLook(confirmed.current.look);
          setAiBubble(confirmed.current.look.aiBubble);
        }
        if (section === "access") applyAccess(confirmed.current.access);
        if (section === "region") {
          rememberCurrency(confirmed.current.region.currency);
          router.refresh();
        }
        notify(err.message || "Couldn’t save that. Check your connection.", true);
      }
    },
    [notify, router]
  );

  // update("content", { comments: false }): shows the change right away and
  // saves it a moment later (so dragging a slider doesn't spam the server).
  const update = useCallback(
    (section, patch) => {
      setPrefs((p) => ({ ...p, [section]: { ...p[section], ...patch } }));
      pending.current[section] = { ...pending.current[section], ...patch };
      clearTimeout(timers.current[section]);
      timers.current[section] = setTimeout(() => flush(section), 450);
    },
    [flush]
  );

  const setBlocked = useCallback((blocked) => {
    setPrefs((p) => ({ ...p, safety: { ...p.safety, blocked } }));
    confirmed.current = {
      ...confirmed.current,
      safety: { ...confirmed.current.safety, blocked },
    };
  }, []);

  // Save anything still waiting if the member leaves the page.
  useEffect(() => {
    const t = timers.current;
    const p = pending.current;
    return () => {
      for (const key of Object.keys(t)) clearTimeout(t[key]);
      for (const key of Object.keys(p)) flush(key);
    };
  }, [flush]);

  // A new device has no look cookie yet: apply the one saved on the account.
  useEffect(() => {
    if (!hasLookCookie()) applyLook(initialPrefs.look);
  }, [initialPrefs.look]);

  // The account's accessibility choices win over whatever this device had saved.
  useEffect(() => {
    applyAccess(initialPrefs.access);
  }, [initialPrefs.access]);

  // The account's currency wins over this device's: if they differ, switch and redraw the prices.
  useEffect(() => {
    const want = initialPrefs.region.currency;
    if (readCurrencyChoice() !== want) {
      rememberCurrency(want);
      router.refresh();
    }
  }, [initialPrefs.region.currency, router]);

  // "Never show the AI bubble" is sticky: if this device or the account says
  // hide, both end up on hide. (Turning it back on is done in City Look.)
  useEffect(() => {
    const account = initialPrefs.look.aiBubble;
    const device = isAiBubbleHidden() ? "hide" : "show";
    if (account === device) return;
    if (account === "hide") setAiBubble("hide");
    else update("look", { aiBubble: "hide" });
  }, [initialPrefs.look.aiBubble, update]);

  // The URL hash is the open panel, so the phone's back button closes it.
  useEffect(() => {
    const read = () => {
      const h = window.location.hash.slice(1);
      setActive(IDS.includes(h) ? h : null);
    };
    read();
    window.addEventListener("popstate", read);
    window.addEventListener("hashchange", read);
    return () => {
      window.removeEventListener("popstate", read);
      window.removeEventListener("hashchange", read);
    };
  }, []);

  function open(id) {
    window.history.pushState({ st: 1 }, "", `#${id}`);
    setActive(id);
    window.scrollTo({ top: 0 });
  }

  function back() {
    if (window.history.state?.st) {
      window.history.back();
    } else {
      window.history.replaceState(null, "", window.location.pathname);
      setActive(null);
    }
  }

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
      notify("Couldn’t log out. Try again.", true);
    }
  }

  const ctx = useMemo(
    () => ({ me, setMe, prefs, update, setBlocked, notify, email, stats: initialStats, openPanel: open }),
    [me, prefs, update, setBlocked, notify, email, initialStats]
  );

  const shown = PANELS.find((p) => p.id === (active || "character"));
  // The Perks row says how many you already own; everything else keeps its default line.
  const ownedPerks = (me.perks || []).length;
  const shopNotes = ownedPerks > 0 ? { perks: `You own ${ownedPerks}. Pay once, keep forever` } : undefined;
  const theme = getTheme(me.theme);
  const initial = (me.displayName || me.username).trim().charAt(0).toUpperCase();

  return (
    <SettingsContext.Provider value={ctx}>
      <main className="st" data-view={active ? "panel" : "hub"}>
        <div className="st-grid">
          <aside className="st-side" aria-label="Settings panels">
            <header className="st-hero" style={{ "--ta": theme.a, "--tb": theme.b }}>
              <div
                className={`st-hero-banner${me.bannerUrl ? " has-img" : ""}`}
                style={me.bannerUrl ? { backgroundImage: `url("${me.bannerUrl}")` } : undefined}
              >
                <Skyline />
              </div>
              <div className="st-hero-body">
                <div
                  className="st-avatar"
                  style={me.avatarUrl ? { backgroundImage: `url("${me.avatarUrl}")` } : undefined}
                  role="img"
                  aria-label="Your profile picture"
                >
                  {!me.avatarUrl && initial}
                </div>
                <div className="st-hero-names">
                  <h1 className="st-hero-title">Settings</h1>
                  <p className="st-hero-name">
                    {me.displayName}
                    <PlanBadges plan={me.plan} />
                  </p>
                  <p className="st-hero-handle">@{me.username}</p>
                </div>
              </div>
            </header>

            <nav className="st-nav">
              {PANELS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`st-row${shown.id === p.id ? " is-on" : ""}`}
                  aria-current={active === p.id ? "page" : undefined}
                  onClick={() => open(p.id)}
                >
                  <span
                    className="st-tile"
                    style={{ "--t1": `var(${p.tile[0]})`, "--t2": `var(${p.tile[1]})` }}
                  >
                    <p.Icon />
                  </span>
                  <span className="st-row-text">
                    <b>{p.title}</b>
                    <small>{p.blurb}</small>
                  </span>
                  <span className="st-chip">{p.summary(prefs, me)}</span>
                  <span className="st-chev">
                    <ChevronIcon />
                  </span>
                </button>
              ))}
            </nav>

            {/* Shops and extras: the places that used to be reachable only from the side menu. */}
            <Discover spot="settings" variant="rows" title="Shops and extras" notes={shopNotes} />

            <div className="st-side-foot">
              <button type="button" className="st-btn ghost wide" onClick={logout} disabled={loggingOut}>
                <LogoutIcon />
                {loggingOut ? "Logging out..." : "Log out"}
              </button>
              <p className="st-fineprint">
                <LockIcon /> Changes save automatically.
              </p>
            </div>
          </aside>

          <section className="st-main" key={shown.id} aria-labelledby="st-panel-title">
            <div className="st-topbar">
              <button type="button" className="st-back" onClick={back}>
                <BackIcon />
                <span>Settings</span>
              </button>
            </div>
            <div className="st-panel-head">
              <h2 id="st-panel-title">{shown.title}</h2>
              <p>{shown.blurb}</p>
            </div>
            <shown.Panel />
          </section>
        </div>

        <Toast toast={toast} onClose={hideToast} />
      </main>
    </SettingsContext.Provider>
  );
}
