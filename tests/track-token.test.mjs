import test from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-secret-123";
const { issueTrk, verifyTrk, TOKEN_TTL_MS } = await import("../lib/track-token.js");

const post = { id: "p1", user: "lucia.ray", type: "video", tags: ["Trailer", "GTA6"], text: "", isOwner: false };
const NOW = 1_800_000_000_000;

test("a token carries what the server served, and verifies", () => {
  const t = issueTrk(post, "feed", "u1", NOW);
  const v = verifyTrk(t, "u1", NOW + 1000);
  assert.equal(v.postId, "p1");
  assert.equal(v.source, "feed");
  assert.deepEqual(v.sig.tags, ["trailer", "gta6"]);
  assert.deepEqual(v.sig.games, ["gta6"]);
  assert.equal(v.sig.type, "video");
  assert.equal(v.sig.author, "lucia_ray");
});

test("an edited token is rejected (post, source or tags can't be changed)", () => {
  const t = issueTrk(post, "feed", "u1", NOW);
  const [body, sig] = t.split(".");
  const obj = JSON.parse(Buffer.from(body, "base64url").toString());
  for (const change of [{ p: "other" }, { s: "recommend" }, { t: ["hacked"] }, { v: "u2" }]) {
    const forged = Buffer.from(JSON.stringify({ ...obj, ...change })).toString("base64url");
    assert.equal(verifyTrk(`${forged}.${sig}`, "u1", NOW), null);
  }
  assert.equal(verifyTrk(`${body}.${"A".repeat(sig.length)}`, "u1", NOW), null);
  assert.equal(verifyTrk("garbage", "u1", NOW), null);
});

test("a member's token can't be used by another member, anonymous tokens can", () => {
  const mine = issueTrk(post, "feed", "u1", NOW);
  assert.equal(verifyTrk(mine, "u2", NOW), null);
  assert.equal(verifyTrk(mine, null, NOW), null);
  const anon = issueTrk(post, "feed", null, NOW);
  assert.ok(verifyTrk(anon, "u9", NOW));
});

test("tokens expire, and a token from the future is refused", () => {
  const t = issueTrk(post, "feed", "u1", NOW);
  assert.ok(verifyTrk(t, "u1", NOW + TOKEN_TTL_MS - 1));
  assert.equal(verifyTrk(t, "u1", NOW + TOKEN_TTL_MS + 1), null);
  assert.equal(verifyTrk(t, "u1", NOW - 10 * 60_000), null);
});

test("no token for your own posts or unknown surfaces", () => {
  assert.equal(issueTrk({ ...post, isOwner: true }, "feed", "u1", NOW), "");
  assert.equal(issueTrk(post, "made-up", "u1", NOW), "");
});

test("a different secret can't verify", async () => {
  const t = issueTrk(post, "feed", "u1", NOW);
  process.env.SESSION_SECRET = "another-secret";
  assert.equal(verifyTrk(t, "u1", NOW), null);
  process.env.SESSION_SECRET = "test-secret-123";
});
