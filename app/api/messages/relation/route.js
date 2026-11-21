import { fail, ok, requireUser } from "@/lib/api-helpers";
import { HttpError, cleanHandle, findActorByHandle, relationSnapshot } from "@/lib/chat-social";
import { getAdminDb } from "@/lib/firebase-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/messages/relation?username=handle
// -> { rel: { following, followsYou, friend }, perm: { ok, code, reason, need } }
// The follow / friend buttons in Messages change things through
// /api/social/follow and /api/social/friend, then ask this for the new picture
// (including whether messaging is now allowed).
export async function GET(request) {
  try {
    const user = await requireUser();
    const handle = cleanHandle(new URL(request.url).searchParams.get("username"));
    if (!handle) throw new HttpError(400, "Say who.");
    const target = await findActorByHandle(getAdminDb(), handle);
    if (!target) throw new HttpError(404, "Member not found.");
    return ok(await relationSnapshot(user.uid, target.uid));
  } catch (err) {
    return fail(err);
  }
}
