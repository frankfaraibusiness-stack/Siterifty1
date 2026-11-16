"use client";

import { useState } from "react";
import { LIMIT_GROUPS, PLANS, formatPrice, isPlanId } from "@/lib/plans";

// "Every limit, side by side".
//  - Desktop (900px and wider): the full comparison table, header row sticks under the site header.
//  - Phones and tablets: a sticky plan switcher (Drifter / Wheelman / Mastermind / Kingpin) and one
//    big readable list for the chosen plan. No sideways scrolling, no tiny text.
// Both read from LIMIT_GROUPS in lib/plans.js, so editing the numbers there updates both views.

function Yes() {
  return (
    <>
      <svg className="up-yes" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
      <span className="up-sr">Included</span>
    </>
  );
}

function No() {
  return (
    <>
      <span className="up-no" aria-hidden="true">–</span>
      <span className="up-sr">Not included</span>
    </>
  );
}

function Cell({ value }) {
  if (value === true) return <Yes />;
  if (value === false) return <No />;
  return value;
}

export default function PlanCompare({ currentPlan }) {
  const [sel, setSel] = useState(isPlanId(currentPlan) ? currentPlan : "wheelman");
  const idx = Math.max(0, PLANS.findIndex((p) => p.id === sel));
  const plan = PLANS[idx];

  return (
    <>
      {/* ---------- phones and tablets ---------- */}
      <div className="pc-mobile">
        <div className="pc-tabs" role="tablist" aria-label="Choose a plan to see its limits">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`pc-tab-${p.id}`}
              aria-selected={sel === p.id}
              aria-controls="pc-panel"
              className={`pc-tab${sel === p.id ? " on" : ""}`}
              style={{ "--a": p.a, "--b": p.b }}
              onClick={() => setSel(p.id)}
            >
              <span className="pc-tab-name">{p.short}</span>
              <span className="pc-tab-price">{p.price === 0 ? "Free" : `${formatPrice(p.price)}/mo`}</span>
            </button>
          ))}
        </div>

        <div
          key={plan.id}
          id="pc-panel"
          role="tabpanel"
          aria-labelledby={`pc-tab-${plan.id}`}
          className="pc-panel"
          style={{ "--a": plan.a, "--b": plan.b }}
        >
          <p className="pc-plan">
            <span className="pc-dot" aria-hidden="true" />
            {plan.name}
            {currentPlan === plan.id && <span className="pc-you">Your plan</span>}
          </p>

          {LIMIT_GROUPS.map((group) => (
            <section className="pc-group" key={group.title}>
              <h3>{group.title}</h3>
              <dl>
                {group.rows.map(([label, values, opts]) => (
                  <div className="pc-row" key={label}>
                    <dt>
                      {label}
                      {opts?.soon && <em className="up-soon">Soon</em>}
                    </dt>
                    <dd>
                      <Cell value={values[idx]} />
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>

      {/* ---------- desktop ---------- */}
      <div className="up-table-wrap pc-desktop" role="region" aria-label="Plan comparison table">
        <table className="up-table">
          <thead>
            <tr>
              <th scope="col" className="up-th-first">
                <span className="up-sr">Feature</span>
              </th>
              {PLANS.map((p) => (
                <th
                  key={p.id}
                  scope="col"
                  className={currentPlan === p.id ? "is-current" : undefined}
                  style={{ "--a": p.a, "--b": p.b }}
                >
                  <span className="up-th-name">{p.short}</span>
                  <span className="up-th-price">{p.price === 0 ? "Free" : `${formatPrice(p.price)}/mo`}</span>
                </th>
              ))}
            </tr>
          </thead>
          {LIMIT_GROUPS.map((group) => (
            <tbody key={group.title}>
              <tr className="up-group">
                <th scope="colgroup" colSpan={PLANS.length + 1}>
                  <span>{group.title}</span>
                </th>
              </tr>
              {group.rows.map(([label, values, opts]) => (
                <tr key={label}>
                  <th scope="row">
                    {label}
                    {opts?.soon && <em className="up-soon">Soon</em>}
                  </th>
                  {values.map((value, i) => (
                    <td key={PLANS[i].id} className={currentPlan === PLANS[i].id ? "is-current" : undefined}>
                      <Cell value={value} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </>
  );
}
