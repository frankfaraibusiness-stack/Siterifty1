import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getCrew, searchPeople } from "@/lib/chat-social";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/people?q=handle -> people matching the handle, each with
//   how you're connected and whether you can message them.
// GET /api/messages/people          -> your crew: friends, people you follow,
//   and pending friend requests.
export async function GET(request) {
  try {
    const user = await requireUser();
    const q = new URL(request.url).searchParams.get("q");
    if (q && q.trim()) return ok({ results: await searchPeople(user.uid, q) });
    return ok({ crew: await getCrew(user.uid) });
  } catch (err) {
    return fail(err);
  }
}
