import { NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { LIMITS, VIDEO_TYPES } from "@/lib/post-schema";

export const runtime = "nodejs";

// POST { size, type } -> a 20-minute signed PUT URL so the browser can send
// the video straight to Firebase Storage (Vercel functions cap bodies at 4.5 MB).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Sign in to upload video." }, { status: 401 });
  }

  const bucket = getAdminBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "Video uploads aren’t switched on for this site yet. Paste a YouTube link instead." },
      { status: 501 }
    );
  }

  const { size, type } = (await request.json().catch(() => ({}))) || {};
  if (!VIDEO_TYPES.includes(type)) {
    return NextResponse.json({ error: "Use an MP4, MOV or WebM video." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > LIMITS.videoMB * 1024 * 1024) {
    return NextResponse.json({ error: `Videos can be at most ${LIMITS.videoMB} MB.` }, { status: 400 });
  }

  // The object name is the post id we will later publish under.
  const postId = getAdminDb().collection("posts").doc().id;
  const [uploadUrl] = await bucket.file(`videos/${user.uid}/${postId}`).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 20 * 60 * 1000,
    contentType: type,
  });
  return NextResponse.json({ postId, uploadUrl, contentType: type });
}
