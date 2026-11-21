import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { findUserByUsername, listPeople } from "@/lib/social-data";
import { clearNewFollowers } from "@/lib/notifications-data";

const TYPES = new Set(["followers", "following", "friends"]);

// GET /api/social/list?username=...&type=followers|following|friends
// Private accounts keep these lists to themselves.
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const type = params.get("type");
  if (!TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const db = getAdminDb();
  const [user, target] = await Promise.all([
    getCurrentUser(),
    findUserByUsername(db, params.get("username")),
  ]);
  if (!target) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }
  if (target.prefs?.account?.isPrivate === true && user?.uid !== target.uid) {
    return NextResponse.json({ error: "This account is private." }, { status: 403 });
  }

  try {
    const people = await listPeople(target.uid, type);
    // Opening your own Followers list clears the "new follower" badge.
    if (type === "followers" && user?.uid === target.uid) {
      await clearNewFollowers(db, user.uid);
    }
    return NextResponse.json({ people }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Couldn't load that list." }, { status: 500 });
  }
}
