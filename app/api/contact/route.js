import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebase-admin";
import { getCurrentUser } from "@/lib/current-user";
import { isTopicId } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/contact  { topic, name, email, username?, link?, message, company }
//
// Saves the message to Firestore `contactMessages/{id}` (read them in the
// Firebase console: Build > Firestore Database). `company` is a honeypot: real
// people never fill it in, bots do, and those get a fake "ok".
//
// Rate limit: 5 messages per hour per visitor, tracked in `contactRate/{hash}`
// by a one-way hash of the IP address (the address itself is never stored).
const PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;

const clean = (v, max) => (typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, max) : "");

function visitorHash(request) {
  const fwd = request.headers.get("x-forwarded-for") || "";
  const ip = fwd.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const salt = process.env.SESSION_SECRET || process.env.FIREBASE_PROJECT_ID || "gta6fanbase";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That didn’t look right. Please try again." }, { status: 400 });
  }

  // Bots: pretend it worked.
  if (clean(body?.company, 200)) return NextResponse.json({ ok: true, id: "" });

  const topic = clean(body?.topic, 40);
  const name = clean(body?.name, 80);
  const email = clean(body?.email, 160);
  const username = clean(body?.username, 40);
  const link = clean(body?.link, 500);
  // Keep line breaks in the message itself.
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";

  if (!isTopicId(topic)) return NextResponse.json({ error: "Pick what your message is about." }, { status: 400 });
  if (!name) return NextResponse.json({ error: "Add your name so we know who to reply to." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "That email address looks invalid." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Tell us a little more. Messages need at least 10 characters." }, { status: 400 });
  }

  try {
    const db = getAdminDb();
    const hash = visitorHash(request);
    const rateRef = db.collection("contactRate").doc(hash);

    const allowed = await db.runTransaction(async (tx) => {
      const snap = await tx.get(rateRef);
      const now = Date.now();
      const d = snap.exists ? snap.data() : null;
      const fresh = !d || now - (d.windowStart || 0) > HOUR_MS;
      const count = fresh ? 0 : d.count || 0;
      if (count >= PER_HOUR) return false;
      tx.set(rateRef, { windowStart: fresh ? now : d.windowStart, count: count + 1 });
      return true;
    });
    if (!allowed) {
      return NextResponse.json(
        { error: "You have sent a few messages already. Please wait a little before sending another." },
        { status: 429 }
      );
    }

    const user = await getCurrentUser();
    const ref = db.collection("contactMessages").doc();
    await ref.set({
      topic,
      name,
      email,
      username,
      link,
      message,
      uid: user?.uid || null,
      signedInAs: user?.username || null,
      status: "new",
      visitor: hash,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, id: ref.id });
  } catch (err) {
    console.error("contact: could not save message", err);
    return NextResponse.json({ error: "We couldn’t send that right now. Please try again in a moment." }, { status: 500 });
  }
}
