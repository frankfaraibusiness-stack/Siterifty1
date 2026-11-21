import { getAdminDb } from "@/lib/firebase-admin";
import { CHARACTER_SVG, isCharacterId } from "@/lib/characters";

export const runtime = "nodejs";

// Serves a user's avatar as a real image so search results don't have to
// embed base64 data in the page. A photo they uploaded wins; an account that
// has none shows its character (Lucia or Jason).
const pngCache = new Map(); // character id -> Buffer

// Link previews (Discord, X, iMessage) do not accept SVG, so the character is sent as a PNG.
async function characterPng(id) {
  if (pngCache.has(id)) return pngCache.get(id);
  const { default: sharp } = await import("sharp");
  const png = await sharp(Buffer.from(CHARACTER_SVG[id]), { density: 144 }).resize(512, 512).png().toBuffer();
  pngCache.set(id, png);
  return png;
}

export async function GET(_request, { params }) {
  const { username } = await params;
  const snap = await getAdminDb()
    .collection("users")
    .where("usernameLower", "==", String(username).toLowerCase())
    .limit(1)
    .get();

  const data = snap.docs[0]?.data();
  const url = data?.avatarUrl;
  const match = url && /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(url);
  if (match) {
    return new Response(Buffer.from(match[2], "base64"), {
      headers: {
        "Content-Type": match[1],
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
      },
    });
  }

  if (isCharacterId(data?.character)) {
    const id = data.character;
    try {
      return new Response(await characterPng(id), {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      });
    } catch {
      // The PNG step needs the image library; the SVG itself always works in a browser.
      return new Response(CHARACTER_SVG[id], {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        },
      });
    }
  }

  return new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "public, max-age=60" },
  });
}
