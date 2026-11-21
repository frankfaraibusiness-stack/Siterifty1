import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { streamStorageFile } from "@/lib/stream-storage";
import { getCurrentUser } from "@/lib/current-user";
import { cleanAudience } from "@/lib/story-schema";
import { canWatchStoryData } from "@/lib/story-access";

export const runtime = "nodejs";

const DATA = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

// Serves a story's photo, or streams its video clip (with Range support).
export async function GET(request, { params }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9]{1,40}$/.test(id)) return new Response("Not found", { status: 404 });

  const ref = getAdminDb().collection("stories").doc(id);
  const snap = await ref.get();
  const data = snap.data();
  if (!data || (data.expiresAt?.toMillis?.() ?? 0) <= Date.now()) {
    return new Response("Not found", { status: 404 });
  }
  // Public stories can be cached by anyone; the rest only by the signed-in viewer's own
  // browser, and only after the audience check.
  let cache = "public, max-age=600";
  if (cleanAudience(data.audience) !== "public") {
    const viewer = await getCurrentUser();
    if (!(await canWatchStoryData(getAdminDb(), data, viewer?.uid))) {
      return new Response("Not found", { status: 404 });
    }
    cache = "private, max-age=300";
  }

  if (data.kind === "video") {
    const bucket = getAdminBucket();
    if (!bucket) return new Response("Not found", { status: 404 });
    return streamStorageFile(request, bucket.file(`stories/${data.uid}/${id}`), cache);
  }

  const media = await ref.collection("media").doc("0").get();
  const m = media.exists && DATA.exec(media.data().data || "");
  if (!m) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(m[2], "base64"), {
    headers: { "Content-Type": m[1], "Cache-Control": cache },
  });
}
