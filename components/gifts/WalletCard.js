"use client";

import { useState } from "react";
import AuthModal from "../AuthModal";
import { INFINITE_WALLET, formatMills } from "@/lib/gifts";

function WalletIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H18v3" />
      <path d="M4 7.5V17a2 2 0 0 0 2 2h12.5a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 8H6.5A2.5 2.5 0 0 1 4 7.5z" />
      <circle cx="16.2" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

// The centred wallet balance under the header. The wallet pays for gifts (no
// card involved). There is no top-up page yet, so this only displays it.
export default function WalletCard({ mills = 0, signedIn = false }) {
  const [authOpen, setAuthOpen] = useState(false);
  const text = formatMills(signedIn ? mills : 0);
  const dot = text.lastIndexOf(".");
  return (
    <section className="gf-wallet" aria-label="Your wallet">
      <div className="gf-wallet-card">
        <span className="gf-wallet-glow" aria-hidden="true" />
        <span className="gf-wallet-eyebrow">
          <WalletIcon /> Wallet balance
        </span>
        <p className="gf-wallet-amount" aria-live="polite">
          <span>{text.slice(0, dot)}</span>
          <span className="gf-wallet-dec">{text.slice(dot)}</span>
        </p>
        <p className="gf-wallet-sub">Money you spend on gifts. No card needed.</p>
        {signedIn ? (
          <span className="gf-wallet-chip">{INFINITE_WALLET ? "Test mode: unlimited wallet" : "Top-ups coming soon"}</span>
        ) : (
          <button type="button" className="gf-wallet-login" onClick={() => setAuthOpen(true)}>
            Log in to see your balance
          </button>
        )}
      </div>
      {authOpen && <AuthModal initialView="login" onClose={() => setAuthOpen(false)} />}
    </section>
  );
}
