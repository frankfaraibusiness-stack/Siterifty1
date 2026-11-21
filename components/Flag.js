import { countryName, flagEmoji } from "@/lib/flag";
import { isCountryCode } from "@/lib/countries";

// A member's country flag. `country` is the two-letter code saved on their account; anything else
// ("unknown", nothing) renders nothing.
//
// Drawn from a small picture (/public/flags/za.png, about 2 KB, same look on every device) instead of the
// flag emoji, because Windows desktop browsers show emoji flags as plain letters ("ZA"). A code with no
// picture falls back to the emoji. Named for screen readers and the hover tooltip.
export default function Flag({ country, className = "" }) {
  const emoji = flagEmoji(country);
  if (!emoji) return null;
  const name = countryName(country);
  const cls = `flg ${className}`.trim();
  if (!isCountryCode(country)) {
    return (
      <span className={cls} role="img" aria-label={name} title={name}>
        {emoji}
      </span>
    );
  }
  return (
    <span className={`${cls} flg-img`} title={name}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/flags/${country.toLowerCase()}.png`} alt={name} width="64" height="48" decoding="async" draggable="false" />
    </span>
  );
}
