import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getTheme } from "@/lib/profile-themes";

// Follows:  follows/{fromUid}_{toUid}        { from, to, createdAt }
// Friends:  friendships/{lowerUid}_{higherUid}
//           { uids: [a, b], from, to, fromUsername, status: "pending" | "accepted",
//             createdAt, acceptedAt? }
// Following is one-way and instant. A friendship is two-way and needs the other
// person to accept. Counts are read with Firestore count queries, so nothing
// has to be kept in sync by hand.
export const FOLLOWS = "follows";
export const FRIENDSHIPS = "friendships";
export const MAX_FRIENDS = 500;
export const MAX_PENDING = 100;

export function followId(from, to) {
  return `${from}_${to}`;
}

export function friendshipId(a, b) {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

// Resolves a @handle to { uid, username, usernameLower } or null.
export async function findUserByUsername(db, username) {
  const lower = String(username || "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9_.]{3,20}$/.test(lower)) return null;
  const snap = await db
    .collection("users")
    .where("usernameLower", "==", lower)
    .limit(1)
    .get();
  const doc = snap.docs[0];
  if (!doc) return null;
  const d = doc.data();
  return { uid: doc.id, username: d.username || lower, prefs: d.prefs || null };
}

// "none" | "pending_out" (I asked) | "pending_in" (they asked me) | "friends"
export function friendState(data, viewerUid) {
  if (!data) return "none";
  if (data.status === "accepted") return "friends";
  return data.from === viewerUid ? "pending_out" : "pending_in";
}

async function countOf(query) {
  try {
    const snap = await query.count().get();
    return snap.data().count || 0;
  } catch {
    return 0;
  }
}

// { followers, following, friends } for any profile.
export async function getSocialCounts(uid) {
  const db = getAdminDb();
  const [followers, following, friendDocs] = await Promise.all([
    countOf(db.collection(FOLLOWS).where("to", "==", uid)),
    countOf(db.collection(FOLLOWS).where("from", "==", uid)),
    db
      .collection(FRIENDSHIPS)
      .where("uids", "array-contains", uid)
      .limit(MAX_FRIENDS + MAX_PENDING)
      .get()
      .catch(() => null),
  ]);
  // Filtered in memory so no composite index is needed.
  const friends = friendDocs
    ? friendDocs.docs.filter((d) => d.data().status === "accepted").length
    : 0;
  return { followers, following, friends };
}

// How the signed-in viewer stands with one other member.
export async function getRelationship(viewerUid, targetUid) {
  if (!viewerUid || !targetUid || viewerUid === targetUid) {
    return { following: false, followsMe: false, friend: "none" };
  }
  const db = getAdminDb();
  const [mine, theirs, fr] = await Promise.all([
    db.collection(FOLLOWS).doc(followId(viewerUid, targetUid)).get(),
    db.collection(FOLLOWS).doc(followId(targetUid, viewerUid)).get(),
    db.collection(FRIENDSHIPS).doc(friendshipId(viewerUid, targetUid)).get(),
  ]);
  return {
    following: mine.exists,
    followsMe: theirs.exists,
    friend: friendState(fr.exists ? fr.data() : null, viewerUid),
  };
}

// Pending friend requests sent to this member, newest first, with enough to
// draw a small row (name + accent colours).
export async function listIncomingRequests(uid) {
  const db = getAdminDb();
  const snap = await db
    .collection(FRIENDSHIPS)
    .where("to", "==", uid)
    .limit(MAX_PENDING)
    .get()
    .catch(() => null);
  if (!snap) return [];
  const pending = snap.docs
    .map((d) => d.data())
    .filter((d) => d.status === "pending")
    .sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  if (pending.length === 0) return [];

  const users = await db.getAll(
    ...pending.map((p) => db.collection("users").doc(p.from)),
    { fieldMask: ["username", "displayName", "theme", "hasAvatar", "updatedAt"] }
  );
  const out = [];
  for (const s of users) {
    if (!s.exists) continue;
    const d = s.data();
    const t = getTheme(d.theme || "vice");
    out.push({
      uid: s.id,
      username: d.username,
      displayName: d.displayName || d.username,
      a: t.a,
      b: t.b,
      hasAvatar: d.hasAvatar !== false,
      avatarV: d.updatedAt?.toMillis?.() ?? 0,
    });
  }
  return out;
}

// Uids this member follows (newest first), for the "Following" feed.
export async function getFollowingUids(uid, limit = 300) {
  if (!uid) return [];
  const snap = await getAdminDb()
    .collection(FOLLOWS)
    .where("from", "==", uid)
    .limit(limit)
    .get();
  return snap.docs.map((d) => d.data().to).filter(Boolean);
}

// The people behind a count: "followers" | "following" | "friends" (up to 100),
// each with enough to draw a row (name + accent colours + avatar).
export async function listPeople(uid, type) {
  const db = getAdminDb();
  let uids = [];
  if (type === "followers") {
    const snap = await db.collection(FOLLOWS).where("to", "==", uid).limit(100).get();
    uids = snap.docs.map((d) => d.data().from);
  } else if (type === "following") {
    const snap = await db.collection(FOLLOWS).where("from", "==", uid).limit(100).get();
    uids = snap.docs.map((d) => d.data().to);
  } else {
    const snap = await db
      .collection(FRIENDSHIPS)
      .where("uids", "array-contains", uid)
      .limit(MAX_FRIENDS + MAX_PENDING)
      .get();
    uids = snap.docs
      .map((d) => d.data())
      .filter((d) => d.status === "accepted")
      .map((d) => d.uids.find((u) => u !== uid))
      .slice(0, 100);
  }
  uids = [...new Set(uids.filter(Boolean))];
  if (uids.length === 0) return [];

  const users = await db.getAll(
    ...uids.map((u) => db.collection("users").doc(u)),
    { fieldMask: ["username", "displayName", "theme", "hasAvatar", "updatedAt"] }
  );
  const out = [];
  for (const s of users) {
    if (!s.exists || !s.data().username) continue;
    const d = s.data();
    const t = getTheme(d.theme || "vice");
    out.push({
      uid: s.id,
      username: d.username,
      displayName: d.displayName || d.username,
      a: t.a,
      b: t.b,
      hasAvatar: d.hasAvatar !== false,
      avatarV: d.updatedAt?.toMillis?.() ?? 0,
    });
  }
  return out;
}

export function now() {
  return Timestamp.now();
}
