import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { getTheme } from "@/lib/profile-themes";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";
import { normalizePrefs, USERNAME_RE } from "@/lib/settings";
import { messagingVerdict, verdictReason } from "@/lib/chat-config";
import { FOLLOWS, FRIENDSHIPS, followId, friendState, friendshipId } from "@/lib/social-data";

// The messaging side of "who is connected to whom". It does NOT own any social
// data: follows and friendships live in lib/social-data.js (collections
// `follows` and `friendships`, written by /api/social/follow and
// /api/social/friend). This file only READS them to decide who may message
// whom, and builds the people lists for the New message sheet.
//
//   follows/{from}_{to}              { from, to, createdAt }
//   friendships/{lowerUid}_{higherUid}
//        { uids:[a,b], from, to, fromUsername, status:"pending"|"accepted", ... }
//   inbox/{uid}  (messages only)     { unread, rev, pending:[convId], activeAt }
export const USERS = "users";
export const INBOX = "inbox";

export class HttpError extends Error {
  constructor(status, message, data) {
    super(message);
    this.status = status;
    this.data = data || null;
  }
}

// Same sorted-pair id the friendships use; chats are keyed the same way.
export const pairId = friendshipId;
export const inboxRef = (db, uid) => db.collection(INBOX).doc(uid);

export function cleanHandle(raw) {
  const n = String(raw ?? "").trim().replace(/^@/, "").toLowerCase();
  return USERNAME_RE.test(n) ? n : null;
}

const PERSON_FIELDS = [
  "username",
  "usernameLower",
  "displayName",
  "bio",
  "theme",
  "hasAvatar",
  "updatedAt",
  "plan",
  "prefs.account",
  "prefs.safety",
];

// What the browser may know about another member.
export function personFrom(uid, d) {
  const t = getTheme(d.theme);
  return {
    uid,
    username: d.username,
    displayName: d.displayName || d.username,
    bio: d.bio || "",
    a: t.a,
    b: t.b,
    hasAvatar: d.hasAvatar !== false,
    avatarV: d.updatedAt?.toMillis?.() ?? 0,
    plan: isPlanId(d.plan) ? d.plan : DEFAULT_PLAN,
  };
}

// A member plus their normalised prefs, as used by the permission checks.
function actorFrom(uid, d) {
  return { uid, username: d.username, prefs: normalizePrefs(d.prefs), person: personFrom(uid, d), raw: d };
}

export async function loadActor(db, uid) {
  const snap = await db.collection(USERS).doc(uid).get();
  if (!snap.exists) return null;
  return actorFrom(uid, snap.data());
}

export async function findActorByHandle(db, raw) {
  const name = cleanHandle(raw);
  if (!name) return null;
  const snap = await db.collection(USERS).where("usernameLower", "==", name).limit(1).get();
  const doc = snap.docs[0];
  return doc ? actorFrom(doc.id, doc.data()) : null;
}

export async function loadActors(db, uids) {
  const out = new Map();
  const list = [...new Set(uids)].filter(Boolean);
  for (let i = 0; i < list.length; i += 100) {
    const refs = list.slice(i, i + 100).map((u) => db.collection(USERS).doc(u));
    if (!refs.length) continue;
    const snaps = await db.getAll(...refs, { fieldMask: PERSON_FIELDS });
    for (const s of snaps) if (s.exists) out.set(s.id, actorFrom(s.id, s.data()));
  }
  return out;
}

// ---------------------------------------------------------- relations
export const NO_RELATION = Object.freeze({ following: false, followsYou: false, friend: "none" });

// Map(targetUid -> { following, followsYou, friend }) in one batched read.
// `friend` is "none" | "pending_out" | "pending_in" | "friends" (as in
// lib/social-data.js friendState).
export async function getRelations(db, meUid, targetUids) {
  const out = new Map();
  const list = [...new Set(targetUids)].filter((u) => u && u !== meUid);
  if (!list.length) return out;
  const refs = [];
  for (const t of list) {
    refs.push(db.collection(FOLLOWS).doc(followId(meUid, t)));
    refs.push(db.collection(FOLLOWS).doc(followId(t, meUid)));
    refs.push(db.collection(FRIENDSHIPS).doc(friendshipId(meUid, t)));
  }
  const snaps = [];
  for (let i = 0; i < refs.length; i += 300) {
    snaps.push(...(await db.getAll(...refs.slice(i, i + 300), { fieldMask: ["status", "from"] })));
  }
  list.forEach((t, i) => {
    const fr = snaps[i * 3 + 2];
    out.set(t, {
      following: snaps[i * 3].exists,
      followsYou: snaps[i * 3 + 1].exists,
      friend: friendState(fr.exists ? fr.data() : null, meUid),
    });
  });
  return out;
}

// Who has already written to `meUid` (so a reply is always allowed).
async function repliers(db, meUid, uids) {
  const out = new Set();
  const list = [...new Set(uids)].filter((u) => u && u !== meUid);
  if (!list.length) return out;
  const snaps = await db.getAll(
    ...list.map((u) => db.collection("conversations").doc(pairId(meUid, u))),
    { fieldMask: ["hasSent"] }
  );
  snaps.forEach((s, i) => {
    if (s.exists && s.data().hasSent?.[list[i]]) out.add(list[i]);
  });
  return out;
}

// ------------------------------------------------------ permissions
// Can `me` start / continue a chat with `target`? `conv` (optional) is the
// existing conversation document data.
export function evaluateMessaging({ me, target, rel, conv }) {
  if (me.uid === target.uid) return { ok: false, code: "self", reason: verdictReason("self", target.username), need: [] };
  const mine = target.username.toLowerCase();
  const theirs = me.username.toLowerCase();
  if (me.prefs.safety.blocked.includes(mine)) {
    return { ok: false, code: "youBlocked", reason: verdictReason("youBlocked", target.username), need: [] };
  }
  if (target.prefs.safety.blocked.includes(theirs)) {
    return { ok: false, code: "blockedBy", reason: verdictReason("blockedBy", target.username), need: [] };
  }
  const v = messagingVerdict({
    setting: target.prefs.safety.whoCanMessage,
    isFriend: rel.friend === "friends",
    senderFollowsTarget: rel.following,
    replyRight: !!conv?.hasSent?.[target.uid],
  });
  if (v.ok) return { ok: true, code: null, reason: null, need: [] };
  return { ok: false, code: v.code, reason: verdictReason(v.code, target.username), need: v.need };
}

// Fresh { rel, perm } for one relationship (used after follow / friend changes
// made through /api/social/*, so the Messages UI updates instantly).
export async function relationSnapshot(meUid, targetUid) {
  const db = getAdminDb();
  const [me, target] = await Promise.all([loadActor(db, meUid), loadActor(db, targetUid)]);
  if (!me || !target) throw new HttpError(404, "Member not found.");
  const [rels, reply] = await Promise.all([getRelations(db, meUid, [targetUid]), repliers(db, meUid, [targetUid])]);
  const rel = rels.get(targetUid) || NO_RELATION;
  const perm = evaluateMessaging({ me, target, rel, conv: reply.has(targetUid) ? { hasSent: { [targetUid]: true } } : null });
  return { rel, perm };
}

// What the profile page needs to draw its Message button. The button works
// out the verdict itself (so it reacts instantly when you Follow / Add friend),
// from this plus the live follow / friend state:
//   { setting, replyRight, blockedCode }
export async function getMessagingInfo(viewerUid, targetUid) {
  const db = getAdminDb();
  const [me, target] = await Promise.all([loadActor(db, viewerUid), loadActor(db, targetUid)]);
  if (!me || !target) return null;
  const reply = await repliers(db, viewerUid, [targetUid]);
  let blockedCode = null;
  if (me.prefs.safety.blocked.includes(target.username.toLowerCase())) blockedCode = "youBlocked";
  else if (target.prefs.safety.blocked.includes(me.username.toLowerCase())) blockedCode = "blockedBy";
  return { setting: target.prefs.safety.whoCanMessage, replyRight: reply.has(targetUid), blockedCode };
}

// Pending friend requests waiting for this member. A count query (cheap, and
// two equality filters need no composite index). Never throws.
export async function countPendingRequests(uid) {
  try {
    const snap = await getAdminDb()
      .collection(FRIENDSHIPS)
      .where("to", "==", uid)
      .where("status", "==", "pending")
      .count()
      .get();
    return snap.data().count || 0;
  } catch {
    return 0;
  }
}

// Blocking someone cuts every tie between you: follows both ways and any
// friendship or pending request.
export async function severTies(db, aUid, bUid) {
  const batch = db.batch();
  batch.delete(db.collection(FOLLOWS).doc(followId(aUid, bUid)));
  batch.delete(db.collection(FOLLOWS).doc(followId(bUid, aUid)));
  batch.delete(db.collection(FRIENDSHIPS).doc(friendshipId(aUid, bUid)));
  await batch.commit();
}

// ---------------------------------------------------- people lists
function row(actor, rel, perm) {
  return { ...actor.person, rel, perm };
}

// Friends, people you follow, and pending friend requests, each with whether
// you can message them. Used by the New message sheet.
export async function getCrew(meUid) {
  const db = getAdminDb();
  const me = await loadActor(db, meUid);
  if (!me) throw new HttpError(404, "Account not found.");

  const [followSnap, friendSnap, outSnap, inSnap] = await Promise.all([
    db.collection(FOLLOWS).where("from", "==", meUid).limit(150).get(),
    db.collection(FRIENDSHIPS).where("uids", "array-contains", meUid).limit(600).get(),
    db.collection(FRIENDSHIPS).where("from", "==", meUid).limit(150).get(),
    db.collection(FRIENDSHIPS).where("to", "==", meUid).limit(150).get(),
  ]);

  const otherOf = (d) => d.uids.find((u) => u !== meUid);
  const following = new Set(followSnap.docs.map((d) => d.data().to));
  const friends = new Set();
  for (const d of friendSnap.docs) {
    const data = d.data();
    if (data.status === "accepted" && Array.isArray(data.uids)) friends.add(otherOf(data));
  }
  const pendingOnly = (snap) => snap.docs.map((d) => d.data()).filter((d) => d.status === "pending");
  const incoming = pendingOnly(inSnap).map((d) => d.from);
  const outgoing = pendingOnly(outSnap).map((d) => d.to);

  const actors = await loadActors(db, [...following, ...friends, ...incoming, ...outgoing]);
  const reply = await repliers(db, meUid, [...following, ...friends]);

  const build = (uid) => {
    const target = actors.get(uid);
    if (!target) return null;
    if (me.prefs.safety.blocked.includes(target.username.toLowerCase())) return null;
    if (target.prefs.safety.blocked.includes(me.username.toLowerCase())) return null;
    const rel = { following: following.has(uid), followsYou: false, friend: friends.has(uid) ? "friends" : "none" };
    const perm = evaluateMessaging({ me, target, rel, conv: reply.has(uid) ? { hasSent: { [uid]: true } } : null });
    return row(target, rel, perm);
  };
  const byName = (a, b) => a.username.localeCompare(b.username);

  const requestRow = (uid, status) => {
    const target = actors.get(uid);
    if (!target) return null;
    if (target.prefs.safety.blocked.includes(me.username.toLowerCase())) return null;
    return row(target, { following: following.has(uid), followsYou: false, friend: status }, { ok: false, code: "none", need: [] });
  };

  return {
    friends: [...friends].map(build).filter(Boolean).sort(byName),
    following: [...following].filter((u) => !friends.has(u)).map(build).filter(Boolean).sort(byName),
    incoming: incoming.map((u) => requestRow(u, "pending_in")).filter(Boolean),
    outgoing: outgoing.map((u) => requestRow(u, "pending_out")).filter(Boolean),
  };
}

// Handle search for the New message sheet. Prefix match on the username.
// Members who switched off "Show me in search" (or are private) only come up
// when you type their exact handle or already have a tie with them.
export async function searchPeople(meUid, rawQuery) {
  const db = getAdminDb();
  const q = String(rawQuery ?? "").trim().replace(/^@/, "").toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 20);
  if (!q) return [];

  const me = await loadActor(db, meUid);
  if (!me) throw new HttpError(404, "Account not found.");

  const snap = await db
    .collection(USERS)
    .where("usernameLower", ">=", q)
    .where("usernameLower", "<=", `${q}\uf8ff`)
    .select(...PERSON_FIELDS)
    .limit(14)
    .get();

  const actors = snap.docs
    .filter((d) => d.id !== meUid)
    .map((d) => actorFrom(d.id, d.data()))
    .filter((a) => a.username)
    .filter((a) => !a.prefs.safety.blocked.includes(me.username.toLowerCase()))
    .filter((a) => !me.prefs.safety.blocked.includes(a.username.toLowerCase()))
    .slice(0, 10);

  const uids = actors.map((a) => a.uid);
  const [rels, reply] = await Promise.all([getRelations(db, meUid, uids), repliers(db, meUid, uids)]);

  const out = [];
  for (const target of actors) {
    const rel = rels.get(target.uid) || NO_RELATION;
    const exact = target.username.toLowerCase() === q;
    const hasTie = rel.following || rel.followsYou || rel.friend !== "none" || reply.has(target.uid);
    const findable = target.prefs.account.isPrivate !== true && target.prefs.safety.discoverable !== false;
    if (!(exact || hasTie || findable)) continue;
    const perm = evaluateMessaging({ me, target, rel, conv: reply.has(target.uid) ? { hasSent: { [target.uid]: true } } : null });
    out.push({ ...row(target, rel, perm), exact });
  }

  const rank = (r) => (r.exact ? 0 : r.rel.friend === "friends" ? 1 : r.rel.following ? 2 : 3);
  out.sort((a, b) => rank(a) - rank(b) || a.username.localeCompare(b.username));
  return out;
}
