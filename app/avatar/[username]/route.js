import { getAdminDb } from "@/lib/firebase-admin";

// Serves a user's avatar as a real image so search results don't have to
// embed base64 data in the page.
export async function GET(_request, { params }) {
  const { username } = await params;
  const snap = await getAdminDb()
    .collection("users")
    .where("usernameLower", "==", String(username).toLowerCase())
    .limit(1)
    .get();

  const url = snap.docs[0]?.data()?.avatarUrl;
  const match = url && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(url);
  if (!match) {
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }

  return new Response(Buffer.from(match[2], "base64"), {
    headers: {
      "Content-Type": match[1],
      "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
    },
  });
}
