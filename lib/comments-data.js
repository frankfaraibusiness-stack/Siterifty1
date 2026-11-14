import "server-only";
import { getTheme, THEMES } from "@/lib/profile-themes";
import { timeAgo } from "@/lib/feed-data";

// Comments live in posts/{postId}/comments/{commentId}:
// { uid, user, text, likedBy: string[], createdAt: Timestamp }
// The parent post's `comments` number is kept in sync inside transactions.
export const MAX_COMMENT = 500;
export const COMMENT_LIMIT = 100;

export function validId(v) {
  return typeof v === "string" && v.length > 0 && v.length <= 200 && !v.includes("/");
}

export function postRef(db, postId) {
  return db.collection("posts").doc(postId);
}

export function commentsRef(db, postId) {
  return postRef(db, postId).collection("comments");
}

function fallbackTheme(name) {
  let h = 0;
  for (const ch of String(name)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return THEMES[h % THEMES.length];
}

// uid -> { theme, hasAvatar, avatarV } (only light fields, never the image).
export async function loadProfileMap(db, uids) {
  const unique = [...new Set(uids.filter(Boolean))].slice(0, 120);
  const map = new Map();
  if (unique.length === 0) return map;
  const snaps = await db.getAll(
    ...unique.map((u) => db.collection("users").doc(u)),
    { fieldMask: ["theme", "hasAvatar", "updatedAt"] }
  );
  for (const s of snaps) {
    if (!s.exists) continue;
    const d = s.data();
    map.set(s.id, {
      theme: d.theme || "vice",
      hasAvatar: d.hasAvatar !== false,
      avatarV: d.updatedAt?.toMillis?.() ?? 0,
    });
  }
  return map;
}

export function profileLook(name, profile) {
  const t = profile ? getTheme(profile.theme) : fallbackTheme(name);
  return {
    a: t.a,
    b: t.b,
    hasAvatar: profile ? profile.hasAvatar : false,
    avatarV: profile?.avatarV ?? 0,
  };
}

export function mapComment(doc, { viewerUid, viewerUsername, postUser, profiles }) {
  const d = doc.data();
  const likedBy = d.likedBy || [];
  const created = d.createdAt?.toDate?.() ?? null;
  const mine = !!viewerUid && d.uid === viewerUid;
  return {
    id: doc.id,
    user: d.user,
    initial: (d.user || "?").trim().charAt(0).toUpperCase(),
    text: d.text || "",
    timeAgo: timeAgo(created),
    createdAtMs: created ? created.getTime() : 0,
    likes: likedBy.length,
    likedByMe: viewerUid ? likedBy.includes(viewerUid) : false,
    mine,
    canDelete: mine || (!!viewerUsername && viewerUsername === postUser),
    ...profileLook(d.user, profiles.get(d.uid)),
  };
}
