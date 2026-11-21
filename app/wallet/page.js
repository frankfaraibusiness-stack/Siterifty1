import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import { WalletIcon, DepositIcon, WithdrawIcon, CardIcon, AdsIcon, GiftIcon, PerkIcon, InviteIcon, HeartIcon, SparkIcon, ShieldIcon, ClockIcon } from "@/components/wallet/icons";
import { getCurrentUser } from "@/lib/current-user";
import { getWalletOverview } from "@/lib/wallet-data";
import { moneyText } from "@/lib/instream-ads";
import { CREATOR_SHARE_PCT } from "@/lib/gifts";
import {
  MIN_WITHDRAW_MILLS,
  MIN_WITHDRAW_USD,
  cheapestGiftText,
  cheapestPerkText,
  formatMills,
  giftCount,
  greetingName,
  perkCount,
  withdrawProgress,
} from "@/lib/wallet";
import { shareMeta } from "@/lib/seo";
import "./wallet.css";

export const dynamic = "force-dynamic";

export const metadata = {
  ...shareMeta({
    title: "Your wallet · GTAFanbase",
    description: "Your GTAFanbase wallet: balance, deposits, creator earnings and gifts, all in one calm place.",
    path: "/wallet",
  }),
  robots: { index: false, follow: false },
};

const n = (v) => Number(v || 0).toLocaleString("en-US");

function Avatar({ p, size = 44 }) {
  const photo = p.hasAvatar !== false ? `url("/avatar/${encodeURIComponent(p.username)}?v=${p.avatarV || 0}"), ` : "";
  return (
    <span
      className="wl-av"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundImage: `${photo}linear-gradient(135deg, ${p.a}, ${p.b})` }}
    >
      {String(p.username || "?").charAt(0).toUpperCase()}
    </span>
  );
}

function Amount({ mills }) {
  const text = formatMills(mills);
  const dot = text.lastIndexOf(".");
  return (
    <>
      <span>{text.slice(0, dot)}</span>
      <span className="wl-dec">{text.slice(dot)}</span>
    </>
  );
}

function Log({ rows, empty }) {
  if (!rows.length) return <p className="wl-empty">{empty}</p>;
  return (
    <ul className="wl-rows">
      {rows.map((r) => (
        <li key={r.id}>
          <span className={`wl-row-ic ${r.group}`} aria-hidden="true">
            {r.group === "deposit" ? <DepositIcon /> : r.group === "withdraw" ? <WithdrawIcon /> : <SparkIcon />}
          </span>
          <span className="wl-row-main">
            <b>{r.label}</b>
            <small>{[r.dateText, r.status].filter(Boolean).join(" · ")}</small>
          </span>
          <b className={`wl-row-amt ${r.amountMills < 0 ? "neg" : "pos"}`}>
            {r.amountMills > 0 ? "+" : ""}
            {formatMills(r.amountMills)}
          </b>
        </li>
      ))}
    </ul>
  );
}

export default async function WalletPage() {
  const user = await getCurrentUser();

  if (!user?.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <main className="wl-page">
          <section className="wl-hero wl-hero-guest">
            <span className="wl-glow" aria-hidden="true" />
            <span className="wl-eyebrow"><WalletIcon /> Your wallet</span>
            <h1 className="wl-guest-title">Sign in to open your wallet</h1>
            <p className="wl-sub">Your balance, earnings and gifts live here, safe and private to you.</p>
            <Link href="/" className="wl-btn wl-btn-primary wl-guest-btn">Back to the feed</Link>
          </section>
        </main>
      </>
    );
  }

  const w = await getWalletOverview(user);
  const who = greetingName(w);
  const prog = withdrawProgress(w.balanceMills);
  const deposits = w.log.filter((r) => r.group === "deposit");
  const withdrawals = w.log.filter((r) => r.group === "withdraw");
  const total = w.sources.depositsMills + w.sources.adsMills + w.sources.giftsMills + w.sources.referralMills;

  const SOURCES = [
    { key: "deposit", Icon: CardIcon, title: "Your deposits", value: formatMills(w.sources.depositsMills), note: "Money you add yourself" },
    { key: "ads", Icon: AdsIcon, title: "Ad revenue", value: moneyText(w.sources.adsMicros), note: "From ads on your videos", href: "/earnings", cta: "See breakdown" },
    { key: "gifts", Icon: GiftIcon, title: "Gifts received", value: formatMills(w.sources.giftsMills), note: `Your ${CREATOR_SHARE_PCT}% share of every gift your audience sends` },
  ];
  if (w.sources.referralMills > 0) {
    SOURCES.push({ key: "ref", Icon: InviteIcon, title: "Referral bonuses", value: formatMills(w.sources.referralMills), note: "For fans you brought in", href: "/referrals", cta: "Refer more" });
  }

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="wl-page">
        {/* ------------------------------------------------ hero + balance */}
        <section className="wl-hero" aria-label="Your wallet">
          <span className="wl-glow" aria-hidden="true" />
          <span className="wl-eyebrow"><WalletIcon /> Your wallet</span>
          <h1 className="wl-hello">
            Welcome back{who ? <>, <span className="wl-name">{who}</span></> : ""}
          </h1>
          <p className="wl-sub">Everything you earn, add and spend on GTAFanbase, calm and in one place.</p>

          <div className="wl-balance">
            <small>Available balance</small>
            <p className="wl-amount" aria-live="polite">
              <Amount mills={w.balanceMills} />
              <em>USD</em>
            </p>
          </div>

          <div className="wl-cta">
            <button type="button" className="wl-btn wl-btn-primary">
              <DepositIcon /> Deposit
            </button>
            <button type="button" className="wl-btn wl-btn-ghost">
              <WithdrawIcon /> Withdraw
            </button>
          </div>
          <p className="wl-soon">
            <ShieldIcon /> <span>Secure payments are opening soon. Your balance and history will be waiting for you here.</span>
          </p>

          <div className="wl-min" role="group" aria-label="Withdrawal minimum">
            <div className="wl-min-top">
              <span><b>Minimum withdrawal: ${MIN_WITHDRAW_USD}.00</b></span>
              <span>{prog.reached ? "You’re eligible" : `${formatMills(prog.remainingMills)} to go`}</span>
            </div>
            <div
              className="wl-bar"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={MIN_WITHDRAW_MILLS / 1000}
              aria-valuenow={Math.min(MIN_WITHDRAW_MILLS, w.balanceMills) / 1000}
              aria-label="Progress toward the withdrawal minimum"
            >
              <i style={{ width: `${Math.max(prog.pct, w.balanceMills > 0 ? 3 : 0)}%` }} />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ where money comes from */}
        <section className="wl-block" aria-labelledby="wl-src">
          <header className="wl-head">
            <h2 id="wl-src">Where your money comes from</h2>
            <p>Lifetime totals: {formatMills(total)} across every source.</p>
          </header>
          <div className="wl-sources">
            {SOURCES.map(({ key, Icon, title, value, note, href, cta }) => (
              <article key={key} className={`wl-src wl-src-${key}`}>
                <span className="wl-src-ic" aria-hidden="true"><Icon /></span>
                <small>{title}</small>
                <b>{value}</b>
                <span className="wl-src-note">{note}</span>
                {href && <Link href={href} className="wl-src-link">{cta} →</Link>}
              </article>
            ))}
          </div>
          <p className="wl-fine">Your gift share lands in your balance the moment a gift is sent. Ad earnings are tracked to your account as they happen and open up with payouts.</p>
        </section>

        {/* ------------------------------------------------ the crowd */}
        {w.crowd.people.length > 0 && (
          <section className="wl-crowd" aria-label="Members on GTAFanbase">
            <div className="wl-stack" aria-hidden="true">
              {w.crowd.people.map((p, i) => (
                <Link key={p.username} href={`/u/${p.username}`} tabIndex={-1} className="wl-stack-i" style={{ zIndex: 10 - i }} title={p.displayName}>
                  <Avatar p={p} size={46} />
                </Link>
              ))}
              {w.crowd.more > 0 && <span className="wl-more">+{n(w.crowd.more)}</span>}
            </div>
            <div className="wl-crowd-text">
              <b>{n(w.crowd.total)} members and creators</b>
              <span>Gifting, earning and showing up for each other. Your favourite creators are already here.</span>
            </div>
            <Link href="/gifts" className="wl-crowd-link">Meet them →</Link>
          </section>
        )}

        {/* ------------------------------------------------ what it's for */}
        <section className="wl-block" aria-labelledby="wl-use">
          <header className="wl-head">
            <h2 id="wl-use">Make your wallet work for you</h2>
            <p>One balance, spent however you like. No card needed at checkout.</p>
          </header>
          <div className="wl-uses">
            <Link href="/gifts" className="wl-use wl-use-gift">
              <span className="wl-use-ic" aria-hidden="true"><GiftIcon /></span>
              <b>Gift your favourite creators</b>
              <span>{giftCount()} collectibles from GTA 1 to GTA VI, from {cheapestGiftText()}. They land on the creator’s profile.</span>
              <em>Open the Gift Shop →</em>
            </Link>
            <Link href="/perks" className="wl-use wl-use-perk">
              <span className="wl-use-ic" aria-hidden="true"><PerkIcon /></span>
              <b>Buy perks in the Perks Shop</b>
              <span>{perkCount()} one-time perks from {cheapestPerkText()}: pinned comments, neon glow, gradient names. Pay once, keep forever.</span>
              <em>Browse perks →</em>
            </Link>
            <Link href="/gifts" className="wl-use wl-use-seen">
              <span className="wl-use-ic" aria-hidden="true"><HeartIcon /></span>
              <b>Be the one they remember</b>
              <span>A gift on a post or comment shows publicly under your name, so the creator and the whole crowd see who showed up. Creators keep {CREATOR_SHARE_PCT}% of every gift.</span>
              <em>Send a gift →</em>
            </Link>
          </div>
        </section>

        {/* ------------------------------------------------ activity */}
        <section className="wl-block" aria-labelledby="wl-log">
          <header className="wl-head">
            <h2 id="wl-log">Activity</h2>
            <p>Your deposits, withdrawal requests and everything else that moves your balance.</p>
          </header>
          <div className="wl-log">
            <input type="radio" name="wl-tab" id="wl-t-all" defaultChecked className="wl-tab-in" />
            <input type="radio" name="wl-tab" id="wl-t-dep" className="wl-tab-in" />
            <input type="radio" name="wl-tab" id="wl-t-wd" className="wl-tab-in" />
            <div className="wl-tabs" role="presentation">
              <label htmlFor="wl-t-all">All</label>
              <label htmlFor="wl-t-dep">Deposits</label>
              <label htmlFor="wl-t-wd">Withdrawals</label>
            </div>
            <div className="wl-pane wl-pane-all">
              <Log rows={w.log} empty="Nothing here yet. Your deposits, withdrawal requests and gifts will appear here as they happen." />
            </div>
            <div className="wl-pane wl-pane-dep">
              <Log rows={deposits} empty="No deposits yet. Your first deposit will show up here." />
            </div>
            <div className="wl-pane wl-pane-wd">
              <Log rows={withdrawals} empty={`No withdrawal requests yet. You can request one once your balance reaches $${MIN_WITHDRAW_USD}.00.`} />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------ how it works */}
        <section className="wl-block" aria-labelledby="wl-how">
          <header className="wl-head">
            <h2 id="wl-how">Good to know</h2>
          </header>
          <ul className="wl-know">
            <li>
              <span className="wl-know-ic" aria-hidden="true"><ClockIcon /></span>
              <span><b>Withdrawals start at ${MIN_WITHDRAW_USD}.00.</b> Once your balance reaches it you can send a withdrawal request, and it will show in your activity.</span>
            </li>
            <li>
              <span className="wl-know-ic" aria-hidden="true"><ShieldIcon /></span>
              <span><b>Your balance is private.</b> Only you can see this page. Gifts you send are public, your balance never is.</span>
            </li>
            <li>
              <span className="wl-know-ic" aria-hidden="true"><SparkIcon /></span>
              <span><b>Gift fees are shown upfront.</b> Every gift shows its price plus a fixed $0.10 and 5% tax before you confirm.</span>
            </li>
          </ul>
        </section>
      </main>
      <ScrollTopButton />
    </>
  );
}
