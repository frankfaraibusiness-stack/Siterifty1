import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { HttpError, loadActor, loadActors } from "@/lib/chat-social";
import { fetchEvents } from "@/lib/event-data";
import {
  CREW_SIZES, CREW_TTL_MS, DEFAULT_STATUS, LOBBY_LIMITS, MESSAGE_KEEP_MS, OFFICIAL_ROOMS, PLATFORMS, PLAYSTYLES,
  REGIONS, ROOM_IDLE_MS, ROOM_TOPICS, SEND_GAP_MS, STATUS_IDS, blockedEitherWay, cleanText, getOfficialRoom,
  isOfficialRoomId, isPresent, isRoomId, PRESENCE_MS, nextSessionPlan, officialRoomId, oneOf, sessionRules, sessionSizes,
} from "@/lib/lobby-config";

// The Lobby, on Firestore (Admin SDK, like the rest of the site). Every query
// below uses ONE field (an equality, or a range on a single field), so no
// composite index is needed; sorting happens in memory.
//
//   lobbyPresence/{uid}     { uid, username, status, roomId, activeAt, hidden, lastMsgAt }
//   lobbyRooms/{roomId}     member sessions only: { title, topic, max, ownerUid, ownerUsername,
//                           createdAt, lastAt, closed }
//   lobbyRooms/{roomId}/messages/{id}   { uid, username, text, at, kind }   ("official-*" rooms
//                           keep their messages here too; their parent doc is created lazily)
//   lobbyCrew/{uid}         one crew-finder post per member: { platform, style, region, size, note,
//                           createdAt, expiresAt, waves: { [uid]: { username, at } } }
const PRESENCE = "lobbyPresence";
const ROOMS = "lobbyRooms";
const CREW = "lobbyCrew";

const toViewer = (actor) => ({
  uid: actor.uid,
  username: actor.username,
  blocked: actor.prefs.safety.blocked || [],
  plan: actor.person.plan,
});
const toOther = (actor) => ({ username: actor.username, blocked: actor.prefs.safety.blocked || [] });

// What the browser may know about another member (no prefs, no email).
const personOut = (actor) => ({
  username: actor.username,
  displayName: actor.person.displayName,
  a: actor.person.a,
  b: actor.person.b,
  hasAvatar: actor.person.hasAvatar,
  avatarV: actor.person.avatarV,
  plan: actor.person.plan,
});

async function requireActor(db, uid) {
  const actor = await loadActor(db, uid);
  if (!actor) throw new HttpError(404, "Account not found.");
  return actor;
}

// ------------------------------------------------------------- rooms
async function readRoom(db, roomId) {
  if (!isRoomId(roomId)) throw new HttpError(400, "Unknown room.");
  if (isOfficialRoomId(roomId)) {
    const o = getOfficialRoom(roomId);
    return { id: roomId, official: true, title: o.title, max: 0, ownerUid: null, closed: false };
  }
  const snap = await db.collection(ROOMS).doc(roomId).get();
  const d = snap.data();
  const gone = !snap.exists || d.closed || Date.now() - (d.lastAt || 0) > ROOM_IDLE_MS;
  if (gone) throw new HttpError(404, "That session has ended.", { ended: true });
  return { id: roomId, official: false, title: d.title, max: d.max || 0, ownerUid: d.ownerUid, closed: false };
}

// Moves a member into a room, refusing when a member session is full. Safe to
// call over and over (every check-in does).
async function enterRoom(db, actor, roomId, presence, now) {
  const room = await readRoom(db, roomId);
  if (room.max && presence?.roomId !== roomId) {
    const snap = await db.collection(PRESENCE).where("roomId", "==", roomId).limit(120).get();
    const inside = snap.docs.filter((d) => d.id !== actor.uid && isPresent(d.data().activeAt, now)).length;
    if (inside >= room.max) throw new HttpError(409, "That session is full.", { full: true });
  }
  return room;
}

async function writePresence(db, actor, { status, roomId } = {}) {
  const now = Date.now();
  const ref = db.collection(PRESENCE).doc(actor.uid);
  const prev = (await ref.get()).data() || null;
  const fresh = !!prev && isPresent(prev.activeAt, now);
  const patch = {
    uid: actor.uid,
    username: actor.username,
    activeAt: now,
    hidden: !(actor.prefs.safety.showOnline && actor.prefs.safety.discoverable),
    status: oneOf(status, STATUS_IDS, null) || (fresh && prev.status) || DEFAULT_STATUS,
  };
  if (roomId === null) patch.roomId = null;
  else if (roomId !== undefined) {
    await enterRoom(db, actor, roomId, fresh ? prev : null, now);
    patch.roomId = roomId;
  } else patch.roomId = fresh ? prev.roomId || null : null;
  await ref.set(patch, { merge: true });
  return patch;
}

// ------------------------------------------------------------- live snapshot
// One check-in: records that you're here, then returns everything the lobby
// screen shows. `status` / `roomId` are the member's current choices.
export async function checkIn(user, { status, roomId } = {}) {
  const db = getAdminDb();
  const actor = await requireActor(db, user.uid);
  await writePresence(db, actor, { status, roomId });
  return buildLive(db, actor);
}

// Closing the tab: drop out of the list straight away instead of waiting for
// the check-in to expire.
export async function leaveLobby(user) {
  await getAdminDb().collection(PRESENCE).doc(user.uid).set({ activeAt: 0, roomId: null }, { merge: true });
  return { ok: true };
}

export async function getLive(user) {
  const db = getAdminDb();
  return buildLive(db, await requireActor(db, user.uid));
}

async function buildLive(db, me) {
  const now = Date.now();
  const viewer = toViewer(me);
  const [presSnap, roomSnap, crewSnap] = await Promise.all([
    db.collection(PRESENCE).where("activeAt", ">", now - PRESENCE_MS).limit(300).get(),
    db.collection(ROOMS).where("lastAt", ">", now - ROOM_IDLE_MS).limit(60).get(),
    db.collection(CREW).where("expiresAt", ">", now).limit(80).get(),
  ]);

  const pres = presSnap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((p) => isPresent(p.activeAt, now));
  const visible = pres.filter((p) => !p.hidden || p.uid === me.uid);
  const crew = crewSnap.docs.map((d) => ({ uid: d.id, ...d.data() })).filter((c) => (c.expiresAt || 0) > now);

  const actors = await loadActors(db, [...visible.slice(0, 150).map((p) => p.uid), ...crew.map((c) => c.uid)]);
  const okActor = (uid) => {
    const a = actors.get(uid);
    return a && (uid === me.uid || !blockedEitherWay(viewer, toOther(a))) ? a : null;
  };

  const counts = {};
  for (const p of pres) if (p.roomId) counts[p.roomId] = (counts[p.roomId] || 0) + 1;

  const people = visible
    .map((p) => ({ p, a: okActor(p.uid) }))
    .filter((x) => x.a)
    .map(({ p, a }) => ({
      ...personOut(a),
      status: p.status || DEFAULT_STATUS,
      roomId: p.roomId || null,
      self: p.uid === me.uid,
      activeAt: p.activeAt,
    }))
    .sort((x, y) => Number(y.self) - Number(x.self) || y.activeAt - x.activeAt)
    .map(({ activeAt, ...rest }) => rest);

  const official = OFFICIAL_ROOMS.map((r) => ({ ...r, id: officialRoomId(r.id), count: counts[officialRoomId(r.id)] || 0 }));
  const rooms = roomSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((r) => !r.closed)
    .map((r) => ({
      id: r.id,
      title: r.title,
      topic: r.topic,
      max: r.max || 0,
      owner: r.ownerUsername,
      mine: r.ownerUid === me.uid,
      lastAt: r.lastAt || 0,
      count: counts[r.id] || 0,
    }))
    .sort((x, y) => y.count - x.count || y.lastAt - x.lastAt);

  const board = crew
    .map((c) => ({ c, a: okActor(c.uid) }))
    .filter((x) => x.a)
    .map(({ c, a }) => {
      const waves = c.waves || {};
      const mine = c.uid === me.uid;
      return {
        id: c.uid,
        ...personOut(a),
        platform: c.platform,
        style: c.style,
        region: c.region,
        size: c.size,
        note: c.note || "",
        createdAt: c.createdAt || 0,
        expiresAt: c.expiresAt || 0,
        mine,
        waved: !!waves[me.uid],
        waveCount: Object.keys(waves).length,
        wavers: mine
          ? Object.values(waves)
              .sort((x, y) => (y.at || 0) - (x.at || 0))
              .slice(0, LOBBY_LIMITS.wavers)
              .map((w) => w.username)
          : [],
      };
    })
    .sort((x, y) => Number(y.mine) - Number(x.mine) || y.createdAt - x.createdAt);

  const mePres = pres.find((p) => p.uid === me.uid);
  const rules = sessionRules(viewer.plan);
  return {
    now,
    total: pres.length,
    people,
    official,
    rooms,
    crew: board,
    me: {
      status: mePres?.status || DEFAULT_STATUS,
      roomId: mePres?.roomId || null,
      plan: viewer.plan,
      rules,
      sizes: sessionSizes(viewer.plan),
      nextPlan: nextSessionPlan(viewer.plan),
    },
  };
}

// ------------------------------------------------------------- sessions
export async function createRoom(user, b) {
  const db = getAdminDb();
  const actor = await requireActor(db, user.uid);
  const plan = actor.person.plan;
  const rules = sessionRules(plan);
  const title = cleanText(b.title, LOBBY_LIMITS.title);
  if (title.length < 3) throw new HttpError(400, "Give the session a name (at least 3 letters).");
  const topic = oneOf(b.topic, ROOM_TOPICS, null);
  if (!topic) throw new HttpError(400, "Pick a topic.");
  const sizes = sessionSizes(plan);
  const max = sizes.includes(Number(b.max)) ? Number(b.max) : sizes[Math.min(1, sizes.length - 1)];

  const now = Date.now();
  const mine = await db.collection(ROOMS).where("ownerUid", "==", user.uid).limit(40).get();
  const active = mine.docs.filter((d) => !d.data().closed && now - (d.data().lastAt || 0) < ROOM_IDLE_MS).length;
  if (active >= rules.active) {
    const n = rules.active;
    throw new HttpError(403, `You can run ${n} session${n === 1 ? "" : "s"} at a time on your plan. Close one first.`, { limit: true });
  }

  const ref = await db.collection(ROOMS).add({
    title, topic, max, ownerUid: user.uid, ownerUsername: actor.username, createdAt: now, lastAt: now, closed: false,
  });
  await ref.collection("messages").add({ uid: user.uid, username: actor.username, text: "opened this session.", at: now, kind: "system" });
  await writePresence(db, actor, { roomId: ref.id });
  return { id: ref.id };
}

export async function closeRoom(user, roomId) {
  const db = getAdminDb();
  if (!isRoomId(roomId) || isOfficialRoomId(roomId)) throw new HttpError(400, "Only member sessions can be closed.");
  const ref = db.collection(ROOMS).doc(roomId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, "That session has ended.", { ended: true });
  if (snap.data().ownerUid !== user.uid) throw new HttpError(403, "Only the host can close this session.");
  await ref.set({ closed: true, lastAt: 0 }, { merge: true });
  return { ok: true };
}

// ------------------------------------------------------------- chat
export async function getMessages(user, roomId, { since = 0 } = {}) {
  const db = getAdminDb();
  const [me, room] = await Promise.all([requireActor(db, user.uid), readRoom(db, roomId)]);
  const viewer = toViewer(me);
  const msgs = db.collection(ROOMS).doc(roomId).collection("messages");
  let docs;
  if (since > 0) {
    docs = (await msgs.where("at", ">", since).orderBy("at", "asc").limit(LOBBY_LIMITS.since).get()).docs;
  } else {
    docs = (await msgs.orderBy("at", "desc").limit(LOBBY_LIMITS.page).get()).docs.reverse();
  }
  const rows = docs.map((d) => ({ id: d.id, ...d.data() }));
  const actors = await loadActors(db, rows.map((r) => r.uid));
  const messages = [];
  for (const r of rows) {
    const a = actors.get(r.uid);
    if (a && r.uid !== user.uid && blockedEitherWay(viewer, toOther(a))) continue;
    messages.push({
      id: r.id,
      kind: r.kind === "system" ? "system" : "msg",
      text: r.text,
      at: r.at,
      ...(a ? personOut(a) : { username: r.username, a: "#2de2c5", b: "#1b6fa8", hasAvatar: false, avatarV: 0, plan: null }),
      mine: r.uid === user.uid,
      canDelete: r.kind !== "system" && (r.uid === user.uid || (!!room.ownerUid && room.ownerUid === user.uid)),
    });
  }
  return { room: { id: roomId, title: room.title, official: room.official, max: room.max, hostIsMe: room.ownerUid === user.uid }, messages };
}

export async function sendMessage(user, roomId, rawText) {
  const text = cleanText(rawText, LOBBY_LIMITS.text);
  if (!text) throw new HttpError(400, "Type something first.");
  const db = getAdminDb();
  const actor = await requireActor(db, user.uid);
  const pref = db.collection(PRESENCE).doc(user.uid);
  const now = Date.now();
  const prev = (await pref.get()).data() || null;
  if (prev?.lastMsgAt && now - prev.lastMsgAt < SEND_GAP_MS) throw new HttpError(429, "Slow down a little.");

  const inRoom = !!prev && prev.roomId === roomId && isPresent(prev.activeAt, now);
  const room = await enterRoom(db, actor, roomId, inRoom ? prev : null, now);
  await pref.set(
    {
      uid: user.uid, username: actor.username, roomId, activeAt: now, lastMsgAt: now,
      hidden: !(actor.prefs.safety.showOnline && actor.prefs.safety.discoverable),
      status: inRoom && prev.status ? prev.status : DEFAULT_STATUS,
    },
    { merge: true }
  );

  const roomRef = db.collection(ROOMS).doc(roomId);
  const ref = await roomRef.collection("messages").add({ uid: user.uid, username: actor.username, text, at: now, kind: "msg" });
  // Keeps a member session alive (and makes official rooms' parent docs exist).
  await roomRef.set({ lastAt: now }, { merge: true });
  if (Math.random() < 0.05) await purgeOld(roomRef, now).catch(() => {});
  return {
    message: { id: ref.id, kind: "msg", text, at: now, ...personOut(actor), mine: true, canDelete: true },
    room: { id: room.id },
  };
}

async function purgeOld(roomRef, now) {
  const old = await roomRef.collection("messages").where("at", "<", now - MESSAGE_KEEP_MS).limit(200).get();
  if (old.empty) return;
  const batch = roomRef.firestore.batch();
  old.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}

export async function deleteMessage(user, roomId, messageId) {
  const db = getAdminDb();
  const room = await readRoom(db, roomId);
  const ref = db.collection(ROOMS).doc(roomId).collection("messages").doc(String(messageId).slice(0, 40));
  const snap = await ref.get();
  if (!snap.exists) return { ok: true };
  const d = snap.data();
  if (d.kind === "system") throw new HttpError(400, "System lines can’t be removed.");
  if (d.uid !== user.uid && room.ownerUid !== user.uid) throw new HttpError(403, "You can only remove your own messages.");
  await ref.delete();
  return { ok: true };
}

// ------------------------------------------------------------- crew finder
export async function postCrew(user, b) {
  const db = getAdminDb();
  const actor = await requireActor(db, user.uid);
  const platform = oneOf(b.platform, PLATFORMS, null);
  const style = oneOf(b.style, PLAYSTYLES, null);
  const region = oneOf(b.region, REGIONS, null);
  if (!platform || !style || !region) throw new HttpError(400, "Choose a platform, a playstyle and a region.");
  const size = CREW_SIZES.includes(Number(b.size)) ? Number(b.size) : 4;
  const note = cleanText(b.note, LOBBY_LIMITS.note);
  const now = Date.now();
  const ref = db.collection(CREW).doc(user.uid);
  const prev = (await ref.get()).data();
  const waves = prev && (prev.expiresAt || 0) > now ? prev.waves || {} : {};
  await ref.set({ uid: user.uid, username: actor.username, platform, style, region, size, note, createdAt: now, expiresAt: now + CREW_TTL_MS, waves });
  return { ok: true };
}

export async function removeCrew(user) {
  await getAdminDb().collection(CREW).doc(user.uid).delete();
  return { ok: true };
}

// Wave at a crew post (a "count me in" nudge the poster sees). Waving again
// takes the wave back.
export async function waveCrew(user, targetUid) {
  const db = getAdminDb();
  if (!targetUid || typeof targetUid !== "string" || targetUid.length > 128) throw new HttpError(400, "Unknown post.");
  if (targetUid === user.uid) throw new HttpError(400, "That’s your own post.");
  const [me, target, snap] = await Promise.all([
    requireActor(db, user.uid),
    loadActor(db, targetUid),
    db.collection(CREW).doc(targetUid).get(),
  ]);
  const d = snap.data();
  if (!target || !snap.exists || (d.expiresAt || 0) <= Date.now()) throw new HttpError(404, "That post has expired.");
  if (blockedEitherWay(toViewer(me), toOther(target))) throw new HttpError(403, "You can’t wave at this post.");
  const waved = !(d.waves || {})[user.uid];
  await snap.ref.update({ [`waves.${user.uid}`]: waved ? { username: me.username, at: Date.now() } : FieldValue.delete() });
  return { waved };
}

// ------------------------------------------------------------- events strip
// Events live now or starting in the next three days, soonest first.
export async function startingSoon(user, { limit = 4 } = {}) {
  const now = Date.now();
  const all = await fetchEvents({ currentUid: user?.uid, limit: 200 });
  return all
    .filter((p) => p.event && p.event.phase !== "ended" && (p.event.phase === "live" || p.event.startsAtMs < now + 3 * 86_400_000))
    .sort((a, b) => a.event.startsAtMs - b.event.startsAtMs)
    .slice(0, limit)
    .map((p) => ({ id: p.id, title: p.title || p.text?.slice(0, 60) || "Event", startsAtMs: p.event.startsAtMs, phase: p.event.phase, host: p.user }));
}
