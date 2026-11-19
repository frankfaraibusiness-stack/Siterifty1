import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { HttpError } from "@/lib/chat-social";
import { createAd, listMine, listOrders, setStatus, topUp, updateAd } from "@/lib/ads-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const snapshot = async (uid) => {
  const [ads, orders] = await Promise.all([listMine(uid), listOrders(uid)]);
  return { ads, orders };
};

// GET -> the signed-in advertiser's ads and payment history.
export async function GET() {
  try {
    const user = await requireUser();
    return ok(await snapshot(user.uid));
  } catch (err) {
    return fail(err);
  }
}

// POST { action, ... } -> create | update | pause | resume | end | topup.
// Always answers with the fresh list so the Ads Manager can redraw at once.
export async function POST(request) {
  try {
    const user = await requireUser();
    const body = await readJson(request);
    let id = body.id;
    switch (body.action) {
      case "create": id = await createAd(user, body); break;
      case "update": await updateAd(user, body.id, body); break;
      case "pause":
      case "resume":
      case "end": await setStatus(user, body.id, body.action); break;
      case "topup": await topUp(user, body.id, body.budgetCents); break;
      default: throw new HttpError(400, "Unknown action.");
    }
    return ok({ id, ...(await snapshot(user.uid)) });
  } catch (err) {
    return fail(err);
  }
}
