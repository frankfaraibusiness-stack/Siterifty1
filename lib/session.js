import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE_NAME = "gta6fb_session";
export const SESSION_MAX_AGE_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  };
}

// Signing secret: SESSION_SECRET if set, otherwise derived from the service
// account private key so no new env var is required.
function secretKey() {
  const raw =
    process.env.SESSION_SECRET ||
    (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!raw) throw new Error("Set SESSION_SECRET (or FIREBASE_PRIVATE_KEY).");
  return new TextEncoder().encode(raw);
}

export async function createSessionToken({ uid, email, username }) {
  return new SignJWT({ email, username: username || null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(uid)
    .setIssuedAt()
    .setExpirationTime(Math.floor((Date.now() + SESSION_MAX_AGE_MS) / 1000))
    .sign(secretKey());
}

// Returns { uid, email, username } or null.
export async function verifySessionToken(token) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    return {
      uid: payload.sub,
      email: payload.email || null,
      username: payload.username || null,
    };
  } catch {
    return null;
  }
}
