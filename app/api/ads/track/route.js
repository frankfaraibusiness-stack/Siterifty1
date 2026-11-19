import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { track } from "@/lib/ads-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// POST { adId, source, event: "view" | "click" }. Sent with sendBeacon (text/plain),
// so the body is read as text. Never blocks the page and never reveals anything.
export async function POST(request) {
  try {
    const body = JSON.parse(await request.text());
    const user = await getCurrentUser().catch(() => null);
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    await track({
      adId: body.adId,
      source: body.source,
      event: body.event,
      viewerUid: user?.uid || null,
      viewerKey: user?.uid || ip,
    });
  } catch (err) {
    console.error("[ads/track]", err);
  }
  return new NextResponse(null, { status: 204 });
}
