"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";
import SideMenu from "./SideMenu";

// How long the menu's slide-out animation runs before it is removed (ms).
const MENU_CLOSE_MS = 220;

// `returnHome` swaps everything on the right for a single "Return home" link
// (used by the Gift Shop, which has its own wallet and checkout below).
export default function SiteHeaderClient({ user, returnHome = false }) {
  const [authView, setAuthView] = useState(null); // null | "login" | "signup"
  const [menu, setMenu] = useState("closed"); // "closed" | "open" | "closing"
  const menuBtn = useRef(null);
  const closeTimer = useRef(null);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const openMenu = useCallback(() => {
    clearTimeout(closeTimer.current);
    setMenu("open");
  }, []);

  // Slides the menu out, then removes it. Escape, the X and the dark backdrop
  // hand focus back to the hamburger; following a link does not.
  const closeMenu = useCallback((restoreFocus = true) => {
    setMenu((m) => (m === "open" ? "closing" : m));
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setMenu("closed");
      if (restoreFocus) menuBtn.current?.focus();
    }, MENU_CLOSE_MS);
  }, []);

  // "Join the Heist" / "Log in" inside the menu: drop the menu, show the modal.
  const openAuthFromMenu = useCallback((view) => {
    clearTimeout(closeTimer.current);
    setMenu("closed");
    setAuthView(view);
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="header-left">
          <button
            ref={menuBtn}
            type="button"
            className="hamburger"
            aria-label="Menu"
            aria-haspopup="dialog"
            aria-expanded={menu === "open"}
            aria-controls="site-menu"
            onClick={() => (menu === "open" ? closeMenu() : openMenu())}
          >
            <span className="hamburger-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>

          <Link href="/" className="brand" aria-label="GTAFanbase.com home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo"
              src="/logo.webp"
              alt="GTAFanbase.com"
              width="540"
              height="300"
              decoding="async"
            />
            <span className="brand-word" aria-hidden="true">
              GTAFANBASE<em>.COM</em>
            </span>
          </Link>
        </div>

        {returnHome ? (
          <div className="header-actions">
            <Link href="/" className="header-home">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 11.2 12 4l8 7.2" />
                <path d="M6.2 9.8V19a1 1 0 0 0 1 1h3.3v-5.2h3V20h3.3a1 1 0 0 0 1-1V9.8" />
              </svg>
              <span>Return home</span>
            </Link>
          </div>
        ) : user ? (
          <div className="header-actions">
            {user.username && (
              <Link href={`/u/${user.username}`} className="header-profile">
                <span className="header-profile-dot">
                  {user.username.charAt(0).toUpperCase()}
                </span>
                <span className="header-profile-name">Profile</span>
              </Link>
            )}
            {user.username && (
              <Link href="/settings" className="header-settings" aria-label="Settings">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4.9a7.6 7.6 0 0 0-2.6-1.5L14 2.4h-4l-.4 2.5A7.6 7.6 0 0 0 7 6.4l-2.4-.9-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4.9 2-3.4z" />
                </svg>
              </Link>
            )}
            {user.username && (
              <Link href="/create" className="header-create">
                <span aria-hidden="true">+</span>
                <span className="header-create-label">Create</span>
              </Link>
            )}
          </div>
        ) : (
          <button className="signup-btn" onClick={() => setAuthView("login")}>
            <span className="signup-btn-inner">Join the Heist</span>
          </button>
        )}
      </header>

      {menu !== "closed" && (
        <SideMenu
          user={user}
          closing={menu === "closing"}
          onClose={() => closeMenu()}
          onNavigate={() => closeMenu(false)}
          onAuth={openAuthFromMenu}
        />
      )}

      {authView && <AuthModal initialView={authView} onClose={() => setAuthView(null)} />}
    </>
  );
}
