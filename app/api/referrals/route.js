import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getReferralDashboard } from "@/lib/referrals-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/referrals  the signed-in member's code, totals and the people they referred.
// Read-only: payouts are made by the server when a referred member's XP reaches the target.
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await getReferralDashboard(user));
  } catch (err) {
    return fail(err);
  }
}
