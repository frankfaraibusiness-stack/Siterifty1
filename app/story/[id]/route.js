import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { streamStorageFile } from "@/lib/stream-storage";

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
  const cache = "public, max-age=600";

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
