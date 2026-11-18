// Signed tracking tokens. SERVER ONLY (uses node:crypto and the server secret): import it from
// server components, route handlers and lib/*-data.js, never from a "use client" file.
//
// Why tokens: the browser must not be able to invent views, clicks, hashtags or sources. When the
// server serves a post in a list (feed, recommendation rail, "More to explore") it signs a small
// token that says exactly what was served: which post, which surface, to whom, and the post's
// fingerprint (tags, game, type, author). The browser can only hand a token back. Whatever it
// does, the server re-checks the signature, so a token can't be edited, forged, aimed at another
// post or reused by another member, and only posts the server really sent can ever be counted.
import { createHmac, timingSafeEqual } from "node:crypto";
import { signalsOf } from "./interests.js";

export const TRACK_SOURCES = ["feed", "following", "recommend", "postrec", "saved", "events"];
export const TOKEN_TTL_MS = 12 * 3_600_000;

function key() {
  const raw = process.env.SESSION_SECRET || (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  if (!raw) throw new Error("Set SESSION_SECRET (or FIREBASE_PRIVATE_KEY).");
  return `trk:${raw}`; // a different key from the login cookie's
}
const sign = (body) => createHmac("sha256", key()).update(body).digest("base64url").slice(0, 32);

// Token for one post shown to one viewer on one surface. "" for the author's own posts (never counted).
export function issueTrk(post, source, viewerUid = null, now = Date.now()) {
  if (!post || post.isOwner || !TRACK_SOURCES.includes(source)) return "";
  const s = signalsOf(post);
  const body = Buffer.from(JSON.stringify({ p: post.id, s: source, v: viewerUid || "", t: s.tags, g: s.games, y: s.type, u: s.author, i: now })).toString("base64url");
  return `${body}.${sign(body)}`;
}

// The verified payload, or null. `viewerUid` must match when the token was issued to a signed-in member.
export function verifyTrk(token, viewerUid = null, now = Date.now()) {
  if (typeof token !== "string" || token.length > 600) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const want = sign(body);
  if (sig.length !== want.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!p || typeof p.p !== "string" || !TRACK_SOURCES.includes(p.s)) return null;
    if (now - p.i > TOKEN_TTL_MS || p.i > now + 60_000) return null;
    if (p.v && p.v !== viewerUid) return null;
    return { postId: p.p, source: p.s, sig: { tags: p.t || [], games: p.g || [], type: p.y || "post", author: p.u || "" }, issuedAt: p.i, tokenId: sig };
  } catch {
    return null;
  }
}
