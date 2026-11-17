import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPerks, grantPerk } from "@/lib/user-perks";
import { PERKS_FREE_WHILE_TESTING, getPerk, isPerkId } from "@/lib/perks";

export const dynamic = "force-dynamic";

// GET -> { perks } the signed-in user owns (empty when signed out).
export async function GET() {
  const user = await getCurrentUser();
  const perks = await getUserPerks(user?.uid);
  return NextResponse.json({ perks });
}

// POST { perk } -> unlocks a perk for the signed-in user.
// While PERKS_FREE_WHILE_TESTING is true every perk unlocks for $0. When you
// turn it off, paid perks are refused here until a payment step is added.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Log in to get a perk." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!isPerkId(body?.perk)) {
    return NextResponse.json({ error: "Unknown perk." }, { status: 400 });
  }
  const perk = getPerk(body.perk);

  if (!PERKS_FREE_WHILE_TESTING && perk.price > 0) {
    return NextResponse.json(
      { error: "Paid perks can’t be bought yet." },
      { status: 402 }
    );
  }

  try {
    await grantPerk(user.uid, perk.id);
    const perks = await getUserPerks(user.uid);
    return NextResponse.json({ ok: true, perk: perk.id, perks });
  } catch {
    return NextResponse.json(
      { error: "Couldn’t unlock that perk. Try again." },
      { status: 500 }
    );
  }
}
