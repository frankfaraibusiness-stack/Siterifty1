"use client";

import Link from "next/link";
import { Block } from "./bits";
import { useSettings } from "./context";
import PlanBadges from "../PlanBadges";
import { getPlan, planRank } from "@/lib/plans";
import { PERKS } from "@/lib/perks";

// Your plan and the perks you own. Buying and switching happen on /upgrade and
// /perks, so this panel only shows where you stand and links there.
export default function MembershipPanel() {
  const { me } = useSettings();
  const plan = getPlan(me.plan);
  const paid = planRank(me.plan) > 0;
  const owned = PERKS.filter((p) => (me.perks || []).includes(p.id));

  return (
    <>
      <Block title="Your plan">
        <div className="st-plan" style={{ "--pa": plan.a, "--pb": plan.b }}>
          <p className="st-plan-name">
            {plan.name}
            <PlanBadges plan={me.plan} />
          </p>
          <p className="st-plan-tag">{plan.tagline}</p>
        </div>
        <ul className="st-checks">
          {plan.highlights.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
        <div className="st-actions">
          <Link href="/upgrade" className="st-btn primary">
            {paid ? "Compare plans" : "See upgrade plans"}
          </Link>
        </div>
      </Block>

      <Block
        title="Your perks"
        hint="Perks are one-time purchases. Buy once and keep them for good."
      >
        {owned.length > 0 ? (
          <ul className="st-checks">
            {owned.map((p) => (
              <li key={p.id}>
                <b>{p.name}</b> <small>{p.summary}</small>
              </li>
            ))}
          </ul>
        ) : (
          <p className="st-hint">You don’t own any perks yet.</p>
        )}
        <div className="st-actions">
          <Link href="/perks" className="st-btn ghost">
            Browse the Perks Shop
          </Link>
        </div>
      </Block>
    </>
  );
}
