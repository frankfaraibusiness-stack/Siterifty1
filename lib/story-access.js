import "server-only";
import { getRelations } from "@/lib/chat-social";
import { canWatchStory, cleanAudience } from "@/lib/story-schema";

// Server-side gate for story privacy (the pure rule is canWatchStory in
// lib/story-schema.js). Every route that reads a story goes through here, so a
// friends-only story can't be opened by guessing its media URL either.

// Map(ownerUid -> { isFriend, isFollower }) for how `viewerUid` stands with each owner.
async function standing(db, viewerUid, ownerUids) {
  const out = new Map();
  if (!viewerUid) return out;
  const rels = await getRelations(db, viewerUid, ownerUids);
  for (const [uid, r] of rels) out.set(uid, { isFriend: r.friend === "friends", isFollower: !!r.following });
  return out;
}

// Keeps only the story docs this viewer may watch (one batched relation read).
export async function filterWatchable(db, docs, viewerUid) {
  const owners = new Set();
  for (const doc of docs) {
    const d = doc.data();
    if (cleanAudience(d.audience) !== "public" && d.uid !== viewerUid) owners.add(d.uid);
  }
  const rel = owners.size ? await standing(db, viewerUid, [...owners]) : new Map();
  return docs.filter((doc) => {
    const d = doc.data();
    const r = rel.get(d.uid) || {};
    return canWatchStory({ audience: d.audience, isOwner: !!viewerUid && d.uid === viewerUid, ...r });
  });
}

// One story's data -> may this viewer watch it?
export async function canWatchStoryData(db, data, viewerUid) {
  if (cleanAudience(data.audience) === "public") return true;
  if (viewerUid && data.uid === viewerUid) return true;
  if (!viewerUid) return false;
  const r = (await standing(db, viewerUid, [data.uid])).get(data.uid) || {};
  return canWatchStory({ audience: data.audience, isOwner: false, ...r });
}
