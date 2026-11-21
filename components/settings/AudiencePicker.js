"use client";

import { LockIcon } from "./icons";
import { Upsell } from "./bits";
import { INFO_AUDIENCES, LOCKED_INFO_AUDIENCE } from "@/lib/profile-privacy";

// Who can see one thing on your profile (gender or country). Same look as "Who can message you";
// "No one" is a paid-plan choice (also checked on the server).
export default function AudiencePicker({ label, value, onChange, paid, upsell = true }) {
  return (
    <>
      <div className="st-aud" role="radiogroup" aria-label={label}>
        {INFO_AUDIENCES.map((a) => {
          const on = value === a.id;
          const locked = !paid && a.id === LOCKED_INFO_AUDIENCE && !on;
          return (
            <button
              key={a.id}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={locked}
              className={`${on ? "on" : ""}${locked ? " locked" : ""}`.trim()}
              onClick={() => onChange(a.id)}
            >
              <i aria-hidden="true" />
              <span>
                <b>
                  {a.label}
                  {locked && (
                    <em className="st-paid">
                      <LockIcon /> Paid
                    </em>
                  )}
                </b>
                <small>{a.hint}</small>
              </span>
            </button>
          );
        })}
      </div>
      {!paid && upsell && <Upsell>“No one” is part of every paid plan.</Upsell>}
    </>
  );
}
