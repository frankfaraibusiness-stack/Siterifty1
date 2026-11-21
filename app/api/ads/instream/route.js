import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { completeInstreamView, serveInstreamAd } from "@/lib/instream-ads-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

// POST { action: "serve", postId, idx, exclude?: [adId] }  -> { ad, token, seconds } or { ad: null }
// POST { action: "complete", token }                       -> { credited }
// "serve" is asked when an ad break of a monetized Long form video is due; "complete" when that ad has played
// long enough to count as a view. The server decides everything (see lib/instream-ads-data.js): this route only
// works out who is asking. Open to guests (they watch, the creator earns).
export async function POST(request) {
  try {
    const body = JSON.parse(await request.text());
    const user = await getCurrentUser().catch(() => null);
    const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    const who = { viewerUid: user?.uid || null, viewerKey: user?.uid || ip };

    if (body?.action === "complete") {
      return NextResponse.json(await completeInstreamView({ token: body.token, ...who }), { headers: NO_STORE });
    }
    if (body?.action === "serve") {
      const exclude = Array.isArray(body.exclude) ? body.exclude.filter((s) => typeof s === "string").slice(-5) : [];
      return NextResponse.json(await serveInstreamAd({ postId: body.postId, idx: body.idx, exclude, ...who }), { headers: NO_STORE });
    }
  } catch (err) {
    console.error("[ads/instream]", err);
  }
  // Whatever went wrong, the video just plays on without an ad.
  return NextResponse.json({ ad: null, credited: false }, { headers: NO_STORE });
}
