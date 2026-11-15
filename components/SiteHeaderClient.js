"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";

export default function SiteHeaderClient({ user }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="site-header">
        <div className="header-left">
          {/* Menu button: purely visual for now, it doesn't open anything yet. */}
          <button type="button" className="hamburger" aria-label="Menu">
            <span className="hamburger-bars" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          </button>

          <Link href="/" className="brand" aria-label="GTA6FanBase.com home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="brand-logo"
              src="/logo.webp"
              alt="GTA6 FanBase.com"
              width="360"
              height="240"
              decoding="async"
            />
            <span className="brand-word" aria-hidden="true">
              FANBASE<em>.COM</em>
            </span>
          </Link>
        </div>

        {user ? (
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
          <button className="signup-btn" onClick={() => setOpen(true)}>
            <span className="signup-btn-inner">Join the Heist</span>
          </button>
        )}
      </header>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}
