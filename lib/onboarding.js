// New-member onboarding (/welcome): the three-step intro every new account goes
// through once. Plain data and pure functions only, so it is covered by
// tests/onboarding.test.mjs and safe to import from the server and the browser.
//
// How it hangs together:
//   - A new account (email signup, or a first Google sign-in) is saved with
//     `onboarded: false` on users/{uid}. Older accounts have no such field and
//     count as done, so nobody who is already in gets pulled into the tour.
//   - While `onboarded` is false the browser carries the cookie below. The root
//     layout reads it and mounts <OnboardingGate>, which sends every page to
//     /welcome except the info pages (terms, privacy, help ...).
//   - Finishing step three calls POST /api/onboarding, which sets
//     `onboarded: true` and clears the cookie.
//   - Log in and Google sign-in re-check the account, so the tour follows the
//     member to another device if they left halfway; log out clears the cookie.

export const ONBOARD_COOKIE = "gta6fb_onboard";
export const ONBOARD_COOKIE_VALUE = "pending";
export const ONBOARD_MAX_AGE_S = 60 * 60 * 24 * 30; // a month is plenty to finish a 3-step tour

export const WELCOME_PATH = "/welcome";

// Pages a member who has not finished the tour may still open: the tour itself
// and the plain info pages the sign-up screen links to (Terms, Privacy ...).
const EXEMPT_PREFIXES = [
  "/welcome",
  "/terms",
  "/privacy",
  "/cookies",
  "/guidelines",
  "/copyright",
  "/disclaimer",
  "/help",
  "/contact",
  "/about",
];

export function onboardCookieOptions() {
  return {
    name: ONBOARD_COOKIE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONBOARD_MAX_AGE_S,
  };
}

// True when this account still has to do the tour. Only an explicit `false`
// counts: a missing field is an older account and stays out of it.
export function needsOnboarding(userDoc) {
  return !!userDoc && userDoc.onboarded === false;
}

// Should this path be left alone while the tour is pending?
export function isGateExempt(pathname) {
  const p = typeof pathname === "string" ? pathname : "";
  return EXEMPT_PREFIXES.some((x) => p === x || p.startsWith(`${x}/`));
}

// Where a pending member must be sent from `pathname` (null = stay put).
export function gateRedirect(pending, pathname) {
  if (!pending) return null;
  return isGateExempt(pathname) ? null : WELCOME_PATH;
}
