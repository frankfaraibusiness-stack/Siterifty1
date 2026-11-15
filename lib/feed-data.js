import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { formatCount } from "@/lib/format-count";

const POSTS_COLLECTION = "posts";
const STORIES_COLLECTION = "stories";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

export function timeAgo(date) {
  if (!date) return "";
  const ms = Date.now() - date.getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

// Firestore doc shape (posts/{id}):
// {
//   user: string,            // author display handle, e.g. "lucia.ray"
//   avatarA: string,         // hex color, gradient start
//   avatarB: string,         // hex color, gradient end
//   location: string,
//   text: string,
//   tag: string | null,
//   media: { type: "16x9"|"1x1"|"grid", grid?: string, tiles: [{a,b,overlay?}] } | null,
//   likedBy: string[],       // uids who liked this post
//   savedBy: string[],       // uids who saved this post
//   comments: number,
//   shares: number,
//   createdAt: Firestore Timestamp,
// }
// Turns the stored poll + votes map into what the browser needs. Individual
// votes never leave the server, only counts and the viewer's own choices.
export function buildPoll(poll, votes = {}, currentUid) {
  const counts = poll.options.map(() => 0);
  for (const picks of Object.values(votes)) {
    for (const i of picks) if (counts[i] !== undefined) counts[i] += 1;
  }
  return {
    kind: poll.kind || "poll",
    options: poll.options,
    multi: !!poll.multi,
    endsAtMs: poll.endsAt?.toMillis?.() ?? null,
    counts,
    voters: Object.keys(votes).length,
    mine: (currentUid && votes[currentUid]) || [],
  };
}

// Private posts are only for their author; scheduled posts only appear once
// their time has come (the author can already see them).
export function canView(data, currentUid) {
  const mine = !!currentUid && data.uid === currentUid;
  if (data.settings?.visibility === "private" && !mine) return false;
  const ms = data.createdAt?.toMillis?.() ?? 0;
  if (ms > Date.now() && !mine) return false;
  return true;
}

export function mapPostDoc(doc, currentUid) {
  const data = doc.data();
  const likedBy = data.likedBy || [];
  const savedBy = data.savedBy || [];
  const createdAt = data.createdAt?.toDate?.() ?? null;

  return {
    id: doc.id,
    user: data.user,
    initial: initials(data.user),
    avatarA: data.avatarA || "#2de2c5",
    avatarB: data.avatarB || "#1b6fa8",
    location: data.location || "",
    timeAgo: timeAgo(createdAt),
    createdAtMs: createdAt ? createdAt.getTime() : 0,
    text: data.text || "",
    tag: data.tag || null,
    media: data.media || null,
    type: data.type || "post",
    title: data.title || "",
    tags: data.tags || [],
    poll: data.poll ? buildPoll(data.poll, data.votes, currentUid) : null,
    theory: data.theory || null,
    settings: {
      visibility: "public",
      comments: true,
      hideLikes: false,
      allowShare: true,
      spoiler: false,
      resultsFirst: false,
      pinned: false,
      ...(data.settings || {}),
    },
    isOwner: !!currentUid && data.uid === currentUid,
    scheduled: createdAt ? createdAt.getTime() > Date.now() : false,
    likesBase: formatCount(likedBy.length),
    likesCount: likedBy.length,
    likedByMe: currentUid ? likedBy.includes(currentUid) : false,
    savedByMe: currentUid ? savedBy.includes(currentUid) : false,
    comments: data.comments || 0,
    shares: data.shares || 0,
  };
}

function mapStoryDoc(doc) {
  const data = doc.data();
  return {
    id: doc.id,
    username: data.username,
    gradient:
      data.gradient ||
      `linear-gradient(135deg, ${data.colorA || "#ff3d7f"}, ${
        data.colorB || "#7b2ff7"
      })`,
  };
}

export async function fetchPosts({ currentUid, limit = 30 } = {}) {
  const db = getAdminDb();
  // Same field for the range and the order, so no composite index is needed.
  const snap = await db
    .collection(POSTS_COLLECTION)
    .where("createdAt", "<=", Timestamp.now())
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs
    .filter((doc) => canView(doc.data(), currentUid))
    .map((doc) => mapPostDoc(doc, currentUid));
}

// One post by id (for /p/[id]), or null when missing or not visible.
export async function fetchPostById(id, currentUid) {
  if (!id || id.includes("/")) return null;
  const doc = await getAdminDb().collection(POSTS_COLLECTION).doc(id).get();
  if (!doc.exists || !canView(doc.data(), currentUid)) return null;
  return mapPostDoc(doc, currentUid);
}

export async function fetchStories({ limit = 20 } = {}) {
  const db = getAdminDb();
  const snap = await db
    .collection(STORIES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map(mapStoryDoc);
}
