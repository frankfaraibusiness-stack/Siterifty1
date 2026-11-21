// "just now", "5 minutes ago", "3 hours ago", "10 days ago", "2 months ago", "1 year ago".
// Pure (no server-only import) so it works in server components, client components and tests.
// `now` is injectable for tests. Returns "" for a missing or future date.
export function agoLong(ms, now = Date.now()) {
  if (!ms || ms > now) return "";
  const minutes = Math.floor((now - ms) / 60_000);
  if (minutes < 1) return "just now";
  const unit = (n, word) => `${n} ${word}${n === 1 ? "" : "s"} ago`;
  if (minutes < 60) return unit(minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return unit(hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 60) return unit(days, "day");
  const months = Math.floor(days / 30);
  if (months < 12) return unit(months, "month");
  return unit(Math.floor(days / 365), "year");
}
