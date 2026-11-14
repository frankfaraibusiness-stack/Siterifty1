import { Readable } from "node:stream";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

export const runtime = "nodejs";

// Streams an uploaded video from Firebase Storage with HTTP Range support so
// browsers can seek and iOS Safari will play it. Authors only for private posts.
export async function GET(request, { params }) {
  const { postId } = await params;
  const bucket = getAdminBucket();
  if (!bucket || !/^[A-Za-z0-9_-]{1,100}$/.test(postId)) {
    return new Response("Not found", { status: 404 });
  }

  const snap = await getAdminDb().collection("posts").doc(postId).get();
  const data = snap.data();
  if (!data || data.media?.kind !== "storage") return new Response("Not found", { status: 404 });

  const isPrivate = data.settings?.visibility === "private";
  const live = (data.createdAt?.toMillis?.() ?? 0) <= Date.now();
  if (isPrivate || !live) {
    const user = await getCurrentUser();
    if (!user || user.uid !== data.uid) return new Response("Not found", { status: 404 });
  }

  const file = bucket.file(`videos/${data.uid}/${postId}`);
  let meta;
  try {
    [meta] = await file.getMetadata();
  } catch {
    return new Response("Not found", { status: 404 });
  }
  const size = Number(meta.size);
  const type = meta.contentType || "video/mp4";

  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get("range") || "");
  let start = 0;
  let end = size - 1;
  if (range) {
    if (range[1] === "" && range[2] !== "") {
      start = Math.max(0, size - Number(range[2]));
    } else {
      start = Number(range[1] || 0);
      if (range[2] !== "") end = Math.min(end, Number(range[2]));
    }
    if (start > end || start >= size) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    }
  }

  const stream = Readable.toWeb(file.createReadStream({ start, end }));
  return new Response(stream, {
    status: range ? 206 : 200,
    headers: {
      "Content-Type": type,
      "Content-Length": String(end - start + 1),
      "Accept-Ranges": "bytes",
      ...(range && { "Content-Range": `bytes ${start}-${end}/${size}` }),
      "Cache-Control": isPrivate || !live ? "private, no-store" : "public, max-age=3600",
    },
  });
}
