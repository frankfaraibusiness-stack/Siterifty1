"use client";

import { CHARACTERS, CHARACTER_IDS } from "@/lib/characters";

// Two big cards: Lucia (female) and Jason (male). One must be chosen to create an account.
// Used by the sign-up form and by the "one last thing" step after Google sign-in.
export default function CharacterPicker({ value, onChange, disabled = false, tabbable = true }) {
  return (
    <div className="chp" role="radiogroup" aria-label="Choose your character" aria-required="true">
      {CHARACTER_IDS.map((id) => {
        const c = CHARACTERS[id];
        const on = value === id;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`chp-card chp-${id}${on ? " is-on" : ""}`}
            onClick={() => onChange(id)}
            disabled={disabled}
            tabIndex={tabbable ? 0 : -1}
          >
            <span className="chp-art">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} alt="" width="160" height="160" decoding="async" draggable="false" />
              <span className="chp-tick" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
              </span>
            </span>
            <span className="chp-name">{c.name}</span>
            <span className="chp-gender">{c.label}</span>
          </button>
        );
      })}
    </div>
  );
}
