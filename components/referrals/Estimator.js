"use client";

import { useState } from "react";
import { REFERRAL_BONUS_MILLS, REFERRAL_XP_TARGET, formatUsd } from "@/lib/referrals";

const PRESETS = [10, 100, 500, 1000, 5000];

// "What could my audience be worth?" A plain multiplication, shown honestly as an illustration.
export default function Estimator() {
  const [count, setCount] = useState(500);
  const total = count * REFERRAL_BONUS_MILLS;
  const set = (v) => setCount(Math.max(1, Math.min(10000, Math.round(Number(v) || 1))));

  return (
    <div className="rf-est">
      <div className="rf-est-out" aria-live="polite">
        <span className="rf-est-label">Your payout</span>
        <b className="rf-est-amount">{formatUsd(total)}</b>
        <span className="rf-est-math">
          {count.toLocaleString("en-US")} referrals who reach {REFERRAL_XP_TARGET.toLocaleString("en-US")} XP × {formatUsd(REFERRAL_BONUS_MILLS)}, paid once each
        </span>
      </div>

      <div className="rf-est-ctl">
        <label htmlFor="rf-est-range">People you refer who reach {REFERRAL_XP_TARGET.toLocaleString("en-US")} XP</label>
        <input
          id="rf-est-range"
          type="range"
          min={1}
          max={10000}
          step={1}
          value={count}
          onChange={(e) => set(e.target.value)}
          style={{ "--fill": `${((count - 1) / 9999) * 100}%` }}
        />
        <div className="rf-est-presets" role="group" aria-label="Quick amounts">
          {PRESETS.map((p) => (
            <button key={p} type="button" className={count === p ? "is-on" : ""} onClick={() => set(p)} aria-pressed={count === p}>
              {p.toLocaleString("en-US")}
            </button>
          ))}
        </div>
      </div>
      <p className="rf-fine">An illustration, not a promise: you earn when the people you refer actually reach the XP.</p>
    </div>
  );
}
