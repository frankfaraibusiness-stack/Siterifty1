export const SESSION_COOKIE_NAME = "gta6fb_session";

// 5 days, matches the Firebase session cookie maxAge below.
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000;

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000, // seconds, for the cookies() API
  };
}
