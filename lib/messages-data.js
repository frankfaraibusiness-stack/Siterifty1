import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { CHAT_LIMITS, EMOJI_IDS, cleanBlock, sanitizeMessage, snippetFor } from "@/lib/chat-config";
import {
  HttpError,
  NO_RELATION,
  evaluateMessaging,
  findActorByHandle,
  getRelations,
  inboxRef,
  loadActor,
  loadActors,
  countPendingRequests,
  pairId,
} from "@/lib/chat-social";

// Firestore layout (Admin SDK only, no composite indexes):
//
//   conversations/{uidA}_{uidB}   (ids sorted)
//     { users:[a,b], names:{uid:handle}, createdAt, updatedAt,
//       last:{ id, from, type, text, at, deleted, delivered, seen },
//       unread:{uid:n}, hasSent:{uid:true}, pinned:{uid:bool}, muted:{uid:bool},
//       clearedAt:{uid:ms}, hideLast:{uid:msgId}, typing:{uid:ms}, sentAt:{uid:ms} }
//   conversations/{id}/messages/{msgId}
//     { from, to, fromName, type, text, sticker, invite, code, meetup, media,
//       replyTo, replyId, rx:{uid:emojiId}, createdAt, updatedAt,
//       deliveredAt, seenAt, readAt, editedAt, deleted, deletedAt, hiddenFor:[uid], clientId }
//   conversations/{id}/media/{msgId}  { data (base64 jpeg), mime }
//   inbox/{uid}  { unread, rev, pending:[convId], activeAt }   (friend requests are
//                counted live from the `friendships` collection, see chat-social.js)
//
// Delivery model (polling, no sockets): a message is "delivered" the moment
// the recipient's open site next checks in (GET /api/messages/summary, which
// runs on every page), and "seen" when they open the chat. `inbox/{uid}.rev`
// changes whenever the chat list changes, so clients only reload the list
// when it actually moved.

const convs = (db) => db.collection("conversations");
export const convRef = (db, id) => convs(db).doc(id);
const msgsRef = (db, id) => convRef(db, id).collection("messages");
const mediaRef = (db, id, msgId) => convRef(db, id).collection("media").doc(msgId);

const ms = (ts) => ts?.toMillis?.() ?? null;
const ONLINE_MS = 90_000;
const TYPING_MS = 6_000;
const POLL_OVERLAP_MS = 3_000;

export function membersOf(id) {
  if (typeof id !== "string") return null;
  const parts = id.split("_");
  if (parts.length !== 2 || !parts.every((p) => /^[A-Za-z0-9-]{6,128}$/.test(p))) return null;
  return parts;
}

function assertMember(id, uid) {
  const m = membersOf(id);
  if (!m || !m.includes(uid)) throw new HttpError(404, "Chat not found.");
  return m;
}

const peerOf = (id, uid) => membersOf(id).find((u) => u !== uid);

// ------------------------------------------------------------ mapping
export function mapMessage(id, d, meUid) {
  if (d.hiddenFor?.includes(meUid)) return { id, gone: true, updatedAt: ms(d.updatedAt) };
  const mine = d.from === meUid;
  let theirs = null;
  for (const [uid, emoji] of Object.entries(d.rx || {})) if (uid !== meUid) theirs = emoji;
  const base = {
    id,
    mine,
    type: d.type,
    createdAt: ms(d.createdAt),
    updatedAt: ms(d.updatedAt),
    clientId: mine ? d.clientId || null : null,
    deleted: !!d.deleted,
    rx: { mine: d.rx?.[meUid] || null, theirs },
  };
  if (d.deleted) return base;
  return {
    ...base,
    text: d.text || "",
    sticker: d.sticker || null,
    invite: d.invite || null,
    code: d.code || null,
    meetup: d.meetup || null,
    media: d.media || null,
    replyTo: d.replyTo || null,
    edited: !!d.editedAt,
    ...(mine
      ? {
          state: d.seenAt ? "seen" : d.deliveredAt ? "delivered" : "sent",
          deliveredAt: ms(d.deliveredAt),
          seenAt: ms(d.seenAt),
        }
      : {}),
  };
}

function previewOf(d, meUid) {
  const last = d.last;
  if (!last) return "";
  if (d.hideLast?.[meUid] === last.id) return "Message removed";
  if (last.deleted) return last.from === meUid ? "You deleted a message" : "This message was deleted";
  return last.text || "";
}

const isOnline = (activeAt, now) => !!activeAt && now - activeAt < ONLINE_MS;

// ------------------------------------------------------ chat list
export async function listConversations(meUid) {
  const db = getAdminDb();
  const iref = inboxRef(db, meUid);
  const [me, snap, inboxSnap] = await Promise.all([
    loadActor(db, meUid),
    convs(db).where("users", "array-contains", meUid).limit(CHAT_LIMITS.listMax).get(),
    iref.get(),
  ]);
  if (!me) throw new HttpError(404, "Account not found.");
  const rev = inboxSnap.data()?.rev || 0;
  const blocked = new Set(me.prefs.safety.blocked);

  const rows = [];
  for (const doc of snap.docs) {
    const d = doc.data();
    if (!d.last || !Array.isArray(d.users)) continue;
    if (d.last.at <= (d.clearedAt?.[meUid] || 0)) continue;
    rows.push({ id: doc.id, d, peerUid: d.users.find((u) => u !== meUid) });
  }

  const peerUids = rows.map((r) => r.peerUid);
  const actors = await loadActors(db, peerUids);
  const presence = new Map();
  if (peerUids.length) {
    const snaps = await db.getAll(...peerUids.map((u) => inboxRef(db, u)), { fieldMask: ["activeAt"] });
    snaps.forEach((s, i) => presence.set(peerUids[i], s.data()?.activeAt || 0));
  }

  const now = Date.now();
  let unreadTotal = 0;
  const items = [];
  for (const { id, d, peerUid } of rows) {
    const peer = actors.get(peerUid);
    if (!peer || blocked.has(peer.username.toLowerCase())) continue;
    const unread = d.unread?.[meUid] || 0;
    const muted = !!d.muted?.[meUid];
    if (!muted) unreadTotal += unread;
    const showOnline = me.prefs.safety.showOnline && peer.prefs.safety.showOnline;
    items.push({
      id,
      peer: peer.person,
      last: {
        text: previewOf(d, meUid),
        type: d.last.type,
        mine: d.last.from === meUid,
        at: d.last.at,
        deleted: !!d.last.deleted,
        delivered: !!d.last.delivered,
        seen: !!d.last.seen,
      },
      unread,
      pinned: !!d.pinned?.[meUid],
      muted,
      online: showOnline ? isOnline(presence.get(peerUid), now) : null,
    });
  }
  items.sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.last.at - a.last.at);

  // Self-heal the badge counter.
  iref.set({ unread: unreadTotal }, { merge: true }).catch(() => {});
  return { conversations: items, unread: unreadTotal, rev, serverNow: now };
}

// ------------------------------------------------------ one thread
// q: { id | with, since, before, read, meta }
export async function getThread(user, q) {
  const db = getAdminDb();
  const meUid = user.uid;
  const serverNow = Date.now();

  let peerUid;
  let convId;
  let peerActor = null;
  if (q.id) {
    assertMember(q.id, meUid);
    convId = q.id;
    peerUid = peerOf(q.id, meUid);
  } else {
    peerActor = await findActorByHandle(db, q.with);
    if (!peerActor) throw new HttpError(404, "Nobody in Leonida goes by that handle.");
    if (peerActor.uid === meUid) throw new HttpError(400, "That’s you.");
    peerUid = peerActor.uid;
    convId = pairId(meUid, peerUid);
  }

  const isPoll = q.since != null && Number.isFinite(q.since);
  const wantMeta = !isPoll || q.meta;
  const cref = convRef(db, convId);
  const csnap = await cref.get();
  const conv = csnap.exists ? csnap.data() : null;
  const cleared = conv?.clearedAt?.[meUid] || 0;

  // ---- messages
  let docs = [];
  let hasMore = false;
  if (conv) {
    const col = msgsRef(db, convId);
    if (isPoll) {
      const snap = await col
        .where("updatedAt", ">", Timestamp.fromMillis(Math.max(0, q.since - POLL_OVERLAP_MS)))
        .orderBy("updatedAt", "asc")
        .limit(100)
        .get();
      docs = snap.docs.filter((d) => (ms(d.data().createdAt) || 0) > cleared);
    } else {
      let query = col;
      if (q.before) query = query.where("createdAt", "<", Timestamp.fromMillis(q.before));
      if (cleared) query = query.where("createdAt", ">", Timestamp.fromMillis(cleared));
      const snap = await query.orderBy("createdAt", "desc").limit(CHAT_LIMITS.page + 1).get();
      hasMore = snap.docs.length > CHAT_LIMITS.page;
      docs = snap.docs.slice(0, CHAT_LIMITS.page).reverse();
    }
  }
  let messages = docs.map((d) => mapMessage(d.id, d.data(), meUid));
  if (!isPoll) messages = messages.filter((m) => !m.gone);

  // ---- opening the chat: mark incoming messages delivered + read
  const unreadBefore = conv?.unread?.[meUid] || 0;
  if (q.read && conv && unreadBefore > 0) {
    const un = await msgsRef(db, convId).where("to", "==", meUid).where("readAt", "==", null).limit(100).get();
    const me = await loadActor(db, meUid);
    const receipts = me ? me.prefs.safety.readReceipts : true;
    const now = Timestamp.now();
    const batch = db.batch();
    let lastHit = false;
    for (const d of un.docs) {
      const patch = { readAt: now, updatedAt: now };
      if (!d.data().deliveredAt) patch.deliveredAt = now;
      if (receipts) patch.seenAt = now;
      batch.update(d.ref, patch);
      if (conv.last?.id === d.id) lastHit = true;
    }
    const cpatch = { [`unread.${meUid}`]: 0 };
    if (lastHit) {
      cpatch["last.delivered"] = true;
      if (receipts) cpatch["last.seen"] = true;
    }
    batch.update(cref, cpatch);
    const muted = !!conv.muted?.[meUid];
    batch.set(inboxRef(db, meUid), { unread: FieldValue.increment(muted ? 0 : -unreadBefore) }, { merge: true });
    batch.set(inboxRef(db, peerUid), { rev: now.toMillis() }, { merge: true });
    await batch.commit();
  }

  // ---- response
  const typing = !!(conv?.typing?.[peerUid] && serverNow - conv.typing[peerUid] < TYPING_MS);
  const out = {
    id: convId,
    messages,
    hasMore,
    typing,
    unread: isPoll ? undefined : unreadBefore,
    cursor: isPoll ? Math.max(q.since, ...messages.map((m) => m.updatedAt || 0)) : serverNow,
    serverNow,
  };

  if (wantMeta) {
    const [me, target] = await Promise.all([
      loadActor(db, meUid),
      peerActor || loadActor(db, peerUid),
    ]);
    if (!me || !target) throw new HttpError(404, "Member not found.");
    const [rels, presenceSnap] = await Promise.all([
      getRelations(db, meUid, [peerUid]),
      inboxRef(db, peerUid).get(),
    ]);
    const rel = rels.get(peerUid) || NO_RELATION;
    const perm = evaluateMessaging({ me, target, rel, conv });
    const showOnline = me.prefs.safety.showOnline && target.prefs.safety.showOnline;
    const activeAt = presenceSnap.data()?.activeAt || 0;
    out.peer = {
      ...target.person,
      online: showOnline ? isOnline(activeAt, serverNow) : null,
      activeAt: showOnline && activeAt ? activeAt : null,
    };
    out.rel = rel;
    out.perm = perm;
    out.pinned = !!conv?.pinned?.[meUid];
    out.muted = !!conv?.muted?.[meUid];
    out.me = { uid: meUid, username: me.username, readReceipts: me.prefs.safety.readReceipts };
  }
  return out;
}

// ------------------------------------------------------- sending
export async function sendMessage(user, body) {
  const db = getAdminDb();
  const [me, target] = await Promise.all([loadActor(db, user.uid), findActorByHandle(db, body?.to)]);
  if (!me) throw new HttpError(401, "Sign in first.");
  if (!target) throw new HttpError(404, "Nobody in Leonida goes by that handle.");

  const convId = pairId(me.uid, target.uid);
  const cref = convRef(db, convId);
  const [csnap, rels] = await Promise.all([cref.get(), getRelations(db, me.uid, [target.uid])]);
  const conv = csnap.exists ? csnap.data() : null;
  const rel = rels.get(target.uid) || NO_RELATION;

  const perm = evaluateMessaging({ me, target, rel, conv });
  if (!perm.ok) throw new HttpError(403, perm.reason, { perm });

  const lastSent = conv?.sentAt?.[me.uid] || 0;
  if (Date.now() - lastSent < 300) throw new HttpError(429, "Slow down a little.");

  const clean = sanitizeMessage(body);
  if (!clean.ok) throw new HttpError(400, clean.error);

  // Idempotent retries: the same clientId always maps to the same message.
  const clientId = /^[a-z0-9]{10,26}$/.test(String(body.clientId || "")) ? String(body.clientId) : null;
  const col = msgsRef(db, convId);
  const msgRef = clientId ? col.doc(`c${clientId}`) : col.doc();
  if (clientId) {
    const existing = await msgRef.get();
    if (existing.exists) return { message: mapMessage(msgRef.id, existing.data(), me.uid), perm };
  }

  // Quote
  let replyTo = null;
  if (body.replyTo && typeof body.replyTo === "string") {
    const o = await col.doc(body.replyTo.slice(0, 60)).get();
    if (o.exists) {
      const od = o.data();
      if (!od.deleted && !od.hiddenFor?.includes(me.uid)) {
        replyTo = {
          id: o.id,
          from: od.from,
          name: od.fromName,
          type: od.type,
          snippet: snippetFor(od.type, od),
          deleted: false,
        };
      }
    }
  }

  const now = Timestamp.now();
  const nowMs = now.toMillis();
  const doc = {
    from: me.uid,
    to: target.uid,
    fromName: me.username,
    type: clean.type,
    text: "",
    sticker: null,
    invite: null,
    code: null,
    meetup: null,
    media: null,
    ...clean.fields,
    replyTo,
    replyId: replyTo?.id || null,
    rx: {},
    createdAt: now,
    updatedAt: now,
    deliveredAt: null,
    seenAt: null,
    readAt: null,
    editedAt: null,
    deleted: false,
    deletedAt: null,
    hiddenFor: [],
    clientId,
  };

  const muted = !!conv?.muted?.[target.uid];
  const cpatch = {
    users: [me.uid, target.uid].sort(),
    names: { [me.uid]: me.username, [target.uid]: target.username },
    updatedAt: now,
    last: {
      id: msgRef.id,
      from: me.uid,
      type: clean.type,
      text: snippetFor(clean.type, clean.fields),
      at: nowMs,
      deleted: false,
      delivered: false,
      seen: false,
    },
    hasSent: { [me.uid]: true },
    unread: { [target.uid]: FieldValue.increment(1) },
    sentAt: { [me.uid]: nowMs },
    typing: { [me.uid]: 0 },
  };
  if (!conv) cpatch.createdAt = now;

  const batch = db.batch();
  batch.create(msgRef, doc);
  batch.set(cref, cpatch, { merge: true });
  if (clean.image) batch.set(mediaRef(db, convId, msgRef.id), { data: clean.image, mime: "image/jpeg", createdAt: now });
  batch.set(
    inboxRef(db, target.uid),
    { unread: FieldValue.increment(muted ? 0 : 1), pending: FieldValue.arrayUnion(convId), rev: nowMs },
    { merge: true }
  );
  batch.set(inboxRef(db, me.uid), { rev: nowMs }, { merge: true });
  await batch.commit();

  return { message: mapMessage(msgRef.id, doc, me.uid), perm };
}

// ------------------------------------------------ message actions
async function assertNotBlocked(db, meUid, peerUid) {
  const actors = await loadActors(db, [meUid, peerUid]);
  const me = actors.get(meUid);
  const peer = actors.get(peerUid);
  if (!me || !peer) throw new HttpError(404, "Member not found.");
  if (me.prefs.safety.blocked.includes(peer.username.toLowerCase())) throw new HttpError(403, "You blocked this person.");
  if (peer.prefs.safety.blocked.includes(me.username.toLowerCase())) throw new HttpError(403, "You can’t do that here.");
}

// body: { convId, id, action: "react" | "edit" | "delete", emoji?, text?, scope? }
export async function messageAction(user, body) {
  const db = getAdminDb();
  const meUid = user.uid;
  const convId = String(body?.convId || "");
  assertMember(convId, meUid);
  const id = String(body?.id || "").slice(0, 60);
  if (!id) throw new HttpError(400, "Missing message.");

  const cref = convRef(db, convId);
  const mref = msgsRef(db, convId).doc(id);
  const [msnap, csnap] = await Promise.all([mref.get(), cref.get()]);
  if (!msnap.exists || !csnap.exists) throw new HttpError(404, "Message not found.");
  const m = msnap.data();
  const conv = csnap.data();
  if (m.hiddenFor?.includes(meUid)) throw new HttpError(404, "Message not found.");
  const now = Timestamp.now();
  const nowMs = now.toMillis();
  const peerUid = peerOf(convId, meUid);

  switch (body.action) {
    case "react": {
      if (m.deleted) throw new HttpError(409, "That message was deleted.");
      const emoji = body.emoji == null ? null : String(body.emoji);
      if (emoji && !EMOJI_IDS.has(emoji)) throw new HttpError(400, "Unknown reaction.");
      if (emoji) await assertNotBlocked(db, meUid, peerUid);
      await mref.update({ [`rx.${meUid}`]: emoji || FieldValue.delete(), updatedAt: now });
      return { ok: true };
    }

    case "edit": {
      if (m.from !== meUid) throw new HttpError(403, "You can only edit your own messages.");
      if (m.deleted || m.type !== "text") throw new HttpError(409, "That message can’t be edited.");
      if (nowMs - ms(m.createdAt) > CHAT_LIMITS.editMinutes * 60_000) {
        throw new HttpError(409, `Messages can only be edited for ${CHAT_LIMITS.editMinutes} minutes.`);
      }
      const text = cleanBlock(body.text, CHAT_LIMITS.text);
      if (!text) throw new HttpError(400, "A message can’t be empty.");
      const batch = db.batch();
      batch.update(mref, { text, editedAt: now, updatedAt: now });
      if (conv.last?.id === id) batch.update(cref, { "last.text": snippetFor("text", { text }) });
      await batch.commit();
      return { ok: true };
    }

    case "delete": {
      if (body.scope === "all") {
        if (m.from !== meUid) throw new HttpError(403, "You can only delete your own messages for everyone.");
        if (m.deleted) return { ok: true };
        const batch = db.batch();
        batch.update(mref, {
          deleted: true,
          deletedAt: now,
          updatedAt: now,
          text: "",
          sticker: null,
          invite: null,
          code: null,
          meetup: null,
          media: null,
          replyTo: null,
          replyId: null,
          rx: {},
        });
        if (m.type === "image") batch.delete(mediaRef(db, convId, id));

        // Quotes of this message stop showing its content.
        const quotes = await msgsRef(db, convId).where("replyId", "==", id).limit(100).get();
        for (const q of quotes.docs) batch.update(q.ref, { "replyTo.snippet": "", "replyTo.deleted": true, updatedAt: now });

        const cpatch = {};
        if (conv.last?.id === id) {
          cpatch["last.deleted"] = true;
          cpatch["last.text"] = "";
        }
        if (!m.readAt && (conv.unread?.[m.to] || 0) > 0) {
          cpatch[`unread.${m.to}`] = FieldValue.increment(-1);
          if (!conv.muted?.[m.to]) batch.set(inboxRef(db, m.to), { unread: FieldValue.increment(-1) }, { merge: true });
        }
        if (Object.keys(cpatch).length) batch.update(cref, cpatch);
        batch.set(inboxRef(db, peerUid), { rev: nowMs }, { merge: true });
        batch.set(inboxRef(db, meUid), { rev: nowMs }, { merge: true });
        await batch.commit();
        return { ok: true };
      }

      // "me": only hides it from your own view.
      const batch = db.batch();
      batch.update(mref, { hiddenFor: FieldValue.arrayUnion(meUid), updatedAt: now });
      if (conv.last?.id === id) batch.update(cref, { [`hideLast.${meUid}`]: id });
      batch.set(inboxRef(db, meUid), { rev: nowMs }, { merge: true });
      await batch.commit();
      return { ok: true };
    }

    default:
      throw new HttpError(400, "Unknown action.");
  }
}

// ------------------------------------------- chat-level actions
// body: { convId, action: "pin" | "unpin" | "mute" | "unmute" | "delete" }
export async function conversationAction(user, body) {
  const db = getAdminDb();
  const meUid = user.uid;
  const convId = String(body?.convId || "");
  assertMember(convId, meUid);
  const cref = convRef(db, convId);
  const snap = await cref.get();
  if (!snap.exists) throw new HttpError(404, "Chat not found.");
  const conv = snap.data();
  const unread = conv.unread?.[meUid] || 0;
  const muted = !!conv.muted?.[meUid];
  const nowMs = Date.now();
  const batch = db.batch();
  const iref = inboxRef(db, meUid);

  switch (body.action) {
    case "pin":
    case "unpin":
      batch.update(cref, { [`pinned.${meUid}`]: body.action === "pin" });
      break;
    case "mute":
      if (!muted) {
        batch.update(cref, { [`muted.${meUid}`]: true });
        if (unread) batch.set(iref, { unread: FieldValue.increment(-unread) }, { merge: true });
      }
      break;
    case "unmute":
      if (muted) {
        batch.update(cref, { [`muted.${meUid}`]: false });
        if (unread) batch.set(iref, { unread: FieldValue.increment(unread) }, { merge: true });
      }
      break;
    case "delete":
      batch.update(cref, { [`clearedAt.${meUid}`]: nowMs, [`unread.${meUid}`]: 0, [`pinned.${meUid}`]: false });
      if (unread && !muted) batch.set(iref, { unread: FieldValue.increment(-unread) }, { merge: true });
      break;
    default:
      throw new HttpError(400, "Unknown action.");
  }
  batch.set(iref, { rev: nowMs }, { merge: true });
  await batch.commit();
  return { ok: true };
}

export async function setTyping(user, convId) {
  assertMember(convId, user.uid);
  try {
    await convRef(getAdminDb(), convId).update({ [`typing.${user.uid}`]: Date.now() });
  } catch {
    // No chat yet (first message not sent): nothing to mark.
  }
}

// --------------------------------------------- inbox + delivery
async function deliverPending(db, meUid, convIds) {
  await Promise.all(
    convIds.map(async (id) => {
      const members = membersOf(id);
      if (!members?.includes(meUid)) return;
      const snap = await msgsRef(db, id).where("to", "==", meUid).where("deliveredAt", "==", null).limit(100).get();
      if (snap.empty) return;
      const now = Timestamp.now();
      const csnap = await convRef(db, id).get();
      const lastId = csnap.data()?.last?.id;
      const batch = db.batch();
      let lastHit = false;
      for (const d of snap.docs) {
        batch.update(d.ref, { deliveredAt: now, updatedAt: now });
        if (d.id === lastId) lastHit = true;
      }
      if (lastHit) batch.update(convRef(db, id), { "last.delivered": true });
      batch.set(inboxRef(db, members.find((u) => u !== meUid)), { rev: now.toMillis() }, { merge: true });
      await batch.commit();
    })
  );
}

// The cheap check-in every open page makes: reads one document, marks any
// waiting messages "delivered", and (when asked) records that you're online.
export async function getSummary(user, { ping = false } = {}) {
  const db = getAdminDb();
  const iref = inboxRef(db, user.uid);
  const [snap, requests] = await Promise.all([iref.get(), countPendingRequests(user.uid)]);
  const d = snap.data() || {};
  const pending = Array.isArray(d.pending) ? d.pending.slice(0, 12) : [];

  const patch = {};
  if (pending.length) patch.pending = FieldValue.arrayRemove(...pending);
  if (ping) patch.activeAt = Date.now();
  if (Object.keys(patch).length) await iref.set(patch, { merge: true });
  // Removed first, so a message that lands mid-run re-adds its chat.
  if (pending.length) await deliverPending(db, user.uid, pending);

  return {
    unread: Math.max(0, d.unread || 0),
    requests,
    rev: d.rev || 0,
    serverNow: Date.now(),
  };
}

// ----------------------------------------------------------- media
export async function getMessageImage(user, convId, msgId) {
  assertMember(convId, user.uid);
  const snap = await mediaRef(getAdminDb(), convId, String(msgId).slice(0, 60)).get();
  if (!snap.exists) return null;
  const d = snap.data();
  return { buffer: Buffer.from(d.data, "base64"), mime: d.mime || "image/jpeg" };
}
