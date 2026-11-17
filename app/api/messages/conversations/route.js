import { fail, ok, requireUser } from "@/lib/api-helpers";
import { listConversations } from "@/lib/messages-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/conversations -> the signed-in member's chat list.
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await listConversations(user.uid));
  } catch (err) {
    return fail(err);
  }
}
