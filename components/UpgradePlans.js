"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import PlanBadges from "./PlanBadges";
import MemberLogoBadge from "./MemberLogoBadge";
import Money from "./Money";
import PriceNote from "./PriceNote";
import { FREE_WHILE_TESTING, MEMBER_LOGO, PLANS, hasMemberLogo } from "@/lib/plans";

// One distinct mark per plan so the cards read differently at a glance.
function TierMark({ id }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
  };
  if (id === "drifter") {
    // palm tree
    return (
      <svg {...common}>
        <path d="M12 21V11" />
        <path d="M12 11c-1-3-4-4.5-7-4 2 .2 3.8 1.2 5 3" />
        <path d="M12 11c1-3 4-4.5 7-4-2 .2-3.8 1.2-5 3" />
        <path d="M12 11c-3-.5-5.5.8-7 3.2 2.2-1.3 4.5-1.6 7-.7" />
        <path d="M12 11c3-.5 5.5.8 7 3.2-2.2-1.3-4.5-1.6-7-.7" />
        <path d="M8 21h8" />
      </svg>
    );
  }
  if (id === "wheelman") {
    // steering wheel
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="2.2" />
        <path d="M12 14.2V21M9.9 11.2 3.4 9.6M14.1 11.2l6.5-1.6" />
      </svg>
    );
  }
  if (id === "mastermind") {
    // crosshair / blueprint target
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="7.5" />
        <circle cx="12" cy="12" r="2.5" />
        <path d="M12 2v4.5M12 17.5V22M2 12h4.5M17.5 12H22" />
      </svg>
    );
  }
  // crown
  return (
    <svg {...common}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" />
      <path d="M5.5 22h13" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function UpgradePlans({ user, currentPlan }) {
  const router = useRouter();
  const [current, setCurrent] = useState(currentPlan);
  const [busy, setBusy] = useState("");
  const [toast, setToast] = useState("");
  const [authOpen, setAuthOpen] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const currentTier = PLANS.findIndex((p) => p.id === current);

  async function choose(plan) {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (busy || plan.id === current) return;
    setBusy(plan.id);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: plan.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn’t change your plan.");
      setCurrent(data.plan);
      setToast(`You’re now a ${plan.name}.`);
      router.refresh();
    } catch (err) {
      setToast(err.message || "Couldn’t change your plan.");
    } finally {
      setBusy("");
    }
  }

  function label(plan, index) {
    if (busy === plan.id) return "Switching…";
    if (user && plan.id === current) return "Your current plan";
    if (!user) return plan.price === 0 ? "Join free" : `Get ${plan.short}`;
    if (plan.price === 0) return `Switch to ${plan.short}`;
    return index > currentTier ? `Upgrade to ${plan.short}` : `Switch to ${plan.short}`;
  }

  return (
    <>
      <section className="up-plans" aria-label="Plans">
        {PLANS.map((plan, index) => {
          const isCurrent = !!user && plan.id === current;
          return (
            <article
              key={plan.id}
              className={`up-card up-card-${plan.id}${isCurrent ? " is-current" : ""}`}
              style={{ "--a": plan.a, "--b": plan.b }}
            >
              <div className="up-card-top">
                <span className="up-mark">
                  <TierMark id={plan.id} />
                </span>
                {isCurrent ? (
                  <span className="up-chip">Your plan</span>
                ) : plan.everything ? (
                  <span className="up-chip up-chip-all">Everything unlocked</span>
                ) : null}
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

              <button
                type="button"
                className="up-cta"
                onClick={() => choose(plan)}
                disabled={isCurrent || !!busy}
                aria-busy={busy === plan.id}
              >
                {label(plan, index)}
              </button>

              {hasMemberLogo(plan.id) && (
                <div className="up-logo-perk">
                  <MemberLogoBadge plan={plan.id} className="mlb-card" />
                  <p>
                    <strong>{MEMBER_LOGO.title}</strong>
                    <span>{MEMBER_LOGO.note}</span>
                  </p>
                </div>
              )}

              <p className="up-lead">{plan.lead}</p>
              <ul className="up-list">
                {plan.highlights.map((h) => {
                  const text = typeof h === "string" ? h : h.text;
                  const soon = typeof h !== "string" && h.soon;
                  return (
                    <li key={text}>
                      <span className="up-tick">
                        <CheckIcon />
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
          );
        })}
      </section>
      <PriceNote />

      {toast && (
        <div className="pf-toast" role="status">
          {toast}
        </div>
      )}
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
