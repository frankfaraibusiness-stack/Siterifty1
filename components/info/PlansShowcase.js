import Link from "next/link";
import PlanBadges from "@/components/PlanBadges";
import TierMark from "@/components/TierMark";
import Money from "@/components/Money";
import PriceNote from "@/components/PriceNote";
import { FREE_WHILE_TESTING, PLANS } from "@/lib/plans";

function Tick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

// Read-only plan cards for the public pages. Names, prices, taglines and
// benefits all come from lib/plans.js, so there is nothing to keep in sync.
export default function PlansShowcase() {
  return (
    <>
    <div className="up-plans ip-plans">
      {PLANS.map((plan) => (
        <article
          key={plan.id}
          className={`up-card up-card-${plan.id}`}
          style={{ "--a": plan.a, "--b": plan.b }}
        >
          <div className="up-card-top">
            <span className="up-mark">
              <TierMark id={plan.id} />
            </span>
            {plan.everything && <span className="up-chip up-chip-all">Everything unlocked</span>}
          </div>
          <h3 className="up-name">
            {plan.name}
            <PlanBadges plan={plan.id} />
          </h3>
          <p className="up-tagline">{plan.tagline}</p>
          <div className="up-price">
            <span className="up-amount"><Money usd={plan.price} /></span>
            <span className="up-per">{plan.price === 0 ? "free forever" : "per month"}</span>
          </div>
          <p className="up-testnote">
            {FREE_WHILE_TESTING && plan.price > 0 ? (
              <>
                <Money usd={0} /> today while we test
              </>
            ) : (
              "\u00a0"
            )}
          </p>
          <Link href="/upgrade" prefetch={false} className="up-cta ip-plan-cta">
            {plan.price === 0 ? "Join free" : `See ${plan.short}`}
          </Link>
          <p className="up-lead">{plan.lead}</p>
          <ul className="up-list">
            {plan.highlights.map((h) => {
              const text = typeof h === "string" ? h : h.text;
              const soon = typeof h !== "string" && h.soon;
              return (
                <li key={text}>
                  <span className="up-tick">
                    <Tick />
                  </span>
                  <span>
                    {text}
                    {soon && <em className="up-soon">Soon</em>}
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      ))}
    </div>
    <PriceNote />
    </>
  );
}
