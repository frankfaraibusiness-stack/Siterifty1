import { fail, ok, requireUser } from "@/lib/api-helpers";
import { getSummary } from "@/lib/messages-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/summary[?ping=1]
// The cheap check-in every open page makes: unread + friend-request counts,
// marks waiting messages "delivered", optionally records "online".
export async function GET(request) {
  try {
    const user = await requireUser();
    const ping = new URL(request.url).searchParams.get("ping") === "1";
    return ok(await getSummary(user, { ping }));
  } catch (err) {
    return fail(err);
  }
}
