import { NextResponse } from "next/server";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { STORY, STORY_VIDEO_TYPES } from "@/lib/story-schema";

export const runtime = "nodejs";

// POST { size, type, seconds } -> a short-lived signed PUT URL so the browser can
// send a story clip straight to Firebase Storage (Vercel caps request bodies).
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json({ error: "Sign in to add a story." }, { status: 401 });
  }

  const bucket = getAdminBucket();
  if (!bucket) {
    return NextResponse.json(
      { error: "Video uploads aren’t switched on for this site yet. Share a photo instead." },
      { status: 501 }
    );
  }

  const { size, type, seconds } = (await request.json().catch(() => ({}))) || {};
  if (!STORY_VIDEO_TYPES.includes(type)) {
    return NextResponse.json({ error: "Use an MP4, MOV or WebM video." }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > STORY.maxVideoMB * 1024 * 1024) {
    return NextResponse.json({ error: `Story clips can be at most ${STORY.maxVideoMB} MB.` }, { status: 400 });
  }
  if (!Number.isFinite(seconds) || seconds <= 0 || seconds > STORY.maxSeconds + STORY.secondsTolerance) {
    return NextResponse.json({ error: `Story clips can be ${STORY.maxSeconds} seconds or less.` }, { status: 400 });
  }

  const storyId = getAdminDb().collection("stories").doc().id;
  const [uploadUrl] = await bucket.file(`stories/${user.uid}/${storyId}`).getSignedUrl({
    version: "v4",
    action: "write",
    expires: Date.now() + 10 * 60 * 1000,
    contentType: type,
  });
  return NextResponse.json({ storyId, uploadUrl, contentType: type });
}
