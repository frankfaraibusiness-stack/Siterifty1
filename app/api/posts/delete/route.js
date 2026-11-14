import { NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

// POST { postId } -> deletes your own post, its media, comments and video file.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const { postId } = (await request.json().catch(() => ({}))) || {};
  if (typeof postId !== "string" || !postId || postId.includes("/")) {
    return NextResponse.json({ error: "Missing postId." }, { status: 400 });
  }

  const db = getAdminDb();
  const ref = db.collection("posts").doc(postId);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: true });

  const data = snap.data();
  const mine = data.uid ? data.uid === user.uid : data.user === user.username;
  if (!mine) return NextResponse.json({ error: "That isn’t your post." }, { status: 403 });

  if (data.media?.kind === "storage") {
    try {
      await getAdminBucket()?.file(`videos/${data.uid}/${postId}`).delete({ ignoreNotFound: true });
    } catch {
      // The post still gets deleted; an orphaned file can be cleaned up later.
    }
  }
  await db.recursiveDelete(ref);
  return NextResponse.json({ ok: true });
}
