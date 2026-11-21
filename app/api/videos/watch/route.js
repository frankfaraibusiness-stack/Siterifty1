import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordWatch } from "@/lib/video-stats-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { watch: [{ postId, seconds, duration, viewed }] }
// Sent by the reel when a viewer swipes away from a clip or leaves the page (often with sendBeacon, so the
// body arrives as text). One entry per clip: the seconds the browser counted in memory and whether the
// 2 second "view" mark was reached. The server checks and caps everything (lib/video-stats-data.js).
export async function POST(request) {
  try {
    const body = JSON.parse(await request.text());
    const user = await getCurrentUser().catch(() => null);
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    await recordWatch({ uid: user?.uid || null, viewerKey: user?.uid || ip, entries: body?.watch });
  } catch (err) {
    console.error("[videos/watch]", err);
  }
  return new NextResponse(null, { status: 204 });
}
