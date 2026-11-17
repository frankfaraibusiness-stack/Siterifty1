import "server-only";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { HttpError } from "@/lib/chat-social";

export const NO_STORE = { "Cache-Control": "no-store" };

// The signed-in member (with a handle), or a 401.
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user?.username) throw new HttpError(401, "Sign in first.");
  return user;
}

export async function readJson(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    throw new HttpError(400, "Invalid request.");
  }
}

export const ok = (data) => NextResponse.json(data, { headers: NO_STORE });

// Turns anything thrown into a clean JSON error response.
export function fail(err) {
  if (err instanceof HttpError) {
    return NextResponse.json({ error: err.message, ...(err.data || {}) }, { status: err.status, headers: NO_STORE });
  }
  console.error("[api]", err);
  return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500, headers: NO_STORE });
}
