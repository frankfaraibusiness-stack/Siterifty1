"use client";

import { useState } from "react";
import Link from "next/link";
import AuthModal from "./AuthModal";

export default function SiteHeaderClient({ user }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.href = "/";
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          GTA6<span>FanBase</span>
        </Link>

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
              <Link href="/create" className="header-create">
                <span aria-hidden="true">+</span>
                <span className="header-create-label">Create</span>
              </Link>
            )}
            <button
              className="signup-btn"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <span className="signup-btn-inner">
                {loggingOut ? "Logging out..." : "Log Out"}
              </span>
            </button>
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
