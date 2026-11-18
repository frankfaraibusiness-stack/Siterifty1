"use client";

import { useState } from "react";
import { ADS_FREE_WHILE_TESTING, AD_RATES, BUDGET, clampBudgetCents, num, quote, usd } from "@/lib/ads";

// Budget slider + typed amount + quick chips + the full price breakdown.
// Used when launching an ad and when adding funds to one.
const CHIPS = [1000, 2500, 5000, 10000, 25000];

export default function BudgetPicker({ type, cents, onChange }) {
  const [text, setText] = useState(String(cents / 100));
  const q = quote(type, cents);
  const rate = AD_RATES[type];
  const sliderVal = Math.min(cents, BUDGET.sliderMaxCents);
  const pct = ((sliderVal - BUDGET.minCents) / (BUDGET.sliderMaxCents - BUDGET.minCents)) * 100;

  const set = (c) => { const v = clampBudgetCents(c); onChange(v); setText(String(v / 100)); };

  return (
    <div className="am-budget">
      <div className="am-amount">
        <span className="am-amount-cur">$</span>
        <input
          className="am-amount-in"
          inputMode="decimal"
          aria-label="Ad budget in US dollars"
          value={text}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            setText(raw);
            const n = parseFloat(raw);
            if (Number.isFinite(n)) onChange(clampBudgetCents(Math.round(n * 100)));
          }}
          onBlur={() => setText(String(cents / 100))}
        />
        <span className="am-amount-sub">budget</span>
      </div>

      <input
        type="range"
        className="am-slider"
        aria-label="Budget slider"
        min={BUDGET.minCents}
        max={BUDGET.sliderMaxCents}
        step={BUDGET.stepCents}
        value={sliderVal}
        style={{ "--pct": `${pct}%` }}
        onChange={(e) => set(Number(e.target.value))}
      />
      <div className="am-slider-scale"><span>{usd(BUDGET.minCents)}</span><span>{usd(BUDGET.sliderMaxCents / 2)}</span><span>{usd(BUDGET.sliderMaxCents)}+</span></div>

      <div className="am-chips" role="group" aria-label="Quick amounts">
        {CHIPS.map((c) => (
          <button key={c} type="button" className={`am-chip${cents === c ? " on" : ""}`} onClick={() => set(c)}>{usd(c).replace(".00", "")}</button>
        ))}
      </div>

      <div className="am-reach">
        <b>{num(q.views)}</b>
        <span>views for your {type} ad<br /><small>at {usd(rate.cpmCents)} per 1,000 views</small></span>
      </div>

      <dl className="am-sum">
        <div><dt>Ad budget</dt><dd>{usd(q.budgetCents)}</dd></div>
        <div><dt>{q.extraLabel} <small>({usd(q.fixedCents)} + {q.pct}%)</small></dt><dd>{usd(q.extraCents)}</dd></div>
        <div className="total"><dt>Total today</dt><dd>{usd(q.totalCents)}</dd></div>
      </dl>
      <p className="am-fine">
        One-time payment. No subscription, no auto-renewal. You only use up your budget as views are delivered, and your ad stops by itself when it runs out.
        {ADS_FREE_WHILE_TESTING && " Test mode is on: nothing is charged yet."}
      </p>
    </div>
  );
}
