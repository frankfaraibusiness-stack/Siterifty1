import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { mapStoryDoc } from "@/lib/feed-data";
import { inboxRef, loadActor } from "@/lib/chat-social";
import { FOLLOWS, followId } from "@/lib/social-data";
import { POOL_TTL_DAYS, makeNotification, pagePools, planWrites, previewOf, storyIsLive } from "@/lib/notif-pool";

// Server side of the notification pools. The rules (pool size, how many pools are kept, how a
// notification is built) are in lib/notif-pool.js; read that first.
//
//   users/{uid}/notifPools/{n}  { items: { [key]: { t, at, uid, u, pid?, cid?, x?, sid?, sk?, se? } }, expireAt }
//   inbox/{uid}                 { notifSeq, notifUnread, notifLast: { text, at }, notifBackfilled }
//
// Writing one notification = ONE transaction: read the inbox (to learn which pool is current),
// write the item into that pool, move the counters. Reading a page = the inbox + PAGE_POOLS pool
// documents, however many notifications that holds.

export const poolRef = (db, uid, n) => db.collection("users").doc(uid).collection("notifPools").doc(String(n));

const DAY = 86_400_000;

// Adds notifications to a member's pools. `entries` = [{ key, item }] oldest first.
//   silent: store them without counting them as unread (used for the one-time catch-up)
//   bump:   extra counters to raise on the inbox in the same write, e.g. { newLikes: 1 }
//   extra:  extra inbox fields to set in the same write
export async function appendNotifications(db, toUid, entries, { silent = false, bump = null, extra = null } = {}) {
  const iref = inboxRef(db, toUid);
  if (!entries.length) {
    if (extra) await iref.set(extra, { merge: true });
    return;
  }
  await db.runTransaction(async (tx) => {
    const d = (await tx.get(iref)).data() || {};
    const seq = Math.max(0, d.notifSeq || 0);
    const plan = planWrites(seq, entries.length);
    const expireAt = Timestamp.fromMillis(Date.now() + POOL_TTL_DAYS * DAY);

    let at = 0;
    for (const [pool, count] of plan.pools) {
      const items = {};
      for (const e of entries.slice(at, at + count)) items[e.key] = e.item;
      at += count;
      tx.set(poolRef(db, toUid, pool), { items, expireAt }, { merge: true });
    }
    // Starting a new pool retires the oldest one: this is what keeps a member's storage bounded.
    for (const pool of plan.prune) tx.delete(poolRef(db, toUid, pool));

    const patch = { notifSeq: plan.next, ...(extra || {}) };
    const newest = entries.reduce((a, b) => (b.item.at >= a.item.at ? b : a));
    if (!silent) {
      const before = Math.max(0, d.notifUnread || 0);
      patch.notifUnread = before + entries.length;
      if (before === 0) patch.unread = FieldValue.increment(1); // the Messages badge counts this chat once
      patch.rev = Date.now(); // tells open chat lists to reload
    }
    if (!silent || !d.notifLast || newest.item.at > (d.notifLast.at || 0)) {
      patch.notifLast = { text: previewOf(newest.item), at: newest.item.at };
    }
    for (const [field, n] of Object.entries(bump || {})) patch[field] = FieldValue.increment(n);
    tx.set(iref, patch, { merge: true });
  });
}

// Tell `toUid` something happened. Never throws: a notification must not make a like, a
// comment or a follow fail. Callers never notify someone about their own actions.
export async function notify(db, toUid, type, actor, data = {}, { bump = null } = {}) {
  try {
    if (!toUid || !actor || toUid === actor.uid) return;
    const made = makeNotification(type, actor, data);
    if (made) await appendNotifications(db, toUid, [made], { bump });
    else if (bump) {
      // Nothing to file (e.g. a member without a handle): the badge counters still move.
      await inboxRef(db, toUid).set(Object.fromEntries(Object.entries(bump).map(([k, n]) => [k, FieldValue.increment(n)])), { merge: true });
    }
  } catch (err) {
    console.error("notify failed", type, err?.message || err);
  }
}

// One-time catch-up: story replies left before notifications existed still sit on the member's
// story documents (until those are cleaned up). Copy the newest ones into the pools as already read.
const BACKFILL_MAX = 600;
export async function ensureNotifBackfill(db, uid, inbox) {
  if (inbox?.notifBackfilled) return inbox;
  try {
    const snap = await db.collection("stories").where("uid", "==", uid).limit(200).get();
    const found = [];
    for (const doc of snap.docs) {
      const s = doc.data();
      for (const [rid, r] of Object.entries(s.replies || {})) {
        const at = r?.at?.toMillis?.();
        if (!r?.uid || !r?.username || !r?.text || !at) continue;
        const made = makeNotification(
          "story",
          { uid: String(r.uid), username: String(r.username) },
          { rid, sid: doc.id, sk: s.kind, se: s.expiresAt?.toMillis?.() ?? null, x: String(r.text) },
          at
        );
        if (made) found.push(made);
      }
    }
    found.sort((a, b) => a.item.at - b.item.at);
    await appendNotifications(db, uid, found.slice(-BACKFILL_MAX), { silent: true, extra: { notifBackfilled: true } });
    const fresh = (await inboxRef(db, uid).get()).data() || {};
    return { ...fresh, notifBackfilled: true };
  } catch (err) {
    console.error("notification backfill failed", err);
    return inbox || {}; // try again next time
  }
}

// What the chat list needs for the "Notifications" row (comes from the inbox, no extra reads).
export function notificationsRow(inbox) {
  if (!inbox?.notifLast) return null;
  return {
    unread: Math.max(0, inbox.notifUnread || 0),
    last: { text: inbox.notifLast.text || "", at: inbox.notifLast.at || 0 },
  };
}

// A stable pair of colours per handle, for avatars (so no member document is read just to draw one).
function colorsFor(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return { a: `hsl(${h} 85% 58%)`, b: `hsl(${(h + 48) % 360} 80% 46%)` };
}

const FOLLOW_CHECK_MAX = 40; // distinct people whose Follow button state is looked up per page
const STORY_CHECK_MAX = 25; // distinct stories checked per page

// The feed, newest first. `before` is the `next` of the previous page (omit for the first page).
// `read` (first page only) marks everything as seen.
// -> { items, more, next, unread, serverNow }
export async function listNotifications(user, { before = null, read = false } = {}) {
  const db = getAdminDb();
  const uid = user.uid;
  const iref = inboxRef(db, uid);
  const inbox = await ensureNotifBackfill(db, uid, (await iref.get()).data() || {});
  const unread = Math.max(0, inbox.notifUnread || 0);

  const { pools, more } = pagePools(Math.max(0, inbox.notifSeq || 0), before);
  const [me, poolSnaps] = await Promise.all([
    loadActor(db, uid),
    pools.length ? db.getAll(...pools.map((p) => poolRef(db, uid, p))) : [],
  ]);
  if (read && before == null && unread > 0) {
    await iref.set({ notifUnread: 0, unread: FieldValue.increment(-1) }, { merge: true });
  }

  const blocked = new Set(me?.prefs?.safety?.blocked || []);
  const raw = [];
  for (const snap of poolSnaps) {
    if (!snap.exists) continue;
    for (const [id, item] of Object.entries(snap.data().items || {})) {
      if (blocked.has(String(item.u || "").toLowerCase())) continue; // people you blocked stay out of sight
      raw.push({ id, ...item });
    }
  }
  raw.sort((a, b) => (b.at || 0) - (a.at || 0));

  // Who you already follow: one small read per person, only for the cards that show a Follow button.
  const askers = [...new Set(raw.filter((n) => n.t === "follow" || n.t === "story").map((n) => n.uid))].slice(0, FOLLOW_CHECK_MAX);
  const followSnaps = askers.length
    ? await db.getAll(...askers.map((u) => db.collection(FOLLOWS).doc(followId(uid, u))), { fieldMask: ["from"] })
    : [];
  const following = new Set(askers.filter((_, i) => followSnaps[i].exists));
  const checked = new Set(askers);

  // Stories: only those that could still be up are read; the rest are known to be over already.
  const now = Date.now();
  const sids = [...new Set(raw.filter((n) => n.t === "story" && n.sid && storyIsLive(true, n.sk, n.se ?? null, now)).map((n) => n.sid))].slice(0, STORY_CHECK_MAX);
  const storySnaps = sids.length ? await db.getAll(...sids.map((id) => db.collection("stories").doc(id))) : [];
  const stories = new Map();
  for (const s of storySnaps) {
    if (!s.exists) continue;
    const d = s.data();
    if (storyIsLive(true, d.kind, d.expiresAt?.toMillis?.() ?? null, now)) stories.set(s.id, mapStoryDoc(s, uid));
  }

  const items = raw.map((n, index) => ({
    id: n.id,
    type: n.t,
    atMs: n.at || 0,
    fresh: before == null && index < unread,
    person: { uid: n.uid, username: n.u, displayName: n.u, hasAvatar: true, avatarV: 0, ...colorsFor(n.u) },
    postId: n.pid || null,
    text: n.x || "",
    following: n.t === "follow" ? following.has(n.uid) : checked.has(n.uid) ? following.has(n.uid) : false,
    followsYou: n.t === "follow",
    story: n.t === "story" ? stories.get(n.sid) || null : null, // null once it has expired or been deleted
  }));

  return { items, more, next: pools.length ? pools[pools.length - 1] : null, unread, serverNow: now };
}
