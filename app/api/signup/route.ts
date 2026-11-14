// app/api/signup/route.ts
//
// POST { name, email, password } → { ok, uid, name, email }
//
// Creates the Firebase Auth user and the users/{uid} profile doc with the
// Admin SDK (server-side, so the service-account key never reaches the
// browser). There is no real login/session in this app — the client just
// remembers { uid, name, email } locally (see hooks/useAuth.ts) so demo
// events have a stable user to attach to. Good for generating test data;
// not an authenticated session.
//
// Also reports the signup to Sitevento via /api/ingest (server-to-server,
// using SITEVENTO_API_KEY) as a "user.signed_up" event — this is data only
// your own backend has, so it can't come from the tracking script.
import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { jsonError, rateLimitOk } from '@/lib/serverAuth';
import { SITEVENTO_API_KEY, SITEVENTO_INGEST_URL, SITEVENTO_SITE_ID } from '@/lib/sitevento';

export const runtime = 'nodejs';
export const maxDuration = 10;

const MAX_BODY_BYTES = 4 * 1024;
const MAX_NAME_LEN = 200;
const MAX_EMAIL_LEN = 320;
const MIN_PASSWORD_LEN = 6;
const MAX_PASSWORD_LEN = 4096;

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= MAX_EMAIL_LEN;
}

const ADMIN_ERROR_MESSAGES: Record<string, string> = {
  'auth/email-already-exists': 'An account with this email already exists.',
  'auth/invalid-email': "That email address doesn't look right.",
  'auth/invalid-password': 'Password should be at least 6 characters.',
  'auth/weak-password': 'Password should be at least 6 characters.',
};

function friendlyAdminError(err: unknown): string {
  const code = (err as { code?: string })?.code || '';
  return ADMIN_ERROR_MESSAGES[code] || 'Could not create your account. Please try again.';
}

/** Best-effort — never blocks or fails the signup if Sitevento is unreachable. */
// Awaited by the handler: on Vercel an un-awaited fetch can be killed once the response is sent.
async function reportSignup(uid: string, visitorId?: string) {
  try {
    await fetch(SITEVENTO_INGEST_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SITEVENTO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'user.signed_up',
        userId: uid,
        method: 'email',
        siteId: SITEVENTO_SITE_ID,
        ...(visitorId ? { visitorId } : {}),
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.error('[signup] sitevento report failed', err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentLength = Number(req.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return jsonError(400, 'Request body too large.');
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return jsonError(400, 'Request body too large.');

    let body: any;
    try {
      body = JSON.parse(raw);
    } catch {
      return jsonError(400, 'Malformed JSON body.');
    }

    const { name, email, password, visitorId } = body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > MAX_NAME_LEN) {
      return jsonError(400, 'Please enter your name.');
    }
    if (typeof email !== 'string' || !isValidEmail(email)) {
      return jsonError(400, "That email address doesn't look right.");
    }
    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN || password.length > MAX_PASSWORD_LEN) {
      return jsonError(400, 'Password should be at least 6 characters.');
    }

    const forwardedFor = req.headers.get('x-forwarded-for') || '';
    const ip = forwardedFor.split(',')[0].trim() || 'unknown';
    if (!rateLimitOk(`signup:${ip}`, 5, 60_000)) {
      return jsonError(429, 'Too many attempts. Please wait and try again.');
    }

    let auth;
    try {
      auth = getAdminAuth();
    } catch (err) {
      console.error('[signup] Firebase Admin init error', err);
      return jsonError(500, 'Server is not configured yet (missing Firebase Admin env vars).');
    }

    const trimmedName = name.trim();
    let uid: string;
    try {
      const userRecord = await auth.createUser({ email, password, displayName: trimmedName });
      uid = userRecord.uid;
    } catch (err) {
      console.error('[signup] createUser error', err);
      return jsonError(400, friendlyAdminError(err));
    }

    try {
      const db = getAdminDb();
      await db.collection('users').doc(uid).set({ displayName: trimmedName, email, createdAt: Date.now() }, { merge: true });
    } catch (err) {
      console.error('[signup] profile seed error', err);
    }

    await reportSignup(uid, typeof visitorId === 'string' && visitorId ? visitorId.slice(0, 200) : undefined);

    return NextResponse.json(
      { ok: true, uid, name: trimmedName, email },
      { status: 200, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (err) {
    console.error('[signup] handler error', err);
    return jsonError(500, 'Could not create your account. Please try again.');
  }
}
