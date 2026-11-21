// Notification pools: the rules, with no database in sight (safe on the server, in the browser
// and in tests). The server side is lib/notif-pool-data.js.
//
// WHY POOLS. A notification used to be a counter; showing a list would have meant one document
// per like / comment / follow, and one read per document to collect them. Instead every member
// has a small number of POOL documents, each holding up to POOL_SIZE notifications:
//
//   users/{uid}/notifPools/{n}   { n, items: { [notificationId]: item }, expireAt }
//   inbox/{uid}                  { notifSeq, notifUnread, notifLast, ... }
//
// `notifSeq` counts every notification ever written for the member. Notification number `seq`
// lives in pool floor(seq / POOL_SIZE), so the newest pool is always known from the inbox
// document (which is read anyway) and a page of the feed is 1 + PAGE_POOLS reads, not 200.
//
// KEEPING IT SMALL. Only MAX_POOLS pools are kept per member: the moment pool p is started, pool
// p - MAX_POOLS is deleted, so a member never holds more than MAX_POOLS * POOL_SIZE notifications
// and a busy account can't eat the project's storage. Pool documents also carry `expireAt`, so a
// Firestore TTL policy on that field (collection group `notifPools`) clears quiet accounts too.
export const POOL_SIZE = 100;
export const MAX_POOLS = 12; // 12 x 100 = the newest 1,200 notifications per member
export const PAGE_POOLS = 2; // pools read per page of the feed (about 200 notifications)
export const POOL_TTL_DAYS = 90;

// The Notifications chat lives at /messages?with=my-notifications. A hyphen can never be part of
// a handle (USERNAME_RE in lib/settings.js), so this can't clash with a member.
export const NOTIF_KEY = "my-notifications";
export const NOTIF_NAME = "Notifications";

export const TEXT_MAX = 120; // characters of a comment / post kept inside a notification
export const PREVIEW_MAX = 80; // characters kept for the chat-list preview

export const poolOf = (seq) => Math.floor(seq / POOL_SIZE);

// Where `count` new notifications go when `seq` have been written so far.
// -> { pools: Map(pool -> number of items), prune: [pool numbers to delete], next }
// Starting a new pool (its first slot) retires the pool MAX_POOLS behind it.
export function planWrites(seq, count) {
  const pools = new Map();
  const prune = [];
  for (let i = 0; i < count; i++) {
    const at = seq + i;
    const p = poolOf(at);
    pools.set(p, (pools.get(p) || 0) + 1);
    if (at % POOL_SIZE === 0 && p >= MAX_POOLS) prune.push(p - MAX_POOLS);
  }
  return { pools, prune, next: seq + count };
}

// Which pools one page of the feed reads. `before` is the lowest pool of the previous page
// (omit it for the first page). -> { pools: [newest .. oldest], more }
export function pagePools(seq, before = null) {
  if (!(seq > 0)) return { pools: [], more: false };
  const head = poolOf(seq - 1);
  const lowest = Math.max(0, head - MAX_POOLS + 1); // older ones have been retired
  const start = before == null ? head : Math.min(head, before - 1);
  if (start < lowest) return { pools: [], more: false };
  const end = Math.max(lowest, start - PAGE_POOLS + 1);
  const pools = [];
  for (let p = start; p >= end; p--) pools.push(p);
  return { pools, more: end > lowest };
}

const clip = (text, max) => {
  const t = String(text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
};

// ------------------------------------------------------------------ the notification types
// like      someone liked your post                 pid, x = post words
// clike     someone liked your comment              pid, cid, x = comment words
// comment   someone commented on your post          pid, cid, x = the comment
// reply     someone replied to your comment          pid, cid, x = the reply
// follow    someone started following you
// friend    someone sent you a friend request
// friend_ok someone accepted your friend request
// story     someone replied to your story            sid, sk = kind, se = expiry (ms), x = the reply
export const NOTIF_TYPES = ["like", "clike", "comment", "reply", "follow", "friend", "friend_ok", "story"];

// One stored notification. `key` is the id inside the pool: the same action by the same person
// on the same thing always gets the same key, so a repeat (like, unlike, like) overwrites itself
// instead of piling up.
export function makeNotification(type, actor, data = {}, at = Date.now()) {
  if (!NOTIF_TYPES.includes(type) || !actor?.uid || !actor?.username) return null;
  const who = actor.uid;
  const key =
    type === "like" ? `lk_${data.pid}_${who}`
    : type === "clike" ? `cl_${data.cid}_${who}`
    : type === "comment" ? `cm_${data.cid}`
    : type === "reply" ? `rp_${data.cid}`
    : type === "follow" ? `fw_${who}`
    : type === "friend" ? `fr_${who}`
    : type === "friend_ok" ? `fo_${who}`
    : `sr_${data.rid}`;
  if (/undefined/.test(key)) return null;
  const item = { t: type, at, uid: who, u: actor.username };
  if (data.pid) item.pid = String(data.pid);
  if (data.cid) item.cid = String(data.cid);
  if (data.x) item.x = clip(data.x, TEXT_MAX);
  if (type === "story") {
    item.sid = String(data.sid || "");
    item.sk = data.sk === "image" || data.sk === "video" ? data.sk : "gradient";
    if (data.se) item.se = Number(data.se);
  }
  return { key, item };
}

// The line shown under "Notifications" in the chat list.
export function previewOf(item) {
  const who = item.u;
  switch (item.t) {
    case "like": return `${who} liked your post`;
    case "clike": return `${who} liked your comment`;
    case "comment": return `${who}: ${clip(item.x, PREVIEW_MAX)}`;
    case "reply": return `${who}: ${clip(item.x, PREVIEW_MAX)}`;
    case "follow": return `${who} started following you`;
    case "friend": return `${who} sent you a friend request`;
    case "friend_ok": return `${who} accepted your friend request`;
    case "story": return `${who}: ${clip(item.x, PREVIEW_MAX)}`;
    default: return "";
  }
}

// A story can still be watched while it exists and (for photos and clips) has not passed
// `expiresAtMs`. Older colour cards have no expiry.
export function storyIsLive(exists, kind, expiresAtMs, now = Date.now()) {
  if (!exists) return false;
  if (kind !== "image" && kind !== "video") return true;
  return (expiresAtMs ?? 0) > now;
}
