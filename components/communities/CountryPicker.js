"use client";

import { useMemo, useState } from "react";
import { XIcon } from "@/components/icons";
import { countryOptions, isCountryCode } from "@/lib/countries";

// Pick the countries that may join. `value` is an array of two-letter codes. Search, tap to
// add or remove; selected ones sit on top as chips so a long list stays easy to review.
function Pic({ code }) {
  if (!isCountryCode(code)) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="gc-cp-flag" src={`/flags/${code.toLowerCase()}.png`} alt="" width="24" height="18" loading="lazy" decoding="async" draggable="false" />;
}

export default function CountryPicker({ value = [], onChange }) {
  const [q, setQ] = useState("");
  const all = useMemo(() => countryOptions(), []);
  const names = useMemo(() => Object.fromEntries(all.map((o) => [o.value, o.label])), [all]);
  const term = q.trim().toLowerCase();
  const list = term ? all.filter((o) => o.label.toLowerCase().includes(term) || o.value.toLowerCase() === term) : all;
  const toggle = (code) => onChange(value.includes(code) ? value.filter((c) => c !== code) : [...value, code]);

  return (
    <div className="gc-cp">
      {value.length > 0 && (
        <div className="gc-cp-chosen" aria-label="Selected countries">
          {value.map((code) => (
            <button key={code} type="button" className="gc-cp-chip" onClick={() => toggle(code)} aria-label={`Remove ${names[code] || code}`}>
              <Pic code={code} />{names[code] || code}<XIcon />
            </button>
          ))}
          <button type="button" className="gc-link-btn" onClick={() => onChange([])}>Clear all</button>
        </div>
      )}
      <input className="cmp-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search countries…" aria-label="Search countries" />
      <ul className="gc-cp-list" role="listbox" aria-multiselectable="true" aria-label="Countries">
        {list.map((o) => {
          const on = value.includes(o.value);
          return (
            <li key={o.value} role="option" aria-selected={on}>
              <button type="button" className={on ? "on" : ""} onClick={() => toggle(o.value)}>
                <Pic code={o.value} /><span>{o.label}</span><i aria-hidden="true">{on ? "✓" : ""}</i>
              </button>
            </li>
          );
        })}
        {list.length === 0 && <li className="gc-cp-none">No country matches “{q}”.</li>}
      </ul>
      <p className="cmp-hint">{value.length === 0 ? "None picked yet." : `${value.length} ${value.length === 1 ? "country" : "countries"} picked.`}</p>
    </div>
  );
}
