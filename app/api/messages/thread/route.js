import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getThread } from "@/lib/messages-data";
import { HttpError } from "@/lib/chat-social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/thread?with=handle | id=convId
//   &since=ms   -> incremental poll (changed messages only)
//   &before=ms  -> older messages
//   &read=1     -> the chat is open: mark incoming messages delivered + seen
//   &meta=1     -> include the person, permissions and presence again
export async function GET(request) {
  try {
    const user = await requireUser();
    const p = new URL(request.url).searchParams;
    const id = p.get("id");
    const handle = p.get("with");
    if (!id && !handle) throw new HttpError(400, "Say who the chat is with.");
    const num = (k) => (p.get(k) != null && p.get(k) !== "" ? Number(p.get(k)) : null);
    return ok(
      await getThread(user, {
        id: id || null,
        with: handle,
        since: num("since"),
        before: num("before"),
        read: p.get("read") === "1",
        meta: p.get("meta") === "1",
      })
    );
  } catch (err) {
    return fail(err);
  }
}
