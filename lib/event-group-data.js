import "server-only";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { cleanText } from "@/lib/post-schema";
import { GROUP_LIMITS, groupAccess, newGroupDoc } from "@/lib/event-group";
import { eventPhase, serializeEvent } from "@/lib/event-rules";

// Firestore reads and writes for event group chats. The rules themselves live
// in lib/event-group.js. Everything goes through the Admin SDK, so the browser
// never touches these collections directly.

export class GroupError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const groupRef = (db, postId) => db.collection("eventGroups").doc(postId);
const postRef = (db, postId) => db.collection("posts").doc(postId);
const ms = (t) => (typeof t?.toMillis === "function" ? t.toMillis() : null);

// The event post, or a 404 for anything the viewer isn't allowed to know about
// (same visibility rules as RSVPs: private and scheduled events are host-only).
function eventPost(snap, uid) {
  const data = snap.exists ? snap.data() : null;
  if (!data || data.type !== "event" || !data.event) throw new GroupError(404, "That event is gone.");
  const isHost = !!uid && data.uid === uid;
  if (data.settings?.visibility === "private" && !isHost) throw new GroupError(404, "That event is gone.");
  if ((ms(data.createdAt) ?? 0) > Date.now() && !isHost) throw new GroupError(404, "That event is gone.");
  return data;
}

function groupFor(postId, data, snap) {
  return snap.exists
    ? snap.data()
    : newGroupDoc({ postId, hostUid: data.uid, hostName: data.user, title: data.title });
}

function accessFor(data, group, uid) {
  const members = group.members || {};
  const guests = Object.values(members).filter((m) => m.r !== "admin").length;
  const access = groupAccess({
    ev: data.event,
    hostUid: data.uid,
    uid,
    member: uid ? members[uid] || null : null,
    banned: !!(uid && group.banned?.[uid]),
    guests,
    going: !!(uid && data.event.rsvps?.[uid]?.s === "going"),
    gone: group.deleted === true,
  });
  return { ...access, guests, members: Object.keys(members).length };
}

const read = (tx, ref) => (tx ? tx.get(ref) : ref.get());

// The group as this viewer sees it, plus the latest messages (none when locked).
export async function readGroup(uid, postId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  const [psnap, gsnap] = await Promise.all([postRef(db, postId).get(), gref.get()]);
  const data = eventPost(psnap, uid);

  let group = groupFor(postId, data, gsnap);
  if (!gsnap.exists) {
    // Events made before groups existed get theirs the first time it's opened.
    try {
      await gref.create(group);
    } catch {
      group = (await gref.get()).data() || group;
    }
  }

  const access = accessFor(data, group, uid);
  let messages = [];
  if (!access.locked && !access.gone) {
    const snap = await gref.collection("messages").orderBy("createdAt", "desc").limit(GROUP_LIMITS.page).get();
    messages = snap.docs
      .reverse()
      .map((d) => {
        const m = d.data();
        return {
          id: d.id,
          user: m.user,
          at: ms(m.createdAt),
          mine: !!uid && m.uid === uid,
          host: m.uid === group.hostUid,
          deleted: !!m.deleted,
          text: m.deleted ? "" : m.text || "",
          ...(access.isAdmin ? { uid: m.uid } : {}),
        };
      });
  }
  return {
    // The event as this viewer sees it (so the panel's status and countdown
    // follow the host ending the event), and its name for the panel header.
    event: serializeEvent(data, { uid, isOwner: access.isAdmin }),
    group: {
      ...access,
      host: group.host,
      title: data.title || "",
      // Only the admin gets the member list (to remove someone).
      people: access.isAdmin && !access.gone
        ? Object.entries(group.members || {})
            .filter(([, m]) => m.r !== "admin")
            .map(([id, m]) => ({ uid: id, user: m.u }))
        : undefined,
    },
    messages,
  };
}

export async function joinGroup(user, postId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  await db.runTransaction(async (tx) => {
    const [psnap, gsnap] = await Promise.all([tx.get(postRef(db, postId)), tx.get(gref)]);
    const data = eventPost(psnap, user.uid);
    const group = groupFor(postId, data, gsnap);
    const access = accessFor(data, group, user.uid);
    if (access.isMember) return;
    if (!access.canJoin) throw new GroupError(403, access.note || "You can’t join this group.");
    if (access.members >= GROUP_LIMITS.members) throw new GroupError(409, "The group is full.");
    const entry = { u: user.username, r: "member", t: Date.now(), l: 0 };
    if (gsnap.exists) tx.update(gref, new FieldPath("members", user.uid), entry);
    else tx.set(gref, { ...group, members: { ...group.members, [user.uid]: entry } });
  });
}

export async function leaveGroup(user, postId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  await db.runTransaction(async (tx) => {
    const [psnap, gsnap] = await Promise.all([tx.get(postRef(db, postId)), tx.get(gref)]);
    const data = eventPost(psnap, user.uid);
    if (data.uid === user.uid) throw new GroupError(409, "You’re the admin, so you can’t leave your own group.");
    if (gsnap.exists && gsnap.data().members?.[user.uid]) {
      tx.update(gref, new FieldPath("members", user.uid), FieldValue.delete());
    }
  });
}

export async function sendGroupMessage(user, postId, rawText) {
  const text = cleanText(rawText, GROUP_LIMITS.text * 2).replace(/\n{2,}/g, "\n").slice(0, GROUP_LIMITS.text);
  if (!text) throw new GroupError(400, "Write something first.");
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  await db.runTransaction(async (tx) => {
    const [psnap, gsnap] = await Promise.all([tx.get(postRef(db, postId)), tx.get(gref)]);
    const data = eventPost(psnap, user.uid);
    const group = groupFor(postId, data, gsnap);
    const access = accessFor(data, group, user.uid);
    if (!access.canWrite) {
      throw new GroupError(
        403,
        access.gone
          ? "The host deleted this group."
          : access.locked
            ? "This group is for ticket holders."
            : "Join the group to write in it."
      );
    }
    const now = Date.now();
    const mine = group.members?.[user.uid];
    if (mine && now - (mine.l || 0) < GROUP_LIMITS.cooldownMs) {
      throw new GroupError(429, "Slow down a little.");
    }
    if (gsnap.exists) {
      tx.update(gref, new FieldPath("members", user.uid, "l"), now);
    } else {
      // An old event whose group hasn't been created yet: create it with this
      // message's timestamp already on the author's entry.
      tx.set(gref, { ...group, members: { ...group.members, [user.uid]: { ...group.members[user.uid], l: now } } });
    }
    tx.set(gref.collection("messages").doc(), {
      uid: user.uid,
      user: user.username,
      text,
      createdAt: Timestamp.fromMillis(now),
      deleted: false,
    });
  });
}

// The author, or the admin, removes a message (it stays as "Message removed").
export async function deleteGroupMessage(user, postId, messageId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  const data = eventPost(await postRef(db, postId).get(), user.uid);
  const mref = gref.collection("messages").doc(messageId);
  const msnap = await mref.get();
  if (!msnap.exists) return;
  if (msnap.data().uid !== user.uid && data.uid !== user.uid) throw new GroupError(403, "That isn’t your message.");
  await mref.update({ deleted: true, text: "" });
}

// Admin only: takes someone out and stops them coming back.
export async function removeGroupMember(user, postId, targetUid) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  await db.runTransaction(async (tx) => {
    const [psnap, gsnap] = await Promise.all([tx.get(postRef(db, postId)), tx.get(gref)]);
    const data = eventPost(psnap, user.uid);
    if (data.uid !== user.uid) throw new GroupError(403, "Only the admin can do that.");
    if (targetUid === data.uid) throw new GroupError(409, "You can’t remove yourself.");
    if (!gsnap.exists || gsnap.data().deleted) return;
    tx.update(
      gref,
      new FieldPath("members", targetUid),
      FieldValue.delete(),
      new FieldPath("banned", targetUid),
      true
    );
  });
}

// --- host controls ----------------------------------------------------------

function hostOnly(snap, user, what) {
  const data = eventPost(snap, user.uid);
  if (data.uid !== user.uid) throw new GroupError(403, `Only the host can ${what}.`);
  return data;
}

// Host only: calls the event over right now. It shows as "ended" everywhere
// (feed, events page, the group panel), nobody new can join, and the group
// stays open for people to keep chatting. Works before the event has started
// too (that's how a host calls it off). Ending it twice does nothing.
export async function endEvent(user, postId) {
  const db = getAdminDb();
  const ref = postRef(db, postId);
  await db.runTransaction(async (tx) => {
    const data = hostOnly(await tx.get(ref), user, "end the event");
    const ev = data.event;
    const phase = eventPhase(ms(ev.startsAt), ms(ev.endsAt), Date.now(), ms(ev.closedAt));
    if (phase === "ended") return;
    tx.update(ref, new FieldPath("event", "closedAt"), Timestamp.now());
  });
}

// Host only: wipes every message and shuts the group. The doc stays behind as a
// small "deleted" marker so readGroup doesn't quietly rebuild it, and so
// members see why it's gone. The event itself is untouched.
export async function deleteGroup(user, postId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  const data = hostOnly(await postRef(db, postId).get(), user, "delete the group");
  await db.recursiveDelete(gref.collection("messages"));
  await gref.set({
    ...newGroupDoc({ postId, hostUid: data.uid, hostName: data.user, title: data.title }),
    deleted: true,
    deletedMs: Date.now(),
  });
}

// Host only: opens a brand new, empty group after the old one was deleted.
export async function startNewGroup(user, postId) {
  const db = getAdminDb();
  const gref = groupRef(db, postId);
  const [psnap, gsnap] = await Promise.all([postRef(db, postId).get(), gref.get()]);
  const data = hostOnly(psnap, user, "start a group");
  if (gsnap.exists && !gsnap.data().deleted) return;
  await gref.set(newGroupDoc({ postId, hostUid: data.uid, hostName: data.user, title: data.title }));
}
