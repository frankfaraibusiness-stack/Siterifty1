import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { inboxRef } from "@/lib/chat-social";
import { notify } from "@/lib/notif-pool-data";

// "New follower" notifications for the header badge.
//
// Messages and friend requests are already counted by lib/messages-data.js
// (getSummary). New followers are kept as a tiny counter on the same
// inbox/{uid} doc, so the existing check-in poll picks them up for free:
//
//   inbox/{uid}.newFollowers     followers gained since the member last opened
//                                their Followers list
//   inbox/{uid}.followersSeenAt  ms timestamp of that last look
//
// Every helper swallows its errors: a badge counter must never make following
// someone fail.

// Someone started following `toUid`. With `actor` ({ uid, username }) it also lands in their
// Notifications chat (lib/notif-pool-data.js), in the same write as the badge counter.
export async function noteNewFollower(db, toUid, actor = null) {
  if (actor) return notify(db, toUid, "follow", actor, {}, { bump: { newFollowers: 1 } });
  try {
    await inboxRef(db, toUid).set({ newFollowers: FieldValue.increment(1) }, { merge: true });
  } catch {}
}

// They unfollowed again. Only takes the count back down if the member had not
// already seen that follow (otherwise the counter was already cleared).
export async function undoNewFollower(db, toUid, followCreatedMs) {
  try {
    const ref = inboxRef(db, toUid);
    await db.runTransaction(async (tx) => {
      const d = (await tx.get(ref)).data() || {};
      const count = Math.max(0, d.newFollowers || 0);
      if (count > 0 && followCreatedMs > (d.followersSeenAt || 0)) {
        tx.set(ref, { newFollowers: count - 1 }, { merge: true });
      }
    });
  } catch {}
}

// The member opened their Followers list: everything so far counts as seen.
export async function clearNewFollowers(db, uid) {
  try {
    await inboxRef(db, uid).set({ newFollowers: 0, followersSeenAt: Date.now() }, { merge: true });
  } catch {}
}

// ---------------------------------------------------------------- likes + comments
// Same idea as new followers: two small counters on inbox/{uid}.
//
//   inbox/{uid}.newLikes         likes on your posts and comments since you last looked
//   inbox/{uid}.newComments      comments on your posts (and replies to your comments)
//   inbox/{uid}.activitySeenAt   ms timestamp of that last look
//
// "Looking" = opening your own profile (see components/ActivitySeen.js).
// Callers never notify someone about their own actions.
const ACTIVITY_FIELD = { likes: "newLikes", comments: "newComments" };

// `event` ({ type, actor, data }, see makeNotification in lib/notif-pool.js) also files the activity
// in the member's Notifications chat, in the same write as the counter.
export async function noteActivity(db, toUid, kind, event = null) {
  const field = ACTIVITY_FIELD[kind];
  if (!toUid || !field) return;
  if (event) return notify(db, toUid, event.type, event.actor, event.data, { bump: { [field]: 1 } });
  try {
    await inboxRef(db, toUid).set({ [field]: FieldValue.increment(1) }, { merge: true });
  } catch {}
}

// The like was taken back / the comment deleted before the member looked.
// Never goes below zero.
export async function undoActivity(db, toUid, kind) {
  const field = ACTIVITY_FIELD[kind];
  if (!toUid || !field) return;
  try {
    const ref = inboxRef(db, toUid);
    await db.runTransaction(async (tx) => {
      const count = Math.max(0, (await tx.get(ref)).data()?.[field] || 0);
      if (count > 0) tx.set(ref, { [field]: count - 1 }, { merge: true });
    });
  } catch {}
}

// The member opened their own profile: likes and comments count as seen.
export async function clearActivity(db, uid) {
  try {
    await inboxRef(db, uid).set(
      { newLikes: 0, newComments: 0, activitySeenAt: Date.now() },
      { merge: true }
    );
  } catch {}
}
