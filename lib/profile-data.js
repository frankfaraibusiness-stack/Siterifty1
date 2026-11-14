import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebase-admin";
import { canView, mapPostDoc } from "@/lib/feed-data";

const USERS = "users";

// users/{uid}:
// {
//   username, usernameLower, displayName, bio, location, website,
//   theme: "vice" | "neon" | ..., avatarUrl: dataURL | null,
//   bannerUrl: dataURL | null, createdAt: Timestamp, updatedAt: Timestamp
// }
function formatJoined(date) {
  if (!date) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Finds a profile by username. If the viewer is the owner and has no profile
// document yet (accounts created before profiles existed), one is created
// from their Auth record so nobody has to re-register.
export async function getProfileByUsername(username, currentUser) {
  const db = getAdminDb();
  const lower = username.toLowerCase();

  const snap = await db
    .collection(USERS)
    .where("usernameLower", "==", lower)
    .limit(1)
    .get();
  let doc = snap.docs[0];

  if (!doc && currentUser?.username?.toLowerCase() === lower) {
    const record = await getAdminAuth().getUser(currentUser.uid);
    const ref = db.collection(USERS).doc(currentUser.uid);
    await ref.set(
      {
        username: currentUser.username,
        usernameLower: lower,
        displayName: record.displayName || currentUser.username,
        theme: "vice",
        hasAvatar: false,
        createdAt: Timestamp.fromDate(new Date(record.metadata.creationTime)),
      },
      { merge: true }
    );
    doc = await ref.get();
  }

  if (!doc || !doc.exists) return null;

  const data = doc.data();
  let created = data.createdAt?.toDate?.() ?? null;
  if (!created) {
    try {
      const record = await getAdminAuth().getUser(doc.id);
      created = new Date(record.metadata.creationTime);
    } catch {
      created = null;
    }
  }

  return {
    uid: doc.id,
    username: data.username,
    displayName: data.displayName || data.username,
    bio: data.bio || "",
    location: data.location || "",
    website: data.website || "",
    theme: data.theme || "vice",
    avatarUrl: data.avatarUrl || null,
    bannerUrl: data.bannerUrl || null,
    joined: formatJoined(created),
  };
}

// All posts by one author (matched on the post's `user` handle), plus
// totals for the stats row. Sorted in memory so no composite index is needed.
export async function fetchUserPosts(username, currentUid) {
  const db = getAdminDb();
  const snap = await db
    .collection("posts")
    .where("user", "==", username)
    .limit(200)
    .get();

  const docs = snap.docs.filter((doc) => canView(doc.data(), currentUid));
  let likes = 0;
  let comments = 0;
  let saves = 0;
  for (const doc of docs) {
    const d = doc.data();
    likes += (d.likedBy || []).length;
    saves += (d.savedBy || []).length;
    comments += d.comments || 0;
  }

  const posts = docs
    .map((doc) => mapPostDoc(doc, currentUid))
    .sort(
      (a, b) =>
        Number(b.settings.pinned) - Number(a.settings.pinned) ||
        b.createdAtMs - a.createdAtMs
    );

  return {
    posts,
    stats: { posts: posts.length, likes, comments, saves },
  };
}
