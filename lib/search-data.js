import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { canView, mapPostDoc } from "@/lib/feed-data";

// Firestore has no full-text search, so the server scans the newest posts
// (and a slice of profiles), scores them, and returns the best matches.
// Everything here runs on the server; the browser only receives HTML.
const SCAN_POSTS = 400;
const SCAN_USERS = 300;
const MAX_POSTS = 40;
const MAX_PEOPLE = 24;

const USER_FIELDS = [
  "username",
  "usernameLower",
  "displayName",
  "bio",
  "location",
  "theme",
  "hasAvatar",
  "updatedAt",
];

const low = (s) => String(s || "").toLowerCase();
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function parseQuery(raw) {
  const query = String(raw || "").replace(/\s+/g, " ").trim().slice(0, 80);
  const seen = new Set();
  const terms = [];
  for (const piece of query.toLowerCase().split(" ")) {
    const t = piece
      .replace(/^[#@]+/, "")
      .replace(/[^\p{L}\p{N}_.'-]/gu, "")
      .replace(/^[.'-]+|[.'-]+$/g, "");
    if (t && !seen.has(t)) {
      seen.add(t);
      terms.push(t);
    }
    if (terms.length >= 6) break;
  }
  return { query, terms };
}

// All terms must match somewhere (AND). Higher score = better match.
function scorePost(data, terms, phrase) {
  const user = low(data.user);
  const tag = low(data.tag).replace(/^#/, "");
  const text = low(`${data.title || ""} ${data.text || ""}`);
  const loc = low(data.location);
  let score = 0;
  for (const t of terms) {
    let s = 0;
    if (user === t) s += 50;
    else if (user.includes(t)) s += 12;
    if (tag === t) s += 30;
    else if (tag.includes(t)) s += 15;
    if (new RegExp(`\\b${escapeRe(t)}`).test(text)) s += 8;
    else if (text.includes(t)) s += 5;
    if (loc.includes(t)) s += 3;
    if (s === 0) return 0;
    score += s;
  }
  if (terms.length > 1 && text.includes(phrase)) score += 10;
  return score;
}

function scorePerson(data, terms) {
  const user = low(data.username);
  const name = low(data.displayName);
  const bio = low(data.bio);
  const loc = low(data.location);
  let score = 0;
  for (const t of terms) {
    let s = 0;
    if (user === t) s += 50;
    else if (user.startsWith(t)) s += 30;
    else if (user.includes(t)) s += 15;
    if (name === t) s += 25;
    else if (name.startsWith(t) || name.includes(` ${t}`)) s += 20;
    else if (name.includes(t)) s += 12;
    if (bio.includes(t)) s += 4;
    if (loc.includes(t)) s += 3;
    if (s === 0) return 0;
    score += s;
  }
  return score;
}

function mapPerson(doc) {
  const d = doc.data();
  return {
    username: d.username,
    displayName: d.displayName || d.username,
    bio: d.bio || "",
    location: d.location || "",
    theme: d.theme || "vice",
    hasAvatar: d.hasAvatar !== false,
    avatarV: d.updatedAt?.toMillis?.() ?? 0,
  };
}

export async function searchEverything(rawQuery, { currentUid } = {}) {
  const { query, terms } = parseQuery(rawQuery);
  if (terms.length === 0) {
    return { query, terms, posts: [], people: [], postTotal: 0, peopleTotal: 0 };
  }

  const db = getAdminDb();
  const phrase = terms.join(" ");
  const first = terms[0];

  const [postSnap, userSnap, prefixSnap] = await Promise.all([
    db.collection("posts").orderBy("createdAt", "desc").limit(SCAN_POSTS).get(),
    db.collection("users").select(...USER_FIELDS).limit(SCAN_USERS).get(),
    // Guarantees username-prefix hits even past the scan window.
    db
      .collection("users")
      .where("usernameLower", ">=", first)
      .where("usernameLower", "<=", first + "\uf8ff")
      .select(...USER_FIELDS)
      .limit(30)
      .get(),
  ]);

  // Posts
  const scoredPosts = [];
  for (const doc of postSnap.docs) {
    const data = doc.data();
    if (!canView(data, currentUid)) continue;
    const score = scorePost(data, terms, phrase);
    if (score > 0) {
      scoredPosts.push({ doc, score, ms: data.createdAt?.toMillis?.() ?? 0 });
    }
  }
  scoredPosts.sort((a, b) => b.score - a.score || b.ms - a.ms);
  const posts = scoredPosts
    .slice(0, MAX_POSTS)
    .map(({ doc }) => mapPostDoc(doc, currentUid));

  // People (merge the scan + prefix results, de-duplicated by username)
  const byName = new Map();
  for (const doc of [...prefixSnap.docs, ...userSnap.docs]) {
    const d = doc.data();
    if (d.username && !byName.has(d.username)) byName.set(d.username, doc);
  }
  const scoredPeople = [];
  for (const doc of byName.values()) {
    const score = scorePerson(doc.data(), terms);
    if (score > 0) scoredPeople.push({ doc, score });
  }
  scoredPeople.sort((a, b) => b.score - a.score);
  const people = scoredPeople.slice(0, MAX_PEOPLE).map(({ doc }) => mapPerson(doc));

  return {
    query,
    terms,
    posts,
    people,
    postTotal: scoredPosts.length,
    peopleTotal: scoredPeople.length,
  };
}

// Shown when there is no query (or no results): trending tags from recent
// posts, plus the newest members.
export async function getDiscover() {
  const db = getAdminDb();
  const [postSnap, userSnap] = await Promise.all([
    db.collection("posts").orderBy("createdAt", "desc").limit(SCAN_POSTS).get(),
    db
      .collection("users")
      .orderBy("createdAt", "desc")
      .select(...USER_FIELDS)
      .limit(6)
      .get(),
  ]);

  const counts = new Map();
  for (const doc of postSnap.docs) {
    const d = doc.data();
    if (!canView(d, null)) continue;
    // New posts carry a `tags` array; older ones a single `tag` string.
    for (const raw of d.tags?.length ? d.tags : [d.tag]) {
      const t = low(raw).replace(/^#/, "");
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  const tags = [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag, count]) => ({ tag, count }));

  return { tags, people: userSnap.docs.map(mapPerson) };
}
