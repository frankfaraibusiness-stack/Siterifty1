// Who can join, at a glance. Presentational only (no hooks) so cards (server) and the
// live preview (client) share it. `countries` comes from the community document itself,
// so showing it costs no extra reads.
//   []            -> "Worldwide"
//   ["ZA", ...]   -> "Restricted" + up to 5 flags + "+N" for the rest
import Flag from "@/components/Flag";
import { SHOWN_FLAGS } from "@/lib/community-schema";
import { countryName } from "@/lib/flag";

function Globe() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3c2.6 2.6 3.9 5.6 3.9 9s-1.3 6.400-3.900 9c-2.600-2.600-3.900-5.600-3.900-9S9.400 5.600 12 3z" />
    </svg>
  );
}

export default function CommunityReach({ countries = [], className = "" }) {
  const list = Array.isArray(countries) ? countries : [];
  if (list.length === 0) {
    return <span className={`gc-reach worldwide ${className}`.trim()} title="Open to members from anywhere"><Globe /><span>Worldwide</span></span>;
  }
  const shown = list.slice(0, SHOWN_FLAGS);
  const extra = list.length - shown.length;
  const names = list.map(countryName).join(", ");
  return (
    <span className={`gc-reach restricted ${className}`.trim()} title={`Only members from: ${names}`} aria-label={`Restricted to ${names}`}>
      <span className="gc-reach-label">Restricted</span>
      <span className="gc-reach-flags">{shown.map((code) => <Flag key={code} country={code} className="flg-inline" />)}</span>
      {extra > 0 && <em className="gc-reach-more">+{extra}</em>}
    </span>
  );
}
