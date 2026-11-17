import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { schedulePollPurge } from "@/lib/poll-expiry";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";
import { cleanPerks, publicFlair } from "@/lib/perks";
import { TYPES } from "@/lib/post-schema";

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
    const ref = db.collection(USERS).doc(currentUser.uid);
    await ref.set(
      {
        username: currentUser.username,
        usernameLower: lower,
        displayName: currentUser.username,
        theme: "vice",
        hasAvatar: false,
        createdAt: Timestamp.now(),
      },
      { merge: true }
    );
    doc = await ref.get();
  }

  if (!doc || !doc.exists) return null;

  const data = doc.data();
  const created = data.createdAt?.toDate?.() ?? null;

  return {
    uid: doc.id,
    username: data.username,
    displayName: data.displayName || data.username,
    bio: data.bio || "",
    location: data.location || "",
    website: data.website || "",
    theme: data.theme || "vice",
    plan: isPlanId(data.plan) ? data.plan : DEFAULT_PLAN,
    // Cosmetic perks everyone can see (badge, gradient name, halo).
    flair: publicFlair(data.perks),
    // Perks Shop purchases, only sent to the owner (never to other viewers).
    perks: currentUser?.uid === doc.id ? cleanPerks(data.perks) : [],
    isPrivate: data.prefs?.account?.isPrivate === true,
    avatarUrl: data.avatarUrl || null,
    bannerUrl: data.bannerUrl || null,
    joined: formatJoined(created),
  };
}

// All posts by one author (matched on the post's `user` handle), plus
// totals for the stats row. Sorted in memory so no composite index is needed.
export async function fetchUserPosts(username, currentUid) {
  schedulePollPurge();
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
  // Extra detail for the profile's dropdown cards: what the posts are made of
  // and which one led each count.
  const byType = new Map();
  const top = { likes: null, comments: null, saves: null };
  const consider = (key, doc, n) => {
    if (n > 0 && (!top[key] || n > top[key].n)) {
      const d = doc.data();
      top[key] = {
        id: doc.id,
        n,
        label: String(d.title || d.text || "Untitled post").replace(/\s+/g, " ").slice(0, 70),
      };
    }
  };
  for (const doc of docs) {
    const d = doc.data();
    const l = (d.likedBy || []).length;
    const sv = (d.savedBy || []).length;
    const cm = d.comments || 0;
    likes += l;
    saves += sv;
    comments += cm;
    const type = TYPES[d.type] ? d.type : "post";
    byType.set(type, (byType.get(type) || 0) + 1);
    consider("likes", doc, l);
    consider("comments", doc, cm);
    consider("saves", doc, sv);
  }

  const authors = await loadAuthors(db, docs);
  const posts = docs
    .map((doc) => mapPostDoc(doc, currentUid, authors))
    .sort(
      (a, b) =>
        Number(b.settings.pinned) - Number(a.settings.pinned) ||
        b.createdAtMs - a.createdAtMs
    );

  const breakdown = [...byType.entries()]
    .map(([type, n]) => ({ type, label: TYPES[type].label, n }))
    .sort((a, b) => b.n - a.n);

  return {
    posts,
    stats: { posts: posts.length, likes, comments, saves },
    insights: { breakdown, top },
  };
}
