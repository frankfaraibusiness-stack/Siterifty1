import { fail, ok, readJson, requireUser } from "@/lib/api-helpers";
import { videoUploadSlot } from "@/lib/ads-data";

export const runtime = "nodejs";

// POST { size, type } -> a 20-minute signed PUT URL for a video ad. The browser
// sends the file straight to Firebase Storage. `postId` carries the new ad id so
// the shared uploadVideo() helper can be reused.
export async function POST(request) {
  try {
    const user = await requireUser();
    const { size, type } = await readJson(request);
    const slot = await videoUploadSlot(user, { size, type });
    return ok({ ...slot, postId: slot.adId });
  } catch (err) {
    return fail(err);
  }
}
