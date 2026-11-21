// Country flag helpers (pure, no imports) shared by the flag badge, the settings panel and the tests.

// ZA -> 🇿🇦 (the regional-indicator pair for a two-letter code). "" for anything that isn't a code,
// so "unknown" accounts show no flag.
export function flagEmoji(code) {
  if (!/^[A-Z]{2}$/.test(code || "")) return "";
  return String.fromCodePoint(...[...code].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65));
}

// ZA -> "South Africa" (Intl.DisplayNames is built into browsers and Node); the code itself if that fails.
export function countryName(code) {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}
