import { fail, ok, requireUser } from "@/lib/api-helpers";
import { listNotifications } from "@/lib/notif-pool-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/notifications[?before=pool][&read=1]
// The Notifications chat: likes, comments, replies, new followers, friend requests and story
// replies, newest first. Read from the member's notification pools (lib/notif-pool.js), so a page
// costs a handful of reads however many notifications it holds. `before` is the `next` of the
// previous page; `read=1` on the first page marks everything as seen.
export async function GET(request) {
  try {
    const user = await requireUser();
    const sp = new URL(request.url).searchParams;
    const raw = sp.get("before");
    const before = raw !== null && raw !== "" && Number.isInteger(Number(raw)) && Number(raw) >= 0 ? Number(raw) : null;
    return ok(await listNotifications(user, { before, read: sp.get("read") === "1" }));
  } catch (err) {
    return fail(err);
  }
}
