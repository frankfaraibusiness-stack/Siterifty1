"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { REFERRAL_BONUS_MILLS, REFERRAL_XP_TARGET, formatUsd } from "@/lib/referrals";

const n = (v) => Number(v || 0).toLocaleString("en-US");

function ago(ms) {
  if (!ms) return "";
  const m = Math.floor((Date.now() - ms) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 30 ? `${d}d ago` : `${Math.floor(d / 30)}mo ago`;
}

function Stat({ label, value, sub, tone }) {
  return (
    <div className={`rf-stat${tone ? ` is-${tone}` : ""}`}>
      <span className="rf-stat-label">{label}</span>
      <b className="rf-stat-value">{value}</b>
      <span className="rf-stat-sub">{sub}</span>
    </div>
  );
}

// The member's numbers and the people they referred. Server-rendered first, then quietly refreshed
// whenever the tab comes back into view (and once a minute), so a payout shows up without a reload.
export default function Dashboard({ initial }) {
  const [data, setData] = useState(initial);

  useEffect(() => {
    let alive = true;
    let busy = false;
    async function pull() {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const res = await fetch("/api/referrals", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const next = await res.json();
        if (alive) setData(next);
      } catch {
        /* keep showing what we have */
      } finally {
        busy = false;
      }
    }
    const onVisible = () => {
      if (!document.hidden) pull();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", pull);
    const tick = setInterval(pull, 60_000);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", pull);
      clearInterval(tick);
    };
  }, []);

  if (!data) {
    return (
      <section className="rf-card rf-empty" aria-labelledby="rf-dash-h">
        <h2 id="rf-dash-h">Your dashboard</h2>
        <p>We couldn’t load your numbers just now. Refresh the page and they’ll be right here.</p>
      </section>
    );
  }

  const { totals, referrals } = data;
  return (
    <section className="rf-dash" aria-labelledby="rf-dash-h">
      <div className="rf-head">
        <h2 id="rf-dash-h">Your dashboard</h2>
        <p>Updates on its own. A payout appears here the moment it lands in your wallet.</p>
      </div>

      <div className="rf-stats">
        <Stat label="Link visits" value={n(totals.clicks)} sub="Counted once per browser, signed up or not" />
        <Stat
          label="Joined"
          value={n(totals.joined)}
          sub={totals.clicks > 0 ? `${Math.min(100, Math.round((totals.joined / totals.clicks) * 100))}% of visits signed up` : "+1 for every sign-up"}
          tone="cyan"
        />
        <Stat
          label="In progress"
          value={n(totals.inProgress)}
          sub={totals.inProgress ? `${formatUsd(totals.pendingMills)} waiting to unlock` : "Nobody waiting yet"}
          tone="lime"
        />
        <Stat label="Earned" value={formatUsd(totals.earnedMills)} sub={`${n(totals.paid)} paid · in your wallet`} tone="gold" />
      </div>

      <div className="rf-card rf-list">
        <div className="rf-list-head">
          <h3>People you referred</h3>
          <span>
            {referrals.length ? `${n(referrals.length)} shown` : ""}
          </span>
        </div>
        {referrals.length === 0 ? (
          <div className="rf-empty-inline">
            <b>No sign-ups yet.</b>
            <span>Share your link above. The first person who joins through it shows up here instantly.</span>
          </div>
        ) : (
          <ul>
            {referrals.map((r) => (
              <li key={r.uid} className="rf-row">
                <Link href={`/u/${r.username}`} className="rf-av" aria-label={`${r.username}’s profile`}
                  style={{ backgroundImage: `url(/avatar/${encodeURIComponent(r.username)}), linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))` }} />
                <div className="rf-row-main">
                  <div className="rf-row-top">
                    <Link href={`/u/${r.username}`}>@{r.username}</Link>
                    <small>{r.paid ? `completed ${ago(r.paidMs) || "recently"} · ${formatUsd(REFERRAL_BONUS_MILLS)} paid` : `joined ${ago(r.joinedMs)}`}</small>
                  </div>
                  <div
                    className={`rf-bar${r.paid ? " is-full" : ""}`}
                    role="progressbar"
                    aria-label={`${r.username}’s progress to ${n(REFERRAL_XP_TARGET)} XP`}
                    aria-valuemin={0}
                    aria-valuemax={REFERRAL_XP_TARGET}
                    aria-valuenow={r.paid ? REFERRAL_XP_TARGET : r.xp}
                  >
                    <i style={{ width: `${r.pct}%` }} />
                  </div>
                </div>
                <span className={`rf-pill${r.paid ? " is-paid" : ""}`}>
                  {r.paid ? "✓ Completed" : `${n(r.xp)} / ${n(REFERRAL_XP_TARGET)} XP`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
