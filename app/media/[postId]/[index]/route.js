import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";

// Serves a post's image (posts/{id}/media/{n}) as a real, cacheable image so
// feed HTML never carries base64. Private posts are only served to their author.
export async function GET(_request, { params }) {
  const { postId, index } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(postId) || !/^\d$/.test(index)) {
    return new Response("Not found", { status: 404 });
  }

  const db = getAdminDb();
  const ref = db.collection("posts").doc(postId);
  const [post, img] = await Promise.all([ref.get(), ref.collection("media").doc(index).get()]);
  const m = img.exists && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(img.data().data || "");
  if (!post.exists || !m) return new Response("Not found", { status: 404 });

  const data = post.data();
  const isPrivate = data.settings?.visibility === "private";
  const live = (data.createdAt?.toMillis?.() ?? 0) <= Date.now();
  if (isPrivate || !live) {
    const user = await getCurrentUser();
    if (!user || user.uid !== data.uid) return new Response("Not found", { status: 404 });
  }

  return new Response(Buffer.from(m[2], "base64"), {
    headers: {
      "Content-Type": m[1],
      "Cache-Control": isPrivate || !live
        ? "private, no-store"
        : "public, max-age=31536000, immutable",
    },
  });
}
