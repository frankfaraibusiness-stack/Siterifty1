import { NextResponse } from "next/server";
import { serveAd } from "@/lib/ads-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET ?placement=feed|community|stories|videos|messages&exclude=id,id -> { ad } with ONE random live ad
// (or { ad: null } when nothing is running). Public: no sign-in needed.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const placement = searchParams.get("placement") || "";
  const exclude = (searchParams.get("exclude") || "").split(",").filter((s) => /^[A-Za-z0-9_-]{1,40}$/.test(s)).slice(-20);
  try {
    const ad = await serveAd(placement, exclude);
    return NextResponse.json({ ad }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("[ads/serve]", err);
    return NextResponse.json({ ad: null }, { headers: { "Cache-Control": "no-store" } });
  }
}
