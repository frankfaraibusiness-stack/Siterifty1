// Interest profile + recommendation ranking. Pure (no Firestore), safe on server and client.
//
// What we remember about a member (interests/{uid}) is only counts, never posts:
//   t   hashtag      -> score      (#trailer, #vicecity ...)
//   g   game         -> score      (gta6, gta5 ... inferred from tags and text)
//   ty  post type    -> score      (video, poll, theory, event, post)
//   au  author       -> score      (handle)
//   w   total weight of everything above
// Every interaction ADDS to those counters with a plain increment, so a save costs ONE write and
// no read. Old interests fade without any cleanup job: each increment is stored "inflated" by
// 2^(days since EPOCH / HALF_LIFE), and when the profile is read the numbers are deflated again,
// so an interaction from 3 weeks ago counts half as much as one from today.

export const HALF_LIFE_DAYS = 21;
const EPOCH_MS = Date.UTC(2026, 0, 1);
const DAY = 86_400_000;

// How strongly each kind of interaction says "I like this kind of post".
export const WEIGHTS = { click: 1, like: 3, save: 3, comment: 4 };

export const POST_TYPES = ["post", "video", "poll", "theory", "event"];

// Game titles we can recognise. `re` runs on the lower-cased tags + title + text.
export const GAMES = [
  { id: "gta6", label: "GTA 6", re: /\bgta\s?-?(6|vi)\b|gta6|gtavi|grand theft auto\s*(6|vi)\b|leonida|vice\s?city(?!\s?stories)|jason duval|\blucia\b/ },
  { id: "gta5", label: "GTA V", re: /\bgta\s?-?(5|v)\b|gta5|gtav\b|grand theft auto\s*(5|v)\b|gta\s?online|los\s?santos|michael de santa|trevor philips|\bfranklin\b/ },
  { id: "gta4", label: "GTA IV", re: /\bgta\s?-?(4|iv)\b|gta4|gtaiv|grand theft auto\s*(4|iv)\b|niko bellic/ },
  { id: "gtasa", label: "San Andreas", re: /san\s?andreas|\bgtasa\b/ },
  { id: "gtavc", label: "Vice City (classic)", re: /gtavc|vice\s?city\s?stories|\bgta\s?vc\b/ },
  { id: "gta3", label: "GTA III", re: /\bgta\s?-?(3|iii)\b|gta3|gtaiii/ },
  { id: "rdr", label: "Red Dead", re: /red\s?dead|\brdr2?\b|arthur morgan/ },
];
export const GAME_IDS = GAMES.map((g) => g.id);
export const gameLabel = (id) => GAMES.find((g) => g.id === id)?.label || id;

// ---- reading a post -----------------------------------------------------------

export const cleanTag = (t) => String(t ?? "").toLowerCase().replace(/^#+/, "").replace(/[^a-z0-9]/g, "").slice(0, 30);
export const authorKey = (u) => String(u ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 30);

export function postTags(post) {
  const raw = Array.isArray(post?.tags) && post.tags.length ? post.tags : String(post?.tag ?? "").split(/\s+/);
  return [...new Set(raw.map(cleanTag).filter(Boolean))].slice(0, 5);
}

export function inferGames(post, tags = postTags(post)) {
  const hay = `${tags.join(" ")} ${post?.title || ""} ${post?.text || ""}`.toLowerCase();
  return GAMES.filter((g) => g.re.test(hay)).map((g) => g.id);
}

// The compact fingerprint of a post: all we ever need to learn from it.
export function signalsOf(post) {
  const tags = postTags(post);
  return {
    tags,
    games: inferGames(post, tags),
    type: POST_TYPES.includes(post?.type) ? post.type : "post",
    author: authorKey(post?.user),
  };
}

// Cleans a fingerprint that came from a browser (never trust it further than "counts for this member").
export function cleanSignals(s) {
  const tags = [...new Set((Array.isArray(s?.t) ? s.t : []).map(cleanTag).filter(Boolean))].slice(0, 5);
  return {
    tags,
    games: (Array.isArray(s?.g) ? s.g : []).filter((g) => GAME_IDS.includes(g)).slice(0, 3),
    type: POST_TYPES.includes(s?.y) ? s.y : "post",
    author: authorKey(s?.u),
  };
}

// ---- time decay ---------------------------------------------------------------------

const inflate = (now) => 2 ** ((now - EPOCH_MS) / (HALF_LIFE_DAYS * DAY));
export const boost = (weight, now = Date.now()) => weight * inflate(now);

// Increments to apply for one interaction: { t: {tag: n}, g: {...}, ty: {...}, au: {...}, w, n }.
// Author counts less than topic: following a topic matters more than one person.
export function interestDelta(sig, weight, now = Date.now()) {
  const w = boost(weight, now);
  const out = { t: {}, g: {}, ty: {}, au: {}, w, n: 1 };
  for (const t of sig.tags) out.t[t] = w;
  for (const g of sig.games) out.g[g] = w;
  out.ty[sig.type] = w * 0.6;
  if (sig.author) out.au[sig.author] = w * 0.5;
  return out;
}

// Adds several deltas together (several clicks in one request become one write).
export function mergeDeltas(list) {
  const out = { t: {}, g: {}, ty: {}, au: {}, w: 0, n: 0 };
  for (const d of list) {
    for (const k of ["t", "g", "ty", "au"]) for (const [key, v] of Object.entries(d[k])) out[k][key] = (out[k][key] || 0) + v;
    out.w += d.w;
    out.n += d.n;
  }
  return out;
}

// A stored profile -> real (de-inflated) numbers plus totals per map.
export function readInterests(data, now = Date.now()) {
  const f = 1 / inflate(now);
  const maps = {};
  const totals = {};
  for (const k of ["t", "g", "ty", "au"]) {
    maps[k] = {};
    totals[k] = 0;
    for (const [key, v] of Object.entries(data?.[k] || {})) {
      const x = Number(v) * f;
      if (x > 0.01) { maps[k][key] = x; totals[k] += x; }
    }
  }
  return { ...maps, totals, weight: Math.max(0, Number(data?.w || 0) * f), n: Number(data?.n || 0) };
}

// The top entries of a map, e.g. for showing "your interests" later.
export const topOf = (map, n = 5) => Object.entries(map || {}).sort((a, b) => b[1] - a[1]).slice(0, n);

// ---- ranking ----------------------------------------------------------------------------

const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Scores one post for one member. Higher = show sooner. Returns { score, affinity, why }.
export function scorePost(post, interests, now = Date.now()) {
  const sig = post._sig || signalsOf(post);
  const I = interests;
  const warm = I ? clamp01(I.weight / 8) : 0; // a brand-new profile is ignored until it has a little history
  let affinity = 0;
  let topical = 0; // game + hashtag match only: what "outside their taste" is measured by
  let why = "Trending";
  if (I && warm > 0) {
    const g = I.totals.g ? clamp01(sig.games.reduce((s, id) => s + (I.g[id] || 0), 0) / I.totals.g) : 0;
    const tSum = sig.tags.reduce((s, id) => s + (I.t[id] || 0), 0);
    const t = I.totals.t ? clamp01((tSum / I.totals.t) * 3) : 0;
    const ty = I.totals.ty ? clamp01((I.ty[sig.type] || 0) / I.totals.ty) : 0;
    const au = I.totals.au ? clamp01(((I.au[sig.author] || 0) / I.totals.au) * 2) : 0;
    topical = 0.4 * g + 0.35 * t;
    affinity = topical + 0.1 * ty + 0.15 * au;
    if (affinity >= 0.08) {
      const best = [[0.4 * g, "game"], [0.35 * t, "tag"], [0.15 * au, "author"], [0.1 * ty, "type"]].sort((a, b) => b[0] - a[0])[0][1];
      if (best === "game" && sig.games.length) why = `More ${gameLabel([...sig.games].sort((a, b) => (I.g[b] || 0) - (I.g[a] || 0))[0])}`;
      else if (best === "tag" && sig.tags.length) why = `#${[...sig.tags].sort((a, b) => (I.t[b] || 0) - (I.t[a] || 0))[0]}`;
      else if (best === "author") why = `More from @${post.user}`;
      else why = "For you";
    }
  }
  const ageH = Math.max(0, (now - (post.createdAtMs || now)) / 3_600_000);
  const fresh = 0.5 ** (ageH / 48); // half a score every 2 days
  const pop = clamp01(Math.log10(1 + (post.likesCount || 0) + 2 * (post.comments || 0)) / 2.5);
  return { score: 1.7 * warm * affinity + 0.7 * fresh + 0.5 * pop, affinity, topical, fresh, pop, why };
}

// Orders posts for a member. Skips their own posts and anything they already liked or saved, keeps
// at most `authorCap` posts per author, and reserves every 4th slot for something outside their
// usual taste (the freshest popular post), so the profile can discover new interests instead of
// looping on old ones. Pure and deterministic for the same inputs.
export function rankPosts(posts, interests, { now = Date.now(), limit = Infinity, authorCap = 2 } = {}) {
  const scored = [];
  for (const p of posts) {
    if (p.isOwner || p.likedByMe || p.savedByMe) continue;
    const s = scorePost(p, interests, now);
    scored.push({ post: p, ...s });
  }
  const byScore = [...scored].sort((a, b) => b.score - a.score || b.post.createdAtMs - a.post.createdAtMs);
  const explore = [...scored]
    .filter((s) => s.topical < 0.05)
    .sort((a, b) => b.fresh * (0.3 + b.pop) - a.fresh * (0.3 + a.pop));

  const out = [];
  const used = new Set();
  const perAuthor = new Map();
  const take = (s) => {
    const a = s.post.user;
    if ((perAuthor.get(a) || 0) >= authorCap || used.has(s.post.id)) return false;
    used.add(s.post.id);
    perAuthor.set(a, (perAuthor.get(a) || 0) + 1);
    out.push({ post: s.post, why: out.length % 4 === 3 && s.topical < 0.05 && interests ? "Something new" : s.why });
    return true;
  };
  const warm = interests && interests.weight > 0.5;
  let bi = 0;
  let ei = 0;
  while (out.length < limit && (bi < byScore.length || ei < explore.length)) {
    if (warm && out.length % 4 === 3 && ei < explore.length) {
      if (take(explore[ei++])) continue;
      continue;
    }
    if (bi >= byScore.length) { if (ei < explore.length) { take(explore[ei++]); continue; } break; }
    take(byScore[bi++]);
  }
  // Anything the author cap held back goes after the rest, so a short list is still complete.
  if (out.length < limit) for (const s of byScore) { if (!used.has(s.post.id)) { used.add(s.post.id); out.push({ post: s.post, why: s.why }); if (out.length >= limit) break; } }
  return out;
}
