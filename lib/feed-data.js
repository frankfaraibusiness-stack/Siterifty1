import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { formatCount } from "@/lib/format-count";
import { getTheme } from "@/lib/profile-themes";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";
import { publicFlair } from "@/lib/perks";
import { serializeEvent } from "@/lib/event-rules";

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

// The author's *current* look (theme colours, profile picture, plan) is read
// from users/{uid} every time posts are shown, so changing your profile picture
// or plan updates all your old posts. `avatarA`/`avatarB` stored on the post are
// only a fallback for authors whose profile can't be found.
const AUTHOR_FIELDS = [
  "username",
  "usernameLower",
  "theme",
  "hasAvatar",
  "updatedAt",
  "plan",
  "perks",
  "prefs.account.isPrivate",
  "prefs.safety.discoverable",
];

function toAuthor(snap) {
  const d = snap.data();
  const t = getTheme(d.theme);
  return {
    a: t.a,
    b: t.b,
    hasAvatar: d.hasAvatar !== false,
    avatarV: d.updatedAt?.toMillis?.() ?? 0,
    plan: isPlanId(d.plan) ? d.plan : DEFAULT_PLAN,
    flair: publicFlair(d.perks),
    isPrivate: d.prefs?.account?.isPrivate === true,
    discoverable: d.prefs?.safety?.discoverable !== false,
  };
}

export function authorOf(data, authors) {
  return (
    (data.uid && authors?.byUid.get(data.uid)) ||
    authors?.byName.get(String(data.user || "").toLowerCase()) ||
    null
  );
}

// Private accounts (Settings > Character) keep every post out of the feed,
// search and post pages for everyone but themselves. `search` also honours
// "Show me in search".
export function authorHides(data, authors, currentUid, { search = false } = {}) {
  if (currentUid && data.uid === currentUid) return false;
  const author = authorOf(data, authors);
  if (!author) return false;
  if (author.isPrivate) return true;
  return search && author.discoverable === false;
}

// Looks up the authors of a batch of post docs in one go.
// Returns { byUid, byName } maps used by mapPostDoc.
export async function loadAuthors(db, docs) {
  const byUid = new Map();
  const byName = new Map();

  const uids = new Set();
  const names = new Set();
  for (const doc of docs) {
    const d = doc.data();
    if (d.uid) uids.add(d.uid);
    else if (d.user) names.add(String(d.user).toLowerCase());
  }

  const uidList = [...uids];
  if (uidList.length) {
    const snaps = await db.getAll(
      ...uidList.map((u) => db.collection("users").doc(u)),
      { fieldMask: AUTHOR_FIELDS }
    );
    for (const snap of snaps) if (snap.exists) byUid.set(snap.id, toAuthor(snap));
  }

  // Older posts only stored the handle, so find those authors by username.
  const nameList = [...names];
  for (let i = 0; i < nameList.length; i += 30) {
    const snap = await db
      .collection("users")
      .where("usernameLower", "in", nameList.slice(i, i + 30))
      .select(...AUTHOR_FIELDS)
      .get();
    for (const doc of snap.docs) byName.set(doc.data().usernameLower, toAuthor(doc));
  }

  return { byUid, byName };
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

export function mapPostDoc(doc, currentUid, authors) {
  const data = doc.data();
  const author =
    (data.uid && authors?.byUid.get(data.uid)) ||
    authors?.byName.get(String(data.user || "").toLowerCase()) ||
    null;
  const likedBy = data.likedBy || [];
  const savedBy = data.savedBy || [];
  const createdAt = data.createdAt?.toDate?.() ?? null;
  const isOwner = !!currentUid && data.uid === currentUid;
  // Counts, guest names and hidden pins are all worked out here, per viewer.
  const event = data.type === "event" ? serializeEvent(data, { uid: currentUid, isOwner }) : null;

  return {
    id: doc.id,
    user: data.user,
    initial: initials(data.user),
    avatarA: author?.a || data.avatarA || "#2de2c5",
    avatarB: author?.b || data.avatarB || "#1b6fa8",
    hasAvatar: author?.hasAvatar ?? false,
    avatarV: author?.avatarV ?? 0,
    plan: author?.plan || null,
    flair: author?.flair || [],
    location: event?.spotHidden ? "Real world" : data.location || "",
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
    event,
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
    isOwner,
    scheduled: createdAt ? createdAt.getTime() > Date.now() : false,
    likesBase: formatCount(likedBy.length),
    likesCount: likedBy.length,
    likedByMe: currentUid ? likedBy.includes(currentUid) : false,
    savedByMe: currentUid ? savedBy.includes(currentUid) : false,
    comments: data.comments || 0,
    shares: data.shares || 0,
  };
}

// stories/{id}: { uid, username, kind: "image"|"video", seconds, caption,
// createdAt, expiresAt }. Older console-made docs (no `kind`) are colour cards.
function mapStoryDoc(doc, currentUid) {
  const data = doc.data();
  const createdAt = data.createdAt?.toMillis?.() ?? 0;
  return {
    id: doc.id,
    username: data.username || "",
    kind: data.kind === "image" || data.kind === "video" ? data.kind : "gradient",
    seconds: data.seconds || 5,
    caption: data.caption || "",
    createdAtMs: createdAt,
    mine: !!currentUid && data.uid === currentUid,
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

  const live = snap.docs.filter((doc) => canView(doc.data(), currentUid));
  const authors = await loadAuthors(db, live);
  return live
    .filter((doc) => !authorHides(doc.data(), authors, currentUid))
    .map((doc) => mapPostDoc(doc, currentUid, authors));
}

// Newest posts by a set of authors (the "Following" feed). Firestore "in"
// queries take 30 values, so the list is split; each chunk is sorted in memory,
// which keeps this free of composite indexes.
export async function fetchPostsByUids({ currentUid, uids, limit = 30 } = {}) {
  const list = [...new Set(uids || [])];
  if (list.length === 0) return [];
  const db = getAdminDb();
  const chunks = [];
  for (let i = 0; i < list.length; i += 30) chunks.push(list.slice(i, i + 30));
  const snaps = await Promise.all(
    chunks.map((chunk) =>
      db.collection(POSTS_COLLECTION).where("uid", "in", chunk).limit(100).get()
    )
  );
  const seen = new Set();
  const live = snaps
    .flatMap((snap) => snap.docs)
    .filter((doc) => {
      if (seen.has(doc.id)) return false;
      seen.add(doc.id);
      return canView(doc.data(), currentUid);
    })
    .sort(
      (a, b) =>
        (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0)
    )
    .slice(0, limit);
  const authors = await loadAuthors(db, live);
  return live
    .filter((doc) => !authorHides(doc.data(), authors, currentUid))
    .map((doc) => mapPostDoc(doc, currentUid, authors));
}

// One post by id (for /p/[id]), or null when missing or not visible.
export async function fetchPostById(id, currentUid) {
  if (!id || id.includes("/")) return null;
  const db = getAdminDb();
  const doc = await db.collection(POSTS_COLLECTION).doc(id).get();
  if (!doc.exists || !canView(doc.data(), currentUid)) return null;
  const authors = await loadAuthors(db, [doc]);
  if (authorHides(doc.data(), authors, currentUid)) return null;
  return mapPostDoc(doc, currentUid, authors);
}

// Stories stay up for 24 hours. Newest first; the rail groups them by person.
export async function fetchStories({ currentUid, limit = 60 } = {}) {
  const db = getAdminDb();
  const snap = await db
    .collection(STORIES_COLLECTION)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  const now = Date.now();
  return snap.docs
    .filter((doc) => {
      const d = doc.data();
      if (d.kind !== "image" && d.kind !== "video") return true; // legacy colour cards
      return (d.expiresAt?.toMillis?.() ?? 0) > now;
    })
    .map((doc) => mapStoryDoc(doc, currentUid));
}
