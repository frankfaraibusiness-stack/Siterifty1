import { Readable } from "node:stream";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan } from "@/lib/user-plan";
import { canDownloadVideos } from "@/lib/plans";

export const runtime = "nodejs";

// Streams an uploaded video from Firebase Storage with HTTP Range support so
// browsers can seek and iOS Safari will play it. Authors only for private posts.
//
// `?download=1` sends the whole file as an attachment instead. That is for plan
// members only (free accounts and guests get a 403), checked here on the server.
const EXT = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const noStore = { "Cache-Control": "private, no-store" };

export async function GET(request, { params }) {
  const { postId } = await params;
  const wantsDownload = new URL(request.url).searchParams.get("download") === "1";
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

  if (wantsDownload) {
    const user = await getCurrentUser();
    if (!user?.uid) return new Response("Log in to download videos.", { status: 401, headers: noStore });
    if (!canDownloadVideos(await getUserPlan(user.uid))) {
      return new Response("Downloads are for plan members.", { status: 403, headers: noStore });
    }
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

  if (wantsDownload) {
    const who = String(data.user || "clip").replace(/[^A-Za-z0-9_-]/g, "") || "clip";
    const name = `gtafanbase-${who}-${postId}.${EXT[type] || "mp4"}`;
    return new Response(Readable.toWeb(file.createReadStream()), {
      status: 200,
      headers: {
        "Content-Type": type,
        "Content-Length": String(size),
        "Content-Disposition": `attachment; filename="${name}"`,
        ...noStore,
      },
    });
  }

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
