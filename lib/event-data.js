import "server-only";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorHides, canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { schedulePollPurge } from "@/lib/poll-expiry";

// Every event the viewer is allowed to see, as feed-ready posts. One equality
// filter on `type` (Firestore's automatic single-field index), so no composite
// index is needed; ordering and filtering happen in lib/event-filters.js.
export async function fetchEvents({ currentUid, limit = 300 } = {}) {
  const db = getAdminDb();
  const snap = await db.collection("posts").where("type", "==", "event").limit(limit).get();
  const live = snap.docs.filter((doc) => canView(doc.data(), currentUid));
  const authors = await loadAuthors(db, live);
  return live
    .filter((doc) => !authorHides(doc.data(), authors, currentUid))
    .map((doc) => mapPostDoc(doc, currentUid, authors));
}

// Posts the viewer saved. `array-contains` on one field needs no composite
// index; newest first is done in memory.
export async function fetchSavedPosts({ currentUid, limit = 100 } = {}) {
  if (!currentUid) return [];
  schedulePollPurge();
  const db = getAdminDb();
  const snap = await db.collection("posts").where("savedBy", "array-contains", currentUid).limit(300).get();
  const live = snap.docs
    .filter((doc) => canView(doc.data(), currentUid))
    .sort((a, b) => (b.data().createdAt?.toMillis?.() ?? 0) - (a.data().createdAt?.toMillis?.() ?? 0))
    .slice(0, limit);
  const authors = await loadAuthors(db, live);
  return live
    .filter((doc) => !authorHides(doc.data(), authors, currentUid))
    .map((doc) => mapPostDoc(doc, currentUid, authors));
}
