import { getAdminDb } from "@/lib/firebase-admin";
import { HttpError, findActorByHandle, loadActor } from "@/lib/chat-social";
import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { getWalletMills, publicRecipient, assertCanGift, sendGift } from "@/lib/gifts-data";
import { cleanHandleInput } from "@/lib/gifts";

export const dynamic = "force-dynamic";

// Refuses requests that come from another website (defence in depth on top of
// the SameSite=Lax session cookie).
function sameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

// GET /api/gifts            -> { balanceMills } the signed-in member's wallet
// GET /api/gifts?handle=x   -> { recipient } when @x can receive a gift from you
export async function GET(request) {
  try {
    const user = await requireUser();
    const raw = new URL(request.url).searchParams.get("handle");
    if (raw === null) return ok({ balanceMills: await getWalletMills(user.uid) });

    const handle = cleanHandleInput(raw);
    if (!handle) throw new HttpError(400, "Handles are 3 to 20 letters, numbers, dots or underscores.");
    const db = getAdminDb();
    const [me, target] = await Promise.all([loadActor(db, user.uid), findActorByHandle(db, handle)]);
    if (!me) throw new HttpError(404, "Account not found.");
    if (!target) throw new HttpError(404, `We couldn’t find @${handle}.`);
    assertCanGift(me, target);
    return ok({ recipient: publicRecipient(target) });
  } catch (err) {
    return fail(err);
  }
}

// POST { giftId, to?, context?: { type, postId?, commentId? }, note?, requestId }
// Charges the wallet (price + fees, decided on the server) and records the gift.
export async function POST(request) {
  try {
    if (!sameOrigin(request)) throw new HttpError(403, "Request blocked.");
    const user = await requireUser();
    const body = await readJson(request);
    const result = await sendGift(user, {
      giftId: body.giftId,
      to: typeof body.to === "string" ? body.to : "",
      context: body.context,
      note: body.note,
      requestId: body.requestId,
    });
    return ok(result);
  } catch (err) {
    return fail(err);
  }
}
