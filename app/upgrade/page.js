import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import UpgradePlans from "@/components/UpgradePlans";
import Discover from "@/components/Discover";
import PlanCompare from "@/components/PlanCompare";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan } from "@/lib/user-plan";
import { renderRich } from "@/components/info/rich";
import { FAQ, FREE_WHILE_TESTING, PRICING_POINTS } from "@/lib/plans";
import { shareMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = shareMeta({
  title: "Upgrade · GTAFanbase",
  description:
    "Pick your role in Leonida. Compare Boardwalk Drifter, Getaway Wheelman, Heist Mastermind, Vice Kingpin and Creator Plus.",
  path: "/upgrade",
});

// Skyline blocks behind the sun: [x, width, height]
const SKYLINE = [
  [30, 34, 34], [70, 26, 58], [102, 40, 40], [148, 24, 78], [178, 36, 50],
  [220, 30, 30], [256, 22, 64], [284, 38, 44], [330, 28, 26], [364, 24, 52],
  [816, 28, 40], [850, 36, 66], [892, 24, 34], [922, 30, 82], [958, 40, 48],
  [1004, 26, 60], [1036, 34, 36], [1076, 22, 70], [1104, 38, 44], [1148, 28, 30],
];

function Hero() {
  return (
    <section className="up-hero">
      <svg
        className="up-hero-art"
        viewBox="0 0 1200 300"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="upSun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd36b" />
            <stop offset=".55" stopColor="#ff7a59" />
            <stop offset="1" stopColor="#ff3d7f" />
          </linearGradient>
          <mask id="upSunMask">
            <rect width="1200" height="300" fill="#fff" />
            <rect y="176" width="1200" height="3" fill="#000" />
            <rect y="192" width="1200" height="5" fill="#000" />
            <rect y="209" width="1200" height="7" fill="#000" />
            <rect y="227" width="1200" height="9" fill="#000" />
          </mask>
          <g id="upPalm">
            <path d="M0 0C5-42 3-84-8-128" fill="none" stroke="#120f1c" strokeWidth="6" strokeLinecap="round" />
            <g fill="#120f1c" transform="translate(-8 -128)">
              <path d="M0 0C-26-24-62-22-92 4 -58-8-28-10 0 0z" />
              <path d="M0 0C26-26 62-24 92 2 58-8 28-10 0 0z" />
              <path d="M0 0C-18-34-44-52-78-52 -50-40-26-22 0 0z" />
              <path d="M0 0C18-34 44-52 78-52 50-40 26-22 0 0z" />
              <path d="M0 0C-4-30-2-56 6-80 8-52 6-26 0 0z" />
            </g>
          </g>
        </defs>

        <circle cx="600" cy="214" r="132" fill="url(#upSun)" mask="url(#upSunMask)" />
        <g fill="#2a1646" opacity=".9">
          {SKYLINE.map(([x, w, h]) => (
            <rect key={x} x={x} y={252 - h} width={w} height={h + 4} />
          ))}
        </g>
        <use href="#upPalm" x="92" y="262" />
        <use href="#upPalm" x="1118" y="262" transform="translate(2236 0) scale(-1 1)" />
        <rect y="252" width="1200" height="48" fill="#120f1c" />
      </svg>

      <div className="up-hero-copy">
        <h1 className="up-title">Pick your role in Leonida</h1>
        <p className="up-sub">
          Four ways to play the fanbase, from a free walk on the boardwalk to running the whole city.
        </p>
        {FREE_WHILE_TESTING && (
          <p className="up-testchip">Every plan is free while we test</p>
        )}
      </div>
    </section>
  );
}

export default async function UpgradePage() {
  const user = await getCurrentUser();
  const plan = user ? await getUserPlan(user.uid) : null;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="up-page">
        <Link href={user?.username ? `/u/${user.username}` : "/"} className="up-back">
          ← {user?.username ? "Back to your profile" : "Back to the feed"}
        </Link>

        <Hero />

        <UpgradePlans user={user ? { uid: user.uid, username: user.username } : null} currentPlan={plan || "drifter"} />

        <section className="up-section" aria-labelledby="up-pricing">
          <h2 id="up-pricing" className="up-h2">How pricing works</h2>
          <div className="up-points">
            {PRICING_POINTS.map((p) => (
              <div key={p.title} className="up-point">
                <h3>{p.title}</h3>
                <p>{renderRich(p.body)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="up-section" aria-labelledby="up-compare">
          <h2 id="up-compare" className="up-h2">Every limit, side by side</h2>
          <p className="up-h2-sub">
            What each plan can do. Features marked Soon are on their way.
          </p>
          <PlanCompare currentPlan={plan} />
        </section>

        <section className="up-section up-faq" aria-labelledby="up-faq">
          <h2 id="up-faq" className="up-h2">Questions and answers</h2>
          <div className="up-faq-list">
            {FAQ.map((item) => (
              <details key={item.q} className="up-q">
                <summary>
                  <span>{item.q}</span>
                  <span className="up-q-plus" aria-hidden="true" />
                </summary>
                <p>{renderRich(item.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <Discover spot="upgrade" variant="tiles" className="dc-foot" title="More from GTAFanbase" />
      </main>
      <ScrollTopButton />
    </>
  );
}
