import { isCharacterId } from "@/lib/characters";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { findTheme, isPerkTheme } from "@/lib/profile-themes";
import { getUserPerks } from "@/lib/user-perks";
import { bioMax, getPerk, hasPerk } from "@/lib/perks";

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
  // Perks Shop: Big Bio raises the bio limit from 160 to 400 characters.
  const perks = await getUserPerks(user.uid);
  const maxBio = bioMax(perks);
  if (bio.length > maxBio) {
    return NextResponse.json(
      { error: `Bio can be at most ${maxBio} characters.` },
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
  if (!findTheme(theme)) {
    return NextResponse.json({ error: "Unknown theme." }, { status: 400 });
  }
  // Perks Shop: exclusive accents need the theme pack they belong to.
  if (isPerkTheme(theme)) {
    const needed = findTheme(theme).perk;
    if (!hasPerk(perks, needed)) {
      return NextResponse.json(
        { error: `That accent comes with the ${getPerk(needed)?.name || "theme pack"} in the Perks Shop.` },
        { status: 403 }
      );
    }
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

  // An account that started as Lucia or Jason falls back to that picture when its own photo is removed.
  let hasCharacter = false;
  if (body.avatarUrl === null) {
    const cur = await getAdminDb().collection("users").doc(user.uid).get();
    hasCharacter = isCharacterId(cur.data()?.character);
  }

  for (const [key, max] of [
    ["avatarUrl", MAX_AVATAR],
    ["bannerUrl", MAX_BANNER],
  ]) {
    if (body[key] === undefined) continue;
    if (body[key] === null) {
      update[key] = null;
      if (key === "avatarUrl") update.hasAvatar = hasCharacter;
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
