// The referral programme, in one place. Plain data and pure functions only, so it is safe to import
// from the server (which pays and checks everything) AND the browser (which draws the page).
//
// How it works:
//   1. A member opens /referrals and gets a personal link: <this site>/r/<code>. The link is built from
//      whatever address the page is open on, nothing is hardcoded.
//   2. Visiting the link stores the code in a cookie (REF_COOKIE) for REF_COOKIE_DAYS days.
//   3. When a NEW account is created in that browser (email sign-up or first Google sign-in), the server
//      reads the cookie and records "referred by" on the new account. That counts as +1 for the referrer.
//   4. The referrer is paid ONCE per referral, the moment that person's total XP (the Vice Reel XP from
//      lib/videos-config.js) reaches REFERRAL_XP_TARGET. The money goes straight into the referrer's
//      wallet (users/{uid}.walletMills). It never repeats for the same person.
//
// Money is whole MILLS (1/1000 of a US dollar), like the rest of the wallet (lib/gifts.js).

export const REFERRAL_XP_TARGET = 1000; // the referred person's XP that unlocks the payout
export const REFERRAL_BONUS_MILLS = 1000; // $1.00 per referral, paid once

export const REF_COOKIE = "gta6fb_ref";
export const REF_COOKIE_DAYS = 30;

// 8 characters, no look-alikes (0/O, 1/I/L). Uppercase in the link; lookups are case-insensitive.
export const REF_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const REF_CODE_LENGTH = 8;
export const REF_CODE_RE = /^[A-Za-z0-9]{6,12}$/;

export const cleanRefCode = (raw) => {
  const s = String(raw ?? "").trim();
  return REF_CODE_RE.test(s) ? s.toUpperCase() : "";
};

// A random code from the browser-safe crypto in both Node and the browser.
export function makeRefCode() {
  const bytes = new Uint8Array(REF_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => REF_ALPHABET[b % REF_ALPHABET.length]).join("");
}

// The path part of the link. The page adds the current origin in the browser.
export const refPath = (code) => `/r/${code}`;

// 1000 -> "$1.00", 2500 -> "$2.50"
export function formatUsd(mills) {
  const n = Number.isFinite(mills) ? Math.max(0, Math.round(mills)) : 0;
  return `$${(n / 1000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// How far a referred person is towards the payout, 0..100.
export function refProgress(xp) {
  const n = Math.max(0, Math.floor(Number(xp) || 0));
  return Math.min(100, Math.floor((n / REFERRAL_XP_TARGET) * 100));
}
