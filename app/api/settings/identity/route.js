import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { cleanIdentityPatch, isCountryCode } from "@/lib/countries";

export const runtime = "nodejs";
const NO_STORE = { "Cache-Control": "no-store" };

// PUT { country?, gender? } -> changes the member's own country and/or gender (Settings > Character).
// Country is detected at sign-up from the IP address, which a VPN can throw off, so members can correct it.
// Who gets to see each one is a separate setting (PUT /api/settings, section "account").
export async function PUT(request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const clean = cleanIdentityPatch(body);
  if (!clean.ok) return NextResponse.json({ error: clean.error }, { status: 400 });

  try {
    const ref = getAdminDb().collection("users").doc(user.uid);
    await ref.set({ ...clean.patch, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    const saved = (await ref.get()).data() || {};
    return NextResponse.json(
      {
        ok: true,
        country: isCountryCode(saved.country) ? saved.country : null,
        gender: saved.gender === "female" || saved.gender === "male" ? saved.gender : null,
      },
      { headers: NO_STORE }
    );
  } catch {
    return NextResponse.json({ error: "Couldn’t save that right now." }, { status: 500 });
  }
}
