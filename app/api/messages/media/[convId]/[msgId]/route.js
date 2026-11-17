import { getCurrentUser } from "@/lib/current-user";
import { getMessageImage } from "@/lib/messages-data";

export const runtime = "nodejs";

// Serves a photo sent in a chat. Only the two people in the chat can open it.
export async function GET(_request, { params }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Sign in first.", { status: 401 });
  const { convId, msgId } = await params;
  try {
    const img = await getMessageImage(user, convId, msgId);
    if (!img) return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, max-age=30" } });
    return new Response(img.buffer, {
      headers: {
        "Content-Type": img.mime,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
