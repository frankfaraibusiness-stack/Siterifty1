import { fail, ok } from "@/lib/api-helpers";
import { getCurrentUser } from "@/lib/current-user";
import { getFeed } from "@/lib/videos-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/videos?mode=hot|new|following&cursor=...&tz=MINUTES_EAST_OF_UTC&start=POST_ID
// `start` (first page only) puts that clip first, so a video opened from elsewhere plays first.
// A page of clips. Open to guests (they can watch, they just don't earn).
export async function GET(request) {
  try {
    const sp = new URL(request.url).searchParams;
    const user = await getCurrentUser();
    return ok(
      await getFeed(user?.username ? user : null, {
        mode: sp.get("mode") || "hot",
        cursor: sp.get("cursor") || "",
        tz: sp.get("tz"),
        start: sp.get("start") || "",
      })
    );
  } catch (err) {
    return fail(err);
  }
}

