import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { recordTrack } from "@/lib/analytics-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { seen: [token, ...], click?: token }. The browser sends back ONLY the opaque tokens the
// server signed when it served those posts (lib/track-token.js). It can't say what was seen,
// where, by whom or what the post was about: that all lives inside the signed token, and
// recordTrack re-checks every signature. Sent with sendBeacon, so the body arrives as text.
export async function POST(request) {
  try {
    const body = JSON.parse(await request.text());
    const user = await getCurrentUser().catch(() => null);
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    await recordTrack({
      seen: Array.isArray(body.seen) ? body.seen.filter((t) => typeof t === "string") : [],
      click: typeof body.click === "string" ? body.click : null,
      uid: user?.uid || null,
      viewerKey: user?.uid || ip,
    });
  } catch (err) {
    console.error("[posts/track]", err);
  }
  return new NextResponse(null, { status: 204 });
}
