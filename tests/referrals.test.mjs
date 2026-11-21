import test from "node:test";
import assert from "node:assert/strict";
import {
  REFERRAL_BONUS_MILLS, REFERRAL_XP_TARGET, REF_ALPHABET, REF_CODE_LENGTH,
  cleanRefCode, makeRefCode, refPath, formatUsd, refProgress,
} from "../lib/referrals.js";

test("the offer is $1.00 for the first 1,000 XP", () => {
  assert.equal(REFERRAL_XP_TARGET, 1000);
  assert.equal(REFERRAL_BONUS_MILLS, 1000);
  assert.equal(formatUsd(REFERRAL_BONUS_MILLS), "$1.00");
});

test("formatUsd shows whole cents and never goes negative", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(2500), "$2.50");
  assert.equal(formatUsd(1234000), "$1,234.00");
  assert.equal(formatUsd(-50), "$0.00");
  assert.equal(formatUsd(NaN), "$0.00");
});

test("generated codes are 8 safe characters and survive cleanRefCode", () => {
  for (let i = 0; i < 200; i++) {
    const c = makeRefCode();
    assert.equal(c.length, REF_CODE_LENGTH);
    assert.ok([...c].every((ch) => REF_ALPHABET.includes(ch)));
    assert.equal(cleanRefCode(c), c);
  }
  assert.ok(!/[01OIL]/.test(REF_ALPHABET));
});

test("cleanRefCode uppercases good codes and rejects junk", () => {
  assert.equal(cleanRefCode(" ab12cd34 "), "AB12CD34");
  for (const bad of ["", "abc", "a".repeat(13), "ab-12-cd", "../etc", null, undefined, 12345]) {
    assert.equal(cleanRefCode(bad), "", String(bad));
  }
});

test("refPath is a site-relative path (the page adds the current origin)", () => {
  assert.equal(refPath("ABCD2345"), "/r/ABCD2345");
});

test("refProgress climbs to 100 at the target and stays there", () => {
  assert.equal(refProgress(0), 0);
  assert.equal(refProgress(500), 50);
  assert.equal(refProgress(999), 99);
  assert.equal(refProgress(1000), 100);
  assert.equal(refProgress(99999), 100);
  assert.equal(refProgress("junk"), 0);
});
