import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPlan, setUserPlan } from "@/lib/user-plan";
import { FREE_WHILE_TESTING, getPlan, isPlanId } from "@/lib/plans";

export const dynamic = "force-dynamic";

// GET -> { plan } for the signed-in user (free plan when signed out).
export async function GET() {
  const user = await getCurrentUser();
  const plan = await getUserPlan(user?.uid);
  return NextResponse.json({ plan });
}

// POST { plan } -> switches the signed-in user's plan.
// While FREE_WHILE_TESTING is true every plan is free to switch to. When you
// turn it off, paid plans are refused here until a payment step is added.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Log in to change your plan." },
      { status: 401 }
    );
  }

  const body = await request.json().catch(() => ({}));
  if (!isPlanId(body?.plan)) {
    return NextResponse.json({ error: "Unknown plan." }, { status: 400 });
  }

  const target = getPlan(body.plan);
  if (!FREE_WHILE_TESTING && target.price > 0) {
    return NextResponse.json(
      { error: "Paid plans can’t be started yet." },
      { status: 402 }
    );
  }

  try {
    await setUserPlan(user.uid, target.id);
    return NextResponse.json({ ok: true, plan: target.id });
  } catch {
    return NextResponse.json(
      { error: "Couldn’t change your plan. Try again." },
      { status: 500 }
    );
  }
}
