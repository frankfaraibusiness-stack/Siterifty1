import "server-only";
import { after } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { pollExpired } from "@/lib/poll-rules";

// Visit-based clean-up of expired polls. There is no cron job: whenever someone
// loads the feed, a profile or a post, this looks for polls whose end time has
// passed and deletes them (the post, its comments and everything under it).
// Expired polls are already hidden by canView in lib/feed-data.js, so nobody
// sees one in the meantime.
//
// One range query on poll.endsAt (Firestore indexes that single field on its
// own, so no composite index is needed). Polls that never expire have
// endsAt: null and are never matched.

const BATCH = 25; // per run; the next visit picks up the rest
const MIN_GAP_MS = 15_000; // at most one sweep every 15s per server instance

let lastRun = 0;
let running = null;

export function purgeExpiredPolls({ force = false } = {}) {
  if (running) return running;
  const now = Date.now();
  if (!force && now - lastRun < MIN_GAP_MS) return Promise.resolve(0);
  lastRun = now;
  running = (async () => {
    try {
      const db = getAdminDb();
      const snap = await db
        .collection("posts")
        .where("poll.endsAt", "<=", Timestamp.fromMillis(now))
        .limit(BATCH)
        .get();
      const dead = snap.docs.filter((doc) => pollExpired(doc.data(), now));
      await Promise.all(dead.map((doc) => db.recursiveDelete(doc.ref)));
      return dead.length;
    } catch {
      return 0; // a failed sweep just means the next visit tries again
    }
  })().finally(() => {
    running = null;
  });
  return running;
}

// Run the sweep after the response has gone out, so it never slows a page down.
export function schedulePollPurge() {
  try {
    after(() => purgeExpiredPolls());
  } catch {
    purgeExpiredPolls(); // outside a request: just start it
  }
}
