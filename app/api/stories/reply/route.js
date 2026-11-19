import { NextResponse } from "next/server";
import { FieldPath, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { cleanText } from "@/lib/post-schema";
import { STORY, repliesAreOn } from "@/lib/story-schema";
import { canWatchStoryData } from "@/lib/story-access";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{1,40}$/;
const LIST_MAX = 200;

function fail(error, status = 400) {
  return NextResponse.json({ error }, { status });
}

// Replies live on the story itself: stories/{id}.replies.{replyId} = { uid, username, text, at }.
// Like hearts, they vanish with the story, and only its owner can read them.

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
  const snap = await ref.get();
  if (!snap.exists) return fail("That story is gone.", 404);
  const data = snap.data();
  const ends = data.expiresAt?.toMillis?.();
  if (ends && ends <= Date.now()) return fail("That story has ended.", 410);
  if (data.uid === user.uid) return fail("You can’t reply to your own story.");
  if (!(await canWatchStoryData(db, data, user.uid))) return fail("That story is gone.", 404);
  if (!repliesAreOn(data)) return fail("Replies are turned off for this story.", 403);

  const existing = Object.values(data.replies || {});
  if (existing.length >= STORY.repliesPerStory) return fail("This story has all the replies it can hold.", 429);
  if (existing.filter((r) => r.uid === user.uid).length >= STORY.repliesPerPerson) {
    return fail(`You’ve already left ${STORY.repliesPerPerson} replies on this story.`, 429);
  }

  const replyId = db.collection("stories").doc().id;
  try {
    // FieldPath keeps the id one key, never a dotted path.
    await ref.update(new FieldPath("replies", replyId), { uid: user.uid, username: user.username, text, at: Timestamp.now() });
  } catch {
    return fail("That story is gone.", 404); // deleted while the request was in flight
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
