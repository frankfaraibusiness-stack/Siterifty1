import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { timeAgo } from "@/lib/feed-data";
import { getCommunityTheme, normalizePermissions, getCategory, roleRank, isStaff } from "@/lib/community-schema";

// Firestore layout
// communities/{id}            profile, settings, counts (see mapCommunity)
//   /members/{uid}            { uid, username, role, joinedAt, lastPostAt, a, b }
//   /requests/{uid}           { uid, username, answers: [{ q, a }], createdAt }
//   /bans/{uid}               { uid, username, createdAt }
//   /assets/{avatar|banner}   { data: dataURL }
//   /posts/{postId}           { uid, user, text, flair, images, likedBy, pinned, createdAt }
//     /media/{n}              { data: dataURL }
// users/{uid}.communityIds / .communityPending  (arrays, for fast "my communities")

export const col = (db = getAdminDb()) => db.collection("communities");

export function mapCommunity(doc) {
  const d = doc.data();
  const theme = getCommunityTheme(d.theme);
  return {
    id: doc.id,
    slug: d.slug,
    name: d.name,
    tagline: d.tagline || "",
    description: d.description || "",
    category: d.category,
    categoryLabel: getCategory(d.category)?.label || "GTA 6",
    tags: d.tags || [],
    privacy: d.privacy === "private" ? "private" : "public",
    listed: d.listed !== false,
    questions: d.questions || [],
    rules: d.rules || [],
    theme: theme.id,
    a: theme.a,
    b: theme.b,
    scene: d.scene || "sunset",
    icon: d.icon || "bolt",
    hasAvatar: !!d.hasAvatar,
    hasBanner: !!d.hasBanner,
    assetsV: d.assetsV || 0,
    permissions: normalizePermissions(d.permissions),
    ownerUid: d.ownerUid,
    ownerName: d.ownerName || "",
    memberCount: d.memberCount || 0,
    postCount: d.postCount || 0,
    lastPostMs: d.lastPostAt?.toMillis?.() ?? 0,
    createdMs: d.createdAt?.toMillis?.() ?? 0,
  };
}

export async function getCommunityBySlug(slug) {
  const snap = await col().where("slugLower", "==", String(slug).toLowerCase()).limit(1).get();
  return snap.empty ? null : mapCommunity(snap.docs[0]);
}

// What the viewer is to a community: role, pending request, or banned.
export async function getViewerState(communityId, uid) {
  if (!uid) return { role: null, pending: false, banned: false, joinedMs: 0 };
  const ref = col().doc(communityId);
  const [m, r, b] = await Promise.all([
    ref.collection("members").doc(uid).get(),
    ref.collection("requests").doc(uid).get(),
    ref.collection("bans").doc(uid).get(),
  ]);
  return {
    role: m.exists ? m.data().role : null,
    pending: r.exists,
    banned: b.exists,
    joinedMs: m.exists ? m.data().joinedAt?.toMillis?.() ?? 0 : 0,
    lastPostMs: m.exists ? m.data().lastPostAt?.toMillis?.() ?? 0 : 0,
  };
}

export function stateLabel(v) {
  if (v.banned) return "banned";
  if (v.role === "owner") return "owner";
  if (v.role) return "member";
  if (v.pending) return "pending";
  return "none";
}

// Can this viewer post right now? Returns { ok, reason }.
export function postingStatus(c, v) {
  if (!v.role) return { ok: false, reason: "Join to post here." };
  const who = c.permissions.whoCanPost;
  if (who === "admins" && roleRank(v.role) < 3) return { ok: false, reason: "Chat is locked. Only admins can post right now.", locked: true };
  if (who === "mods" && !isStaff(v.role)) return { ok: false, reason: "Chat is locked. Only admins and moderators can post right now.", locked: true };
  if (!isStaff(v.role)) {
    const waitMs = c.permissions.newMemberWait * 3_600_000;
    if (waitMs && Date.now() - v.joinedMs < waitMs) {
      const left = Math.ceil((waitMs - (Date.now() - v.joinedMs)) / 3_600_000);
      return { ok: false, reason: `New members can post after ${c.permissions.newMemberWait}h. About ${left}h to go.` };
    }
  }
  return { ok: true };
}

function trendScore(c) {
  const fresh = Date.now() - c.lastPostMs < 3 * 86_400_000 ? 25 : 0;
  return c.memberCount + c.postCount * 2 + fresh;
}

// The communities feed. Filters/sorts in memory so no composite index is needed.
export async function fetchDiscover({ q = "", category = "", sort = "trending", uid = null } = {}) {
  const db = getAdminDb();
  const [snap, userSnap] = await Promise.all([
    col(db).where("listed", "==", true).limit(300).get(),
    uid ? db.collection("users").doc(uid).get() : null,
  ]);
  const ud = userSnap?.data() || {};
  const mineIds = new Set(ud.communityIds || []);
  const pendingIds = new Set(ud.communityPending || []);

  let all = snap.docs.map(mapCommunity);
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (c) => {
    if (category && c.category !== category) return false;
    if (!terms.length) return true;
    const hay = `${c.name} ${c.tagline} ${c.description} ${c.categoryLabel} ${c.slug} ${c.tags.join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t.replace(/^#|^c\//, "")));
  };
  const filtered = all.filter(matches);
  const sorters = {
    trending: (a, b) => trendScore(b) - trendScore(a),
    biggest: (a, b) => b.memberCount - a.memberCount,
    newest: (a, b) => b.createdMs - a.createdMs,
    active: (a, b) => b.lastPostMs - a.lastPostMs,
  };
  filtered.sort(sorters[sorters[sort] ? sort : "trending"]);

  const stateOf = (c) => (mineIds.has(c.id) ? (c.ownerUid === uid ? "owner" : "member") : pendingIds.has(c.id) ? "pending" : "none");
  const withState = (c) => ({ ...c, viewerState: stateOf(c) });

  // "Your communities" includes private unlisted ones, so fetch by id.
  let mine = [];
  if (uid && mineIds.size) {
    const refs = [...mineIds].slice(0, 60).map((id) => col(db).doc(id));
    const docs = await db.getAll(...refs);
    mine = docs.filter((d) => d.exists).map(mapCommunity).map(withState);
  }
  const featured = !q && !category ? [...all].sort(sorters.trending).slice(0, 3).map(withState) : [];
  return {
    list: filtered.map(withState),
    featured,
    mine,
    total: all.length,
    categoryCounts: all.reduce((m, c) => ((m[c.category] = (m[c.category] || 0) + 1), m), {}),
  };
}

// The community promoted in "Hot Discussions" on the landing page. Takes one of
// the top trending listed communities and rotates it hourly, so the spot never
// feels stuck. Returns { community, state } or null (never throws: the landing
// page must still load if this lookup fails).
export async function fetchPromotedCommunity(uid = null) {
  try {
    const db = getAdminDb();
    const [snap, userSnap] = await Promise.all([
      col(db).where("listed", "==", true).limit(100).get(),
      uid ? db.collection("users").doc(uid).get() : null,
    ]);
    const top = snap.docs.map(mapCommunity).sort((a, b) => trendScore(b) - trendScore(a)).slice(0, 5);
    if (!top.length) return null;
    const community = top[Math.floor(Date.now() / 3_600_000) % top.length];
    const ud = userSnap?.data() || {};
    const state = (ud.communityIds || []).includes(community.id)
      ? community.ownerUid === uid ? "owner" : "member"
      : (ud.communityPending || []).includes(community.id) ? "pending" : "none";
    return { community, state };
  } catch (err) {
    console.error("fetchPromotedCommunity failed", err);
    return null;
  }
}

export async function fetchMembers(communityId, limit = 200) {
  const snap = await col().doc(communityId).collection("members").limit(limit).get();
  return snap.docs
    .map((d) => {
      const m = d.data();
      return { uid: d.id, username: m.username, role: m.role, a: m.a, b: m.b, joinedMs: m.joinedAt?.toMillis?.() ?? 0 };
    })
    .sort((x, y) => roleRank(y.role) - roleRank(x.role) || x.joinedMs - y.joinedMs);
}

export async function fetchRequests(communityId) {
  const snap = await col().doc(communityId).collection("requests").limit(100).get();
  return snap.docs
    .map((d) => {
      const r = d.data();
      return { uid: d.id, username: r.username, answers: r.answers || [], createdMs: r.createdAt?.toMillis?.() ?? 0, ago: timeAgo(r.createdAt?.toDate?.()) };
    })
    .sort((x, y) => x.createdMs - y.createdMs);
}

export async function fetchBans(communityId) {
  const snap = await col().doc(communityId).collection("bans").limit(100).get();
  return snap.docs.map((d) => ({ uid: d.id, username: d.data().username }));
}

export async function fetchCommunityPosts(communityId, uid) {
  const snap = await col().doc(communityId).collection("posts").orderBy("createdAt", "desc").limit(60).get();
  const posts = snap.docs.map((d) => {
    const p = d.data();
    return {
      id: d.id,
      uid: p.uid,
      user: p.user,
      role: p.role || "member",
      a: p.a || "#ff3d7f",
      b: p.b || "#7b2ff7",
      text: p.text || "",
      flair: p.flair || "discussion",
      imageCount: p.imageCount || 0,
      likes: (p.likedBy || []).length,
      liked: !!uid && (p.likedBy || []).includes(uid),
      pinned: !!p.pinned,
      createdMs: p.createdAt?.toMillis?.() ?? 0,
      timeAgo: timeAgo(p.createdAt?.toDate?.()),
    };
  });
  return posts.sort((x, y) => Number(y.pinned) - Number(x.pinned) || y.createdMs - x.createdMs);
}
