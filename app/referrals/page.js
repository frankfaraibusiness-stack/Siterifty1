import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import LinkPanel from "@/components/referrals/LinkPanel";
import Dashboard from "@/components/referrals/Dashboard";
import Estimator from "@/components/referrals/Estimator";
import { getCurrentUser } from "@/lib/current-user";
import { getReferralDashboard } from "@/lib/referrals-data";
import { REFERRAL_BONUS_MILLS, REFERRAL_XP_TARGET, formatUsd } from "@/lib/referrals";
import { COMBO_MAX, DAILY_XP_CAP, RANKS, STREAK_BONUS, STREAK_BONUS_MAX, STREAK_CLIPS, XP } from "@/lib/videos-config";
import { shareMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

const TARGET = REFERRAL_XP_TARGET.toLocaleString("en-US");
const BONUS = formatUsd(REFERRAL_BONUS_MILLS);

export const metadata = shareMeta({
  title: "Refer & Earn · GTAFanbase",
  description: `Share your personal link. The first time someone you refer reaches ${TARGET} XP watching reels, ${BONUS} goes straight to your wallet balance. One time per person, no limit on referrals.`,
  path: "/referrals",
});

const STEPS = [
  {
    title: "Share your link",
    text: "Put your personal link in your bio, video descriptions, stream panels or Discord. It’s unique to you and always points to this site.",
  },
  {
    title: "They join",
    text: "Everyone who creates an account through your link counts as +1 on your dashboard the moment they sign up.",
  },
  {
    title: "They watch, you get paid",
    text: `As they watch reels they earn XP. When a referral reaches ${TARGET} XP, ${BONUS} lands in your wallet balance.`,
  },
];

const EARN = [
  { label: "Comment on a clip", xp: XP.comment },
  { label: "Find a Hidden Package", xp: XP.package },
  { label: "Finish a clip", xp: XP.watch, note: `× combo, up to ×${COMBO_MAX}` },
  { label: "Share a clip", xp: XP.share },
  { label: "Give a clip heat (like)", xp: XP.like },
  { label: "Save a clip", xp: XP.save },
].sort((a, b) => b.xp - a.xp);

const FAQ = [
  {
    q: "When exactly do I get paid?",
    a: `The moment someone you referred reaches ${TARGET} XP in total. It’s credited to your wallet balance automatically, with no claim button and nothing to request.`,
  },
  {
    q: "Is it recurring?",
    a: `No. You earn ${BONUS} once per person, for their first ${TARGET} XP. XP they earn after that doesn’t pay again, and there is no limit on how many people you can refer.`,
  },
  {
    q: "What counts as a referral?",
    a: "A brand-new account created in the same browser within 30 days of opening your link. If someone opens several creators’ links, the first one wins. People who already have an account don’t count.",
  },
  {
    q: "Where does the money go?",
    a: "Straight into your wallet balance. You can spend it on gifts and other in-app purchases, or withdraw it.",
  },
  {
    q: "How is XP verified?",
    a: "Every point of XP is awarded by our server after it checks the clip was actually watched. Nothing the browser sends can raise it, and the payout is decided server-side too.",
  },
  {
    q: "Can I refer myself or make extra accounts?",
    a: "No. Self-referrals and fake or duplicate accounts aren’t allowed, and we can void and remove them without payment. The XP requirement and daily XP cap exist so payouts reflect real people who actually use the site.",
  },
];

// Where the payout sits on the rank ladder: just before the first rank that needs more XP than the target.
function ladder() {
  const rows = [];
  let placed = false;
  for (const r of RANKS) {
    if (!placed && r.xp > REFERRAL_XP_TARGET) {
      rows.push({ marker: true });
      placed = true;
    }
    rows.push(r);
  }
  if (!placed) rows.push({ marker: true });
  return rows;
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

export default async function ReferralsPage() {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  let dash = null;
  if (signedIn) {
    try {
      dash = await getReferralDashboard(user);
    } catch (err) {
      console.error("[referrals] page", err);
    }
  }

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="rf">
        <Link href={signedIn ? `/u/${user.username}` : "/"} className="up-back">
          ← {signedIn ? "Back to your profile" : "Back to the feed"}
        </Link>

        {/* ---------------------------------------------------------------- hero */}
        <section className="rf-hero" aria-labelledby="rf-title">
          <span className="rf-hero-glow" aria-hidden="true" />
          <div className="rf-hero-copy">
            <span className="rf-eyebrow">Creator referral programme</span>
            <h1 id="rf-title" className="rf-title">
              Bring your audience. Get paid when they level&nbsp;up.
            </h1>
            <p className="rf-sub">
              Share one personal link. The first time each person you refer reaches {TARGET} XP watching reels, {BONUS} goes
              straight to your wallet balance. One time per person, with no cap on how many you bring in.
            </p>
            <LinkPanel signedIn={signedIn} code={dash?.code || ""} />
          </div>

          <aside className="rf-receipt" aria-label="Example of a referral payout">
            <span className="rf-receipt-tag">Example</span>
            <div className="rf-receipt-who">
              <span className="rf-receipt-av" aria-hidden="true">N</span>
              <div>
                <b>@new.fan</b>
                <small>joined with your link</small>
              </div>
            </div>
            <div className="rf-receipt-xp">
              <div className="rf-receipt-xp-top">
                <span>Reel XP</span>
                <b>
                  {TARGET} / {TARGET}
                </b>
              </div>
              <div className="rf-bar is-full rf-bar-lg" aria-hidden="true">
                <i />
              </div>
            </div>
            <div className="rf-receipt-line">
              <span>Referral bonus</span>
              <b className="rf-receipt-plus">+{BONUS}</b>
            </div>
            <div className="rf-receipt-line is-total">
              <span>Added to your wallet</span>
              <b>{BONUS}</b>
            </div>
          </aside>
        </section>

        {signedIn && <Dashboard initial={dash} />}

        {/* ------------------------------------------------------------ how it works */}
        <section className="rf-section" aria-labelledby="rf-how">
          <div className="rf-head">
            <h2 id="rf-how">How it works</h2>
            <p>Three steps, and the middle one is entirely theirs.</p>
          </div>
          <ol className="rf-steps">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rf-step">
                <span className="rf-step-n" aria-hidden="true">{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ------------------------------------------------------------ the payout */}
        <section className="rf-pay" aria-labelledby="rf-pay-h">
          <div className="rf-pay-main">
            <span className="rf-eyebrow rf-eyebrow-gold">The payout</span>
            <h2 id="rf-pay-h" className="rf-pay-title">
              <span className="rf-pay-amount">{BONUS}</span> for every referral who reaches {TARGET} XP
            </h2>
            <p>
              It’s paid once per person, for their first {TARGET} XP, and goes straight to your wallet balance. Spend it on gifts and
              other in-app purchases, or withdraw it.
            </p>
          </div>
          <ul className="rf-pay-list">
            <li><Check /> Paid automatically, no claim button</li>
            <li><Check /> One time per referral, not recurring</li>
            <li><Check /> No limit on how many people you refer</li>
            <li><Check /> Decided and verified on our servers</li>
          </ul>
        </section>

        {/* ------------------------------------------------------------ how XP is earned */}
        <section className="rf-section" aria-labelledby="rf-xp">
          <div className="rf-head">
            <h2 id="rf-xp">How your referrals earn XP</h2>
            <p>
              XP comes from watching and taking part in reels on the Videos tab. Here’s exactly what pays, so you can tell your
              audience what to expect.
            </p>
          </div>

          <div className="rf-xp-grid">
            <div className="rf-card rf-xp-card">
              <h3>XP per action</h3>
              <ul className="rf-xp-list">
                {EARN.map((e) => (
                  <li key={e.label}>
                    <span>
                      {e.label}
                      {e.note && <small>{e.note}</small>}
                    </span>
                    <b>+{e.xp} XP</b>
                  </li>
                ))}
              </ul>
              <ul className="rf-xp-extras">
                <li>
                  <b>Daily missions</b> pay bonus XP on top, and aren’t counted in the daily cap.
                </li>
                <li>
                  <b>Daily streak:</b> finish {STREAK_CLIPS} clips in a day to keep it going and earn +{STREAK_BONUS} XP per streak day
                  (up to +{STREAK_BONUS_MAX}).
                </li>
                <li>
                  <b>Daily cap:</b> actions stop paying after {DAILY_XP_CAP} XP a day, so a payout means real, steady watching.
                </li>
              </ul>
            </div>

            <div className="rf-card rf-xp-card">
              <h3>Ranks along the way</h3>
              <ol className="rf-ladder">
                {ladder().map((r) =>
                  r.marker ? (
                    <li key="goal" className="rf-ladder-goal">
                      <span>
                        <b>{TARGET} XP</b> · your {BONUS} unlocks
                      </span>
                    </li>
                  ) : (
                    <li key={r.name}>
                      <span>{r.name}</span>
                      <b>{r.xp.toLocaleString("en-US")} XP</b>
                    </li>
                  )
                )}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ estimator */}
        <section className="rf-section" aria-labelledby="rf-est-h">
          <div className="rf-head">
            <h2 id="rf-est-h">What could your audience be worth?</h2>
            <p>Slide to see the total for the number of referrals who reach {TARGET} XP.</p>
          </div>
          <Estimator />
        </section>

        {/* ------------------------------------------------------------ FAQ */}
        <section className="rf-section" aria-labelledby="rf-faq">
          <div className="rf-head">
            <h2 id="rf-faq">Questions creators ask</h2>
          </div>
          <div className="rf-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
          <p className="rf-fine rf-foot">
            Referral rewards follow our <Link href="/terms">Terms</Link> and <Link href="/guidelines">Community Guidelines</Link>.
            Questions? <Link href="/contact">Contact us</Link>.
          </p>
        </section>
      </main>
      <ScrollTopButton />
    </>
  );
}
