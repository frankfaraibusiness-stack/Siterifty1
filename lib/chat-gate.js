// Paid-plan gate for two chat privacy options (Settings > Wanted Level):
//   - "No one" for who can message you
//   - turning read receipts off
// Free accounts see both as an upsell. Pure (no imports) so the server route,
// the panel and the tests all use the same rule. `paid` = any paid plan.

export const CHAT_GATE_MESSAGE = "Choosing “No one” and turning off read receipts come with any paid plan.";

// Which of the two options a patch would newly switch on. Settings a free
// account already has (set before the gate existed) are left alone, so only a
// change *to* the locked value counts.
export function lockedChatChanges(current, patch) {
  const cur = current && typeof current === "object" ? current : {};
  const next = patch && typeof patch === "object" ? patch : {};
  const locked = [];
  if (next.whoCanMessage === "nobody" && cur.whoCanMessage !== "nobody") locked.push("whoCanMessage");
  if (next.readReceipts === false && cur.readReceipts !== false) locked.push("readReceipts");
  return locked;
}

// -> { ok: true } or { ok: false, error, locked: [...] }
export function checkChatPrivacy({ paid, current, patch }) {
  if (paid) return { ok: true };
  const locked = lockedChatChanges(current, patch);
  if (locked.length === 0) return { ok: true };
  return { ok: false, error: CHAT_GATE_MESSAGE, locked };
}
