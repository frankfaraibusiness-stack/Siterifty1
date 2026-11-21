import "server-only";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { canView } from "@/lib/feed-data";
import { learnFromSignals } from "@/lib/interests-data";
import { signalsOf } from "@/lib/interests";
import { RP, cleanWatchEntries, maxSecondsFor, watchDelta } from "@/lib/video-stats";

// Views, watch time and RP for clips, written to the post doc itself.
//
//   posts/{id}.reelViews   +1 per viewer once they really watched 2 seconds
//   posts/{id}.watchSecs   seconds watched, added once per viewing (swipe away / leave the page)
//   posts/{id}.rp          rank power (see lib/video-stats.js)
//
// The browser counts the time in memory and sends ONE entry per clip when the viewer leaves it, so a
// 90 second clip watched to the end is a single +90 write, not 90. All entries of a request are applied
// in ONE batched write. The browser reports; the server decides what is believable:
//   - the clip must exist, be a playable upload and be visible to this viewer; your own clips never count
//   - seconds are capped by the clip's real length (a few loops at most), and by how much real time has
//     passed since this viewer's last report
//   - the same viewer re-watching the same clip within 30 minutes adds watch time, but no extra view / RP
//   - a per-minute cap per viewer so one client can't flood the endpoint

const inc = FieldValue.increment;
const isClip = (d) => d.type === "video" && d.media?.type === "video" && d.media?.kind === "storage";

const VIEW_WINDOW = 30 * 60_000;
const recentViews = new Map();
function viewedRecently(key, now) {
  const t = recentViews.get(key);
  if (t && now - t < VIEW_WINDOW) return true;
  recentViews.set(key, now);
  if (recentViews.size > 10_000) for (const [k, at] of recentViews) if (now - at > VIEW_WINDOW) recentViews.delete(k);
  return false;
}

const lastReport = new Map(); // viewerKey -> ms
const buckets = new Map(); // viewerKey -> { at, n }
function overLimit(viewerKey, n, now) {
  const b = buckets.get(viewerKey);
  if (!b || now - b.at > 60_000) {
    buckets.set(viewerKey, { at: now, n });
    return n > 60;
  }
  b.n += n;
  return b.n > 60;
}

export async function recordWatch({ uid = null, viewerKey, entries }) {
  const list = cleanWatchEntries(entries);
  if (!list.length) return { counted: 0 };
  const now = Date.now();
  if (overLimit(viewerKey, list.length, now)) return { counted: 0 };

  const db = getAdminDb();
  const snaps = await db.getAll(...list.map((e) => db.collection("posts").doc(e.postId)), {
    fieldMask: ["uid", "type", "media", "settings", "createdAt", "poll", "tags", "tag", "title", "text", "user"],
  });

  // Real time that has passed since this viewer's last report is the budget for the seconds they claim.
  const since = lastReport.get(viewerKey);
  lastReport.set(viewerKey, now);
  if (lastReport.size > 10_000) for (const [k, at] of lastReport) if (now - at > 3_600_000) lastReport.delete(k);
  let budget = since ? Math.min(900, (now - since) / 1000) * 1.5 + 30 : Infinity;

  const batch = db.batch();
  const learnView = [];
  const learnSkip = [];
  let counted = 0;

  snaps.forEach((snap, i) => {
    const e = list[i];
    const d = snap.exists ? snap.data() : null;
    if (!d || !isClip(d) || !canView(d, uid)) return;
    if (uid && d.uid === uid) return; // your own clip never counts
    const duration = Number(d.media?.seconds) || e.duration;

    let seconds = Math.min(e.seconds, maxSecondsFor(duration));
    if (seconds > budget) seconds = Math.max(0, budget);
    budget -= seconds;

    const delta = watchDelta({ seconds, duration, viewed: e.viewed });
    if (!delta.views) {
      // Swiped away within a second or two: a gentle "not for me" for the For you reel.
      if (uid && seconds < 1.5 && duration >= 6) learnSkip.push(signalsOf({ ...d, type: "video" }));
      return;
    }
    // Same viewer, same clip, soon after: keep the watch time, but it isn't a new view and earns no new RP.
    if (viewedRecently(`rv|${viewerKey}|${e.postId}`, now)) {
      delta.views = 0;
      delta.rp = 0;
    }
    const patch = { watchSecs: inc(delta.watchSecs) };
    if (delta.views) patch.reelViews = inc(delta.views);
    if (delta.rp) patch.rp = inc(delta.rp);
    batch.update(snap.ref, patch);
    counted += 1;
    if (uid && delta.ratio >= 0.5 && !delta.finished) learnView.push(signalsOf({ ...d, type: "video" }));
  });

  const writes = [];
  if (counted) writes.push(batch.commit());
  if (learnView.length) writes.push(learnFromSignals(uid, learnView.slice(0, 10), "view"));
  if (learnSkip.length) writes.push(learnFromSignals(uid, learnSkip.slice(0, 3), "skip"));
  await Promise.all(writes);
  return { counted };
}

// RP for an engagement on any post (like, save, comment, share). Returns the field patch to merge into
// whatever write is already happening, so engagement never costs an extra write.
export function rpPatch(kind, undo = false) {
  const n = RP[kind] || 0;
  return n ? { rp: inc(undo ? -n : n) } : {};
}
