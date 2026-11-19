import { getAdminDb } from "@/lib/firebase-admin";
import { brandImage } from "@/lib/watermark";

// Serves community images as real files so page HTML never carries base64.
//   /cmedia/{communityId}/avatar | banner
//   /cmedia/{communityId}/p/{postId}/{n}     (members of private communities only)
export async function GET(request, { params }) {
  const { path } = await params;
  const [cid, kind, postId, n] = path;
  const db = getAdminDb();
  const cref = db.collection("communities").doc(cid);
  let snap;
  if ((kind === "avatar" || kind === "banner") && path.length === 2) {
    snap = await cref.collection("assets").doc(kind).get();
  } else if (kind === "p" && path.length === 4 && /^\d$/.test(n)) {
    const c = await cref.get();
    if (!c.exists) return new Response("Not found", { status: 404 });
    if (c.data().privacy === "private") {
      const { getCurrentUser } = await import("@/lib/current-user");
      const user = await getCurrentUser();
      const m = user && (await cref.collection("members").doc(user.uid).get());
      if (!m?.exists) return new Response("Members only", { status: 403 });
    }
    snap = await cref.collection("posts").doc(postId).collection("media").doc(n).get();
  } else return new Response("Not found", { status: 404 });

  const match = snap?.exists && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(snap.data().data || "");
  if (!match) return new Response("Not found", { status: 404, headers: { "Cache-Control": "public, max-age=30" } });
  const isPost = kind === "p";
  // Post photos get the logo stamped on; avatars and banners stay as uploaded.
  const out = isPost ? await brandImage(Buffer.from(match[2], "base64"), match[1]) : { buffer: Buffer.from(match[2], "base64"), mime: match[1] };
  return new Response(out.buffer, {
    headers: {
      "Content-Type": out.mime,
      "Cache-Control": isPost ? "private, max-age=3600" : "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
