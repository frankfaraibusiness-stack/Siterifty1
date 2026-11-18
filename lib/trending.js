// The most-used tags in a batch of posts that the page already loaded, so the
// home feed's "Trending tags" card costs no extra Firestore reads.
// New posts carry a `tags` array; older ones a single `tag` string ("#a #b").

export function trendingTags(posts, { limit = 8, min = 1 } = {}) {
  const counts = new Map();
  for (const p of posts) {
    const raw = p.tags?.length ? p.tags : String(p.tag || "").split(/\s+/);
    const seen = new Set();
    for (const r of raw) {
      const t = String(r || "").toLowerCase().replace(/^#/, "").trim();
      if (!t || seen.has(t)) continue; // one vote per post
      seen.add(t);
      counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return [...counts]
    .filter(([, n]) => n >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));
}
