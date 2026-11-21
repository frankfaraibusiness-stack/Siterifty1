import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { fetchCommunityPosts } from "@/lib/community-data";

export const runtime = "nodejs";

const ID = /^[A-Za-z0-9]{1,64}$/;

// GET ?communityId=&before= -> { posts, more, next }: the next page of older
// posts. Same visibility as the community page: public communities can be read
// by anyone, private ones only by their members.
export async function GET(request) {
  const sp = new URL(request.url).searchParams;
  const communityId = sp.get("communityId") || "";
  const before = Number(sp.get("before"));
  if (!ID.test(communityId) || !Number.isFinite(before) || before <= 0) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const csnap = await db.collection("communities").doc(communityId).get();
  if (!csnap.exists) return NextResponse.json({ error: "That community doesn’t exist any more." }, { status: 404 });

  const user = await getCurrentUser();
  if (csnap.data().privacy === "private") {
    const member = user ? await csnap.ref.collection("members").doc(user.uid).get() : null;
    if (!member?.exists) return NextResponse.json({ error: "This community is private." }, { status: 403 });
  }

  const page = await fetchCommunityPosts(communityId, user?.uid || null, { before });
  return NextResponse.json({ ok: true, ...page }, { headers: { "Cache-Control": "no-store" } });
}
