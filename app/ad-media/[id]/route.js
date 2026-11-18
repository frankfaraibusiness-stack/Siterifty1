import { imageBytes } from "@/lib/ads-data";

export const runtime = "nodejs";

// An uploaded ad image (or a video ad's poster). The URL carries ?v=, which
// changes whenever the image is replaced, so it can be cached for a year.
export async function GET(_request, { params }) {
  const img = await imageBytes((await params).id);
  if (!img) return new Response("Not found", { status: 404 });
  return new Response(img.buffer, {
    headers: { "Content-Type": img.mime, "Cache-Control": "public, max-age=31536000, immutable" },
  });
}
