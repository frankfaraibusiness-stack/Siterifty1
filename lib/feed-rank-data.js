import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { authorHides, canView, loadAuthors, mapPostDoc } from "@/lib/feed-data";
import { getPool } from "@/lib/recommend-data";
import { loadInterests } from "@/lib/interests-data";
import { getFollowingUids } from "@/lib/social-data";
import { applyViewerFilters } from "@/lib/viewer-filters";
import { schedulePollPurge } from "@/lib/poll-expiry";
import { makeSeed, rankFeed } from "@/lib/feed-rank";
import { matchesType } from "@/lib/feed-types";

// The home feed's "For you" order (see lib/feed-rank.js for how a post is scored).
//
// Candidates are the newest 30 posts read live (so a post made a second ago is always
// there) plus the shared pool of the newest ~150 posts that is cached for a minute for
// every visitor (so a busy site pays for it once, not once per visit). One read for the
// member's interest profile and one for who they follow. Returns { posts, hidden },
// the same shape the home page already uses for the plain feed.
const LIVE = 30;

// `type` ("all" or one post format) is applied before ranking, so a filtered feed is still ranked.
export async function fetchForYou({ currentUid = null, prefs, limit = 30, seed = makeSeed(), type = "all" } = {}) {
  schedulePollPurge();
  const db = getAdminDb();
  const [pool, interests, following, liveSnap] = await Promise.all([
    getPool(),
    loadInterests(currentUid),
    currentUid ? getFollowingUids(currentUid).catch(() => []) : [],
    db.collection("posts").where("createdAt", "<=", Timestamp.now()).orderBy("createdAt", "desc").limit(LIVE).get(),
  ]);

  // Live copies win over the cached ones (likes, deletes), and their authors are added to the pool's.
  const byId = new Map(pool.docs.map((d) => [d.id, d]));
  const extra = liveSnap.docs.filter((d) => !(d.data().uid && pool.authors.byUid.has(d.data().uid)));
  for (const d of liveSnap.docs) byId.set(d.id, d);
  const more = extra.length ? await loadAuthors(db, extra) : { byUid: new Map(), byName: new Map() };
  const authors = {
    byUid: new Map([...pool.authors.byUid, ...more.byUid]),
    byName: new Map([...pool.authors.byName, ...more.byName]),
  };

  const followSet = new Set(following);
  const mapped = [...byId.values()]
    .filter((doc) => canView(doc.data(), currentUid) && matchesType(doc.data(), type) && !authorHides(doc.data(), authors, currentUid))
    .map((doc) => ({ ...mapPostDoc(doc, currentUid, authors), followed: followSet.has(doc.data().uid) }));

  const { posts, hidden } = applyViewerFilters(mapped, prefs);
  return { posts: rankFeed(posts, interests, { seed, limit }).map((r) => r.post), hidden };
}
