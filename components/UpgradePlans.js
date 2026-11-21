"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import PlanBadges from "./PlanBadges";
import TierMark from "./TierMark";
import MemberLogoBadge from "./MemberLogoBadge";
import Money from "./Money";
import PriceNote from "./PriceNote";
import { FREE_WHILE_TESTING, MEMBER_LOGO, PLANS, hasMemberLogo } from "@/lib/plans";
import Toast, { useToast } from "./Toast";

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
  const { toast, show, hide } = useToast();
  const [authOpen, setAuthOpen] = useState(false);

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
      show(`You’re now a ${plan.name}.`, "success");
      router.refresh();
    } catch (err) {
      show(err.message || "Couldn’t change your plan.", "error");
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
              className={`up-card up-card-${plan.id}${plan.wide ? " up-card-wide" : ""}${isCurrent ? " is-current" : ""}`}
              style={{ "--a": plan.a, "--b": plan.b }}
            >
              {(() => {
                const head = (
                  <>
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

                  </>
                );
                const body = (
                  <>
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
                  </>
                );
                return plan.wide ? (
                  <>
                    <div className="up-wide-head">{head}</div>
                    <div className="up-wide-body">{body}</div>
                  </>
                ) : (
                  <>
                    {head}
                    {body}
                  </>
                );
              })()}
            </article>
          );
        })}
      </section>
      <PriceNote />

      <Toast toast={toast} onClose={hide} />
      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
    </>
  );
}
