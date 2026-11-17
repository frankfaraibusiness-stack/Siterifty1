import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getPrefs } from "@/lib/user-prefs";
import { fetchRecommendations } from "@/lib/recommend-data";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9_-]{1,64}$/;

// GET ?exclude=<postId>&before=<ms> -> { items, next, more }
// The next page of "More to explore" for a post's own page. `before` is the
// `next` of the page before it; leave it out for the first page. Same
// visibility rules and the same Leak Filter as the main feed.
export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const exclude = sp.get("exclude") || "";
  const beforeRaw = sp.get("before");
  const before = beforeRaw == null || beforeRaw === "" ? null : Number(beforeRaw);
  if ((exclude && !ID.test(exclude)) || (before !== null && (!Number.isFinite(before) || before <= 0))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const user = await getCurrentUser();
    const prefs = await getPrefs(user?.uid);
    const page = await fetchRecommendations({ currentUid: user?.uid || null, prefs, excludeId: exclude, before });
    return NextResponse.json(page, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("recommend failed", err);
    return NextResponse.json({ error: "Couldn’t load more posts." }, { status: 500 });
  }
}
