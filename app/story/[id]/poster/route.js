import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { cleanAudience } from "@/lib/story-schema";
import { canWatchStoryData } from "@/lib/story-access";

export const runtime = "nodejs";

const DATA = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

// The thumbnail for a story card: the photo itself, or a video's first frame.
export async function GET(_request, { params }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return new Response("Not found", { status: 404 });

  const ref = getAdminDb().collection("stories").doc(id);
  const [snap, media] = await Promise.all([ref.get(), ref.collection("media").doc("0").get()]);
  const data = snap.data();
  const m = media.exists && DATA.exec(media.data().data || "");
  if (!data || !m || (data.expiresAt?.toMillis?.() ?? 0) <= Date.now()) {
    return new Response("Not found", { status: 404 });
  }
  let cache = "public, max-age=600";
  if (cleanAudience(data.audience) !== "public") {
    const viewer = await getCurrentUser();
    if (!(await canWatchStoryData(getAdminDb(), data, viewer?.uid))) {
      return new Response("Not found", { status: 404 });
    }
    cache = "private, max-age=300";
  }
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": cache },
  });
}
