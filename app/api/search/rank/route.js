import { NextResponse } from "next/server";
import { recordSearch } from "@/lib/search-rank";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { q } -> adds +1 to that keyword's search rank (see lib/search-rank.js).
// Called by components/search/SearchTracker.js after a search that found something.
// Answers straight away: the count is written in the background.
export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.q !== "string") {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
  const counted = recordSearch(body.q, ip);
  return NextResponse.json({ ok: true, counted }, { headers: { "Cache-Control": "no-store" } });
}
