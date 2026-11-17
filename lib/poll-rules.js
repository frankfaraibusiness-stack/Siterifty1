// Poll expiry rules. Pure (no Firestore, no React) so the feed, the vote route
// and the clean-up all agree on what "expired" means.
//
// A poll either lasts forever (poll.endsAt is null, the default) or has an end
// time. Once an end time passes the poll is hidden everywhere right away and
// deleted the next time anybody visits (lib/poll-expiry.js). Theory "Facts or
// Cap" verdicts never expire.

export const POLL_HOURS = [0, 1, 24, 72, 168]; // 0 = no expiry

const ms = (t) => (typeof t?.toMillis === "function" ? t.toMillis() : typeof t === "number" ? t : null);

// A stored post doc (data) whose poll has run out.
export function pollExpired(data, now = Date.now()) {
  const poll = data?.poll;
  if (!poll || poll.kind === "verdict") return false;
  const end = ms(poll.endsAt);
  return end !== null && end <= now;
}

// What the composer sends -> the number of hours to store (0 = never expires).
export function pollHours(value) {
  return POLL_HOURS.includes(value) ? value : 0;
}
