import { NextResponse } from "next/server";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { cleanText } from "@/lib/post-schema";
import { STORY, repliesAreOn } from "@/lib/story-schema";
import { canWatchStoryData } from "@/lib/story-access";
import { notify } from "@/lib/notif-pool-data";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{1,40}$/;
const RID = /^[A-Za-z0-9]{8,40}$/; // the reply's own id, made by the browser
const REPEAT_MS = 30_000; // the same words from the same person this soon are the same reply
const LIST_MAX = 200;

function fail(error, status = 400) {
  return NextResponse.json({ error }, { status });
}

// Replies live on the story itself: stories/{id}.replies.{replyId} = { uid, username, text, at }.
// Like hearts, they vanish with the story, and only its owner can read them. A copy is also filed in
// the owner's Notifications chat (a notification pool), so the reply can still be read once the story has expired.

// POST { id, text } -> leaves a reply on someone else's story.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return fail("Sign in to reply to stories.", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !ID.test(body.id)) return fail("Invalid request.");
  const text = cleanText(body.text, STORY.reply).replace(/\s*\n+\s*/g, " ");
  if (!text) return fail("Write something first.");

  const db = getAdminDb();
  const ref = db.collection("stories").doc(body.id);
  // The browser names each reply. Sending the same reply again (double tap, retry after a bad connection)
  // reuses that name, so it lands on the same spot instead of adding another one.
  const replyId = typeof body.rid === "string" && RID.test(body.rid) ? body.rid : db.collection("stories").doc().id;

  // Checked and written in ONE transaction, so two requests arriving together can't both pass the limits.
  let problem = null;
  let added = null; // set when THIS request stored the reply (not a repeat of one that was already there)
  try {
    await db.runTransaction(async (tx) => {
      problem = null; // a retried transaction starts clean
      added = null;
      const snap = await tx.get(ref);
      if (!snap.exists) { problem = ["That story is gone.", 404]; return; }
      const data = snap.data();
      const ends = data.expiresAt?.toMillis?.();
      if (ends && ends <= Date.now()) { problem = ["That story has ended.", 410]; return; }
      if (data.uid === user.uid) { problem = ["You can’t reply to your own story."]; return; }
      if (!(await canWatchStoryData(db, data, user.uid))) { problem = ["That story is gone.", 404]; return; }
      if (!repliesAreOn(data)) { problem = ["Replies are turned off for this story.", 403]; return; }

      const replies = data.replies || {};
      if (replies[replyId]) return; // this exact reply is already there: done, nothing added
      const mine = Object.values(replies).filter((r) => r.uid === user.uid);
      const now = Date.now();
      // Same person, same words, moments ago (e.g. a retry that lost its id): the same reply.
      if (mine.some((r) => r.text === text && now - (r.at?.toMillis?.() ?? 0) < REPEAT_MS)) return;
      if (Object.keys(replies).length >= STORY.repliesPerStory) { problem = ["This story has all the replies it can hold.", 429]; return; }
      if (mine.length >= STORY.repliesPerPerson) {
        problem = [`You’ve already left ${STORY.repliesPerPerson} replies on this story.`, 429];
        return;
      }
      // FieldPath keeps the id one key, never a dotted path.
      tx.update(ref, new FieldPath("replies", replyId), { uid: user.uid, username: user.username, text, at: Timestamp.now() });
      added = { ownerUid: data.uid, kind: data.kind, expiresMs: data.expiresAt?.toMillis?.() ?? null };
    });
  } catch {
    return fail("Couldn’t send that reply. Try again.", 500);
  }
  if (problem) return fail(problem[0], problem[1] || 400);
  // The owner's Notifications chat keeps its own copy, which outlives the story (lib/notif-pool-data.js).
  if (added) {
    await notify(db, added.ownerUid, "story", { uid: user.uid, username: user.username }, { rid: replyId, sid: body.id, sk: added.kind, se: added.expiresMs, x: text });
  }
  return NextResponse.json({ ok: true });
}

// GET ?id= -> { count, repliesOn, replies: [{ id, username, text, atMs }] }, for the story's owner only.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!ID.test(id)) return fail("Invalid request.");

  const snap = await getAdminDb().collection("stories").doc(id).get();
  if (!snap.exists) return fail("That story is gone.", 404);
  const data = snap.data();
  if (data.uid !== user.uid) return fail("Only the person who posted a story can read its replies.", 403);

  const all = Object.entries(data.replies || {})
    .map(([rid, r]) => ({ id: rid, username: String(r.username || ""), text: String(r.text || ""), atMs: r.at?.toMillis?.() ?? 0 }))
    .filter((r) => r.username && r.text)
    .sort((a, b) => b.atMs - a.atMs);
  return NextResponse.json(
    { count: all.length, repliesOn: repliesAreOn(data), replies: all.slice(0, LIST_MAX) },
    { headers: { "Cache-Control": "no-store" } }
  );
}
