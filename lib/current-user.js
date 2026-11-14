import "server-only";
import { cookies } from "next/headers";
import { getAdminAuth } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/session";

// Returns { uid, email, username } or null. Safe to call from Server
// Components and Route Handlers.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionCookie) return null;

  try {
    const auth = getAdminAuth();
    const decoded = await auth.verifySessionCookie(sessionCookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email,
      username: decoded.username || null,
    };
  } catch {
    return null;
  }
}
