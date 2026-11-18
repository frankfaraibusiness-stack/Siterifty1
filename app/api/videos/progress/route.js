import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { getProgress, submitEvents } from "@/lib/videos-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/videos/progress?tz=...   the member's rank, XP, streak and today's missions
export async function GET(request) {
  try {
    const user = await requireUser();
    return ok(await getProgress(user, { tz: new URL(request.url).searchParams.get("tz") }));
  } catch (err) {
    return fail(err);
  }
}

// POST /api/videos/progress { tz, events: [{ type, postId, seconds?, duration? }] }
//   type: watch | like | save | comment | share | package | skip
// The browser only reports what happened. The server checks each claim
// (lib/videos-engine.js), pays what it can verify and sends back the new state.
export async function POST(request) {
  try {
    const user = await requireUser();
    const b = await readJson(request);
    return ok(await submitEvents(user, b.events, { tz: b.tz }));
  } catch (err) {
    return fail(err);
  }
}
