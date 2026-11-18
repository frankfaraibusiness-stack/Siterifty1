import { NextResponse } from "next/server";
import { FieldPath, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{1,40}$/;
const LIST_MAX = 500; // people shown to the owner, newest first

function fail(error, status = 400) {
  return NextResponse.json({ error }, { status });
}

// Hearts are stored on the story itself: stories/{id}.hearts.{uid} = { username, at }.
// The count is just how many entries there are, so it can never drift, and the
// hearts disappear together with the story (delete, or the 24h/72h expiry).

// POST { id, liked } -> sets your heart on someone else's story. Sending the
// state you want (not "toggle") makes repeated or raced taps harmless.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) return fail("Sign in to heart stories.", 401);

  const body = await request.json().catch(() => null);
  if (!body || typeof body.id !== "string" || !ID.test(body.id) || typeof body.liked !== "boolean") return fail("Invalid request.");

  const ref = getAdminDb().collection("stories").doc(body.id);
  const snap = await ref.get();
  if (!snap.exists) return fail("That story is gone.", 404);
  const data = snap.data();
  if (data.uid === user.uid) return fail("You can’t heart your own story.");
  const ends = data.expiresAt?.toMillis?.();
  if (ends && ends <= Date.now()) return fail("That story has ended.", 410);

  const already = !!data.hearts?.[user.uid];
  if (already === body.liked) return NextResponse.json({ ok: true, liked: body.liked });

  try {
    // FieldPath, so a uid is always one key and never read as a dotted path.
    const mine = new FieldPath("hearts", user.uid);
    if (body.liked) await ref.update(mine, { username: user.username, at: Timestamp.now() });
    else await ref.update(mine, FieldValue.delete());
  } catch {
    return fail("That story is gone.", 404); // deleted while the request was in flight
  }
  return NextResponse.json({ ok: true, liked: body.liked });
}

// GET ?id= -> { count, likers: [{ username, atMs }] }, for the story's owner only.
export async function GET(request) {
  const user = await getCurrentUser();
  if (!user) return fail("Sign in first.", 401);

  const id = new URL(request.url).searchParams.get("id") || "";
  if (!ID.test(id)) return fail("Invalid request.");

  const snap = await getAdminDb().collection("stories").doc(id).get();
  if (!snap.exists) return fail("That story is gone.", 404);
  const data = snap.data();
  if (data.uid !== user.uid) return fail("Only the person who posted a story can see who hearted it.", 403);

  const hearts = Object.values(data.hearts || {});
  const likers = hearts
    .map((h) => ({ username: String(h.username || ""), atMs: h.at?.toMillis?.() ?? 0 }))
    .filter((h) => h.username)
    .sort((a, b) => b.atMs - a.atMs)
    .slice(0, LIST_MAX);
  return NextResponse.json({ count: hearts.length, likers }, { headers: { "Cache-Control": "no-store" } });
}
