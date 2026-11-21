// The "hot" keyword list for the search screen, fetched once and kept for a
// minute. The phone does the as-you-type matching itself from this one list,
// so typing never sends a request.

const FRESH_MS = 60_000;
const cache = { at: 0, terms: null, promise: null };

export function readHot() {
  return cache.terms;
}

export function warmHot() {
  if (cache.promise) return cache.promise;
  if (cache.terms && Date.now() - cache.at < FRESH_MS) return Promise.resolve(cache.terms);
  cache.promise = fetch("/api/search/hot")
    .then((r) => (r.ok ? r.json() : { terms: [] }))
    .then((d) => {
      const terms = Array.isArray(d.terms) ? d.terms.filter((t) => t && typeof t.q === "string") : [];
      cache.terms = terms.length ? terms : cache.terms || [];
      cache.at = Date.now();
      return cache.terms;
    })
    .catch(() => cache.terms || [])
    .finally(() => {
      cache.promise = null;
    });
  return cache.promise;
}
