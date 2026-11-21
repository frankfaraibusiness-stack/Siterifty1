// Wallet page (/wallet): plain data and helpers, safe for server AND client code.
// Money is whole MILLS (1/1000 of a US dollar), same as the rest of the wallet (lib/gifts.js).

import { GIFTS, MILLS_PER_DOLLAR, formatMills } from "./gifts.js";
import { PERKS } from "./perks.js";

// The smallest withdrawal a member can request: $50.00.
export const MIN_WITHDRAW_USD = 50;
export const MIN_WITHDRAW_MILLS = MIN_WITHDRAW_USD * MILLS_PER_DOLLAR;

// "Mr. Tony" / "Mrs. Lucia". Gender comes from the sign-up character (users/{uid}.gender);
// when it is unknown (older accounts) we just use the name.
export function greetingName({ gender, displayName, username } = {}) {
  const name = String(displayName || username || "").trim();
  if (!name) return "";
  if (gender === "male") return `Mr. ${name}`;
  if (gender === "female") return `Mrs. ${name}`;
  return name;
}

// How far a balance is toward the $50 minimum, as { pct, reached, remainingMills }.
export function withdrawProgress(balanceMills) {
  const bal = Number.isFinite(balanceMills) && balanceMills > 0 ? Math.floor(balanceMills) : 0;
  const reached = bal >= MIN_WITHDRAW_MILLS;
  return {
    reached,
    pct: reached ? 100 : Math.floor((bal / MIN_WITHDRAW_MILLS) * 100),
    remainingMills: reached ? 0 : MIN_WITHDRAW_MILLS - bal,
  };
}

// Labels for the activity log. `sign` is how the row is coloured; the amount's own sign wins.
export const ACTIVITY_KINDS = {
  deposit: { label: "Deposit", group: "deposit" },
  withdraw_request: { label: "Withdrawal request", group: "withdraw" },
  withdraw: { label: "Withdrawal", group: "withdraw" },
  gift_send: { label: "Gift sent", group: "other" },
  gift_received: { label: "Gift received", group: "other" },
  referral_bonus: { label: "Referral bonus", group: "other" },
};

export function activityKind(type) {
  return ACTIVITY_KINDS[type] || { label: "Wallet activity", group: "other" };
}

// "from $1.99" lines for the "what you can do" cards, worked out from the real catalogues.
export const cheapestGiftText = () => `$${Math.min(...GIFTS.map((g) => g.price)).toFixed(2)}`;
export const cheapestPerkText = () => `$${Math.min(...PERKS.map((p) => p.price)).toFixed(2)}`;
export const giftCount = () => GIFTS.length;
export const perkCount = () => PERKS.length;

export { formatMills };
