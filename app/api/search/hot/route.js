import { NextResponse } from "next/server";
import { getHotTerms } from "@/lib/search-rank";

export const runtime = "nodejs";

// GET -> { terms: [{ q, up }] }: the most searched keywords, hottest first.
// Same for everybody, so the CDN / browser may keep it for a minute.
export async function GET() {
  const terms = await getHotTerms();
  return NextResponse.json(
    { terms },
    { headers: { "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=300" } }
  );
}
