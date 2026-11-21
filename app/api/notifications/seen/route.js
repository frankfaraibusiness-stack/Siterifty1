import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getAdminDb } from "@/lib/firebase-admin";
import { clearActivity } from "@/lib/notifications-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/notifications/seen
// The member opened their own profile: new likes and comments (the red badge
// on the header picture) count as seen.
export async function POST() {
  try {
    const user = await requireUser();
    await clearActivity(getAdminDb(), user.uid);
    return ok({ ok: true });
  } catch (err) {
    return fail(err);
  }
}
