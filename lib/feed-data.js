import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { formatCount } from "@/lib/format-count";

const POSTS_COLLECTION = "posts";
const STORIES_COLLECTION = "stories";

function initials(name) {
  return (name || "?").trim().charAt(0).toUpperCase();
}

function timeAgo(date) {
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
function mapPostDoc(doc, currentUid) {
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
    text: data.text || "",
    tag: data.tag || null,
    media: data.media || null,
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
  const snap = await db
    .collection(POSTS_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snap.docs.map((doc) => mapPostDoc(doc, currentUid));
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
