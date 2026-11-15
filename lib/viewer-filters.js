// Applies one member's own feed preferences (Leak Filter + blocked list) to a
// list of mapped posts. Pure, so it can run anywhere.
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function mutedBy(post, matchers) {
  if (!matchers.length) return false;
  const hay = `${post.title || ""} ${post.text || ""} ${post.tag || ""} ${(post.tags || []).join(" ")}`.toLowerCase();
  return matchers.some((re) => re.test(hay));
}

export function buildMatchers(words) {
  return words.map(
    (w) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(w)}($|[^\\p{L}\\p{N}])`, "u")
  );
}

export function blockedSet(prefs) {
  return new Set(prefs.safety.blocked);
}

// Returns { posts, hidden }. `hidden` counts only what the Leak Filter removed
// (muted words and hidden spoilers), so the feed can say so; blocked members
// simply vanish. Your own posts are never filtered.
export function applyViewerFilters(posts, prefs) {
  const blocked = blockedSet(prefs);
  const matchers = buildMatchers(prefs.feed.mutedWords);
  const mode = prefs.feed.spoilers;
  const out = [];
  let hidden = 0;

  for (const post of posts) {
    if (post.isOwner) {
      out.push(post);
      continue;
    }
    if (blocked.has(String(post.user || "").toLowerCase())) continue;
    if (mutedBy(post, matchers)) {
      hidden += 1;
      continue;
    }
    if (post.settings?.spoiler && mode === "hide") {
      hidden += 1;
      continue;
    }
    out.push(
      post.settings?.spoiler && mode === "show"
        ? { ...post, settings: { ...post.settings, spoiler: false } }
        : post
    );
  }
  return { posts: out, hidden };
}

// "hot" floats the most-reacted posts of the latest batch to the top.
export function orderPosts(posts, order) {
  if (order !== "hot") return posts;
  return [...posts].sort(
    (a, b) =>
      (b.likesCount || 0) + (b.comments || 0) * 2 -
        ((a.likesCount || 0) + (a.comments || 0) * 2) ||
      b.createdAtMs - a.createdAtMs
  );
}
