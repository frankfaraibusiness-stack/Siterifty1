import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import { Bars, viewsLine } from "@/components/earnings/Earn";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan } from "@/lib/user-plan";
import { canUploadLongForm } from "@/lib/plans";
import { creatorEarnings } from "@/lib/instream-ads-data";
import { CREATOR_SHARE_PCT, creatorMicros, moneyText, rpmDollars } from "@/lib/instream-ads";
import "./earnings.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Creator earnings · GTAFanbase",
  description: "What your monetized Long form videos have earned from ads.",
};

const usd = (n) => `$${n.toFixed(2)}`;

export default async function EarningsPage() {
  const user = await getCurrentUser();

  if (!user?.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <main className="ern-page">
          <div className="empty-feed">
            <h2 className="empty-feed-title">Sign in to see your earnings</h2>
            <p className="empty-feed-sub">Log in and the ad earnings from your monetized videos will show up here.</p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        </main>
      </>
    );
  }

  const [plan, { total, videos }] = await Promise.all([getUserPlan(user.uid), creatorEarnings(user.uid)]);
  const eligible = canUploadLongForm(plan);
  const week = total.last7.reduce((s, r) => s + r.micros, 0);

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="ern-page">
        <Link href={`/u/${user.username}`} className="up-back">← Back to your profile</Link>

        <header className="ern-head">
          <h1>Creator earnings</h1>
          <p>You keep {CREATOR_SHARE_PCT}% of what advertisers pay for ads on your monetized Long form videos.</p>
        </header>

        <section className="ern-cards" aria-label="Totals">
          <div className="ern-card main"><small>Total earned</small><b>{moneyText(total.micros)}</b></div>
          <div className="ern-card"><small>Last 7 days</small><b>{moneyText(week)}</b></div>
          <div className="ern-card"><small>Ad views</small><b>{total.views.toLocaleString("en-US")}</b></div>
        </section>

        <section className="ern-panel">
          <h2>Last 7 days</h2>
          <Bars rows={total.last7} />
        </section>

        <section className="ern-panel">
          <h2>How you earn</h2>
          <ul className="ern-rates">
            <li><b>{usd(creatorMicros("video") / 1000)}</b><span>per 1,000 video ad views</span></li>
            <li><b>{usd(creatorMicros("image") / 1000)}</b><span>per 1,000 photo ad views</span></li>
            <li><b>about {usd(rpmDollars("mixed"))}</b><span>per 1,000 when both can play, depending on which ads are shown</span></li>
          </ul>
          <p className="ern-note">
            Every ad view is counted by our servers after the ad has really played, and never from your own views.
            Earnings are recorded to your account as they happen. Payouts aren’t switched on yet.
          </p>
        </section>

        <section className="ern-panel">
          <h2>Your videos</h2>
          {videos.length ? (
            <ul className="ern-list">
              {videos.map((v) => (
                <li key={v.id}>
                  <Link href={`/p/${v.id}`}>
                    <span className="ern-vt">{v.title || "Untitled video"}</span>
                    <small>{viewsLine(v)}</small>
                  </Link>
                  <b>{moneyText(v.micros)}</b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ern-empty">
              {eligible
                ? "Nothing earned yet. Upload a Long form video, switch on “Monetize this video” and choose where its ads play."
                : "Monetization is part of Creator Plus. Upgrade, upload a Long form video and switch on “Monetize this video” to start earning."}
            </p>
          )}
          {!eligible && <Link href="/upgrade" className="cmp-link">See plans</Link>}
        </section>
      </main>
      <ScrollTopButton />
    </>
  );
}
