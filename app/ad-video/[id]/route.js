import { videoFile } from "@/lib/ads-data";
import { streamStorageFile } from "@/lib/stream-storage";

export const runtime = "nodejs";

// Streams a video ad with Range support so browsers can play it (iOS Safari needs it).
export async function GET(request, { params }) {
  const file = await videoFile((await params).id);
  if (!file) return new Response("Not found", { status: 404 });
  return streamStorageFile(request, file, "public, max-age=3600");
}
