import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { normalizePrefs } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const iso = (ts) => ts?.toDate?.()?.toISOString?.() ?? null;

// GET -> downloads a JSON copy of your profile, settings and posts.
// Profile pictures and post photos are left out to keep the file small.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  const db = getAdminDb();
  const [userSnap, postSnap] = await Promise.all([
    db.collection("users").doc(user.uid).get(),
    db.collection("posts").where("uid", "==", user.uid).limit(1000).get(),
  ]);
  const u = userSnap.data() || {};

  const data = {
    exportedAt: new Date().toISOString(),
    account: { username: user.username, email: user.email },
    profile: {
      displayName: u.displayName || user.username,
      bio: u.bio || "",
      location: u.location || "",
      website: u.website || "",
      theme: u.theme || "vice",
      plan: u.plan || "drifter",
      perks: Array.isArray(u.perks) ? u.perks : [],
      joined: iso(u.createdAt),
    },
    settings: normalizePrefs(u.prefs),
    posts: postSnap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          type: d.type || "post",
          title: d.title || "",
          text: d.text || "",
          tags: d.tags || [],
          location: d.location || "",
          settings: d.settings || {},
          likes: (d.likedBy || []).length,
          comments: d.comments || 0,
          createdAt: iso(d.createdAt),
        };
      })
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="gtafanbase-${user.username || "me"}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
