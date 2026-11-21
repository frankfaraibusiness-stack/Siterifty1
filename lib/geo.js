// Country of a new member, read once when the account is created and saved on users/{uid}.country.
//
// It is the two-letter ISO code ("US", "ZA", "GB") that the hosting network puts on the request, or the
// word "unknown" when there is none: localhost, a VPN or proxy the host can't place, or any error.
// Detection is never allowed to stop a sign-up. No browser language guessing: a guess is not a detection.
// Pure (no imports, no I/O) so the sign-up routes and the tests can both use it.

export const UNKNOWN_COUNTRY = "unknown";

// Vercel, Cloudflare and CloudFront each send the visitor's country under their own header name.
const COUNTRY_HEADERS = ["x-vercel-ip-country", "cf-ipcountry", "cloudfront-viewer-country"];

// XX = Cloudflare "no data", T1 = Tor, ZZ = unknown/reserved, A1/A2/O1 = anonymous proxy, satellite, other.
const NOT_A_COUNTRY = new Set(["XX", "T1", "ZZ", "A1", "A2", "O1"]);

// -> "ZA" | "unknown". Never throws. `headers` is a Headers object (request.headers) or anything with get().
export function detectCountry(headers) {
  try {
    for (const name of COUNTRY_HEADERS) {
      const code = String(headers?.get?.(name) ?? "").trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code) && !NOT_A_COUNTRY.has(code)) return code;
    }
  } catch {
    // fall through to unknown
  }
  return UNKNOWN_COUNTRY;
}
