// lib/serverAuth.ts
//
// Small shared helpers for API routes. The rate limiter is in-memory —
// fine for a single serverless instance / test app; on Vercel each
// cold instance gets its own counter, so treat this as a soft guard,
// not a hard one. Swap for Redis/Upstash if this ever needs to be real.
import { NextResponse } from 'next/server';

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimitOk(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count += 1;
  return true;
}

export function jsonError(status: number, message: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status });
}
