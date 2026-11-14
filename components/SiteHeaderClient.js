"use client";

import { useState } from "react";
import AuthModal from "./AuthModal";

export default function SiteHeaderClient({ user }) {
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <a href="#" className="brand">
          GTA6<span>FanBase</span>
        </a>

        {user ? (
          <button
            className="signup-btn"
            onClick={handleLogout}
            disabled={loggingOut}
          >
            <span className="signup-btn-inner">
              {loggingOut ? "Logging out..." : "Log Out"}
            </span>
          </button>
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
