import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { THEMES } from "@/lib/profile-themes";

const IMG_PREFIX = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_AVATAR = 150_000; // chars of data URL
const MAX_BANNER = 600_000;

function cleanWebsite(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString().slice(0, 120);
  } catch {
    return null;
  }
}

// Owner-only profile update. Image fields: omitted = unchanged,
// null = remove, string = new data URL.
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user || !user.username) {
    return NextResponse.json(
      { error: "You need to be signed in to edit your profile." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const displayName = String(body.displayName ?? "").trim();
  const bio = String(body.bio ?? "").trim();
  const location = String(body.location ?? "").trim();
  const website = cleanWebsite(body.website);
  const theme = String(body.theme ?? "vice");

  if (!displayName || displayName.length > 40) {
    return NextResponse.json(
      { error: "Display name is required (max 40 characters)." },
      { status: 400 }
    );
  }
  if (bio.length > 160) {
    return NextResponse.json(
      { error: "Bio can be at most 160 characters." },
      { status: 400 }
    );
  }
  if (location.length > 40) {
    return NextResponse.json(
      { error: "Location can be at most 40 characters." },
      { status: 400 }
    );
  }
  if (website === null) {
    return NextResponse.json(
      { error: "That website link doesn't look valid." },
      { status: 400 }
    );
  }
  if (!THEMES.some((t) => t.id === theme)) {
    return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
  }

  const update = {
    username: user.username,
    usernameLower: user.username.toLowerCase(),
    displayName,
    bio,
    location,
    website,
    theme,
    updatedAt: FieldValue.serverTimestamp(),
  };

  for (const [key, max] of [
    ["avatarUrl", MAX_AVATAR],
    ["bannerUrl", MAX_BANNER],
  ]) {
    if (body[key] === undefined) continue;
    if (body[key] === null) {
      update[key] = null;
      if (key === "avatarUrl") update.hasAvatar = false;
      continue;
    }
    const value = String(body[key]);
    if (!IMG_PREFIX.test(value) || value.length > max) {
      return NextResponse.json(
        { error: "That image is invalid or too large." },
        { status: 400 }
      );
    }
    update[key] = value;
    if (key === "avatarUrl") update.hasAvatar = true;
  }

  try {
    const ref = getAdminDb().collection("users").doc(user.uid);
    await ref.set(update, { merge: true });
    const saved = (await ref.get()).data();
    return NextResponse.json({
      ok: true,
      profile: {
        displayName: saved.displayName,
        bio: saved.bio || "",
        location: saved.location || "",
        website: saved.website || "",
        theme: saved.theme || "vice",
        avatarUrl: saved.avatarUrl || null,
        bannerUrl: saved.bannerUrl || null,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Couldn't save your profile right now." },
      { status: 500 }
    );
  }
}
