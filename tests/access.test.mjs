import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_ACCESS,
  accessAttrs,
  accessSummary,
  accessToCookie,
  isDefaultAccess,
  readAccessCookie,
  sanitizeAccess,
} from "../lib/access.js";

test("access: anything unknown falls back to the defaults", () => {
  assert.deepEqual(sanitizeAccess(null), DEFAULT_ACCESS);
  assert.deepEqual(sanitizeAccess({ contrast: "neon", links: "yes", targets: 9 }), DEFAULT_ACCESS);
  assert.deepEqual(sanitizeAccess({ contrast: "high", links: true, targets: "large" }), {
    contrast: "high",
    links: true,
    targets: "large",
  });
});

test("access: cookie round trip", () => {
  const a = { contrast: "high", links: true, targets: "large" };
  assert.equal(accessToCookie(a), "high.1.large");
  assert.deepEqual(readAccessCookie("high.1.large"), a);
  assert.deepEqual(readAccessCookie(accessToCookie(DEFAULT_ACCESS)), DEFAULT_ACCESS);
});

test("access: a bad or missing cookie reads as the defaults", () => {
  assert.deepEqual(readAccessCookie(undefined), DEFAULT_ACCESS);
  assert.deepEqual(readAccessCookie(""), DEFAULT_ACCESS);
  assert.deepEqual(readAccessCookie("<script>.1.huge"), { ...DEFAULT_ACCESS, links: true });
});

test("access: html attributes and summary", () => {
  assert.deepEqual(accessAttrs({ contrast: "high", links: true, targets: "default" }), {
    "data-contrast": "high",
    "data-links": "on",
    "data-targets": "default",
  });
  assert.equal(isDefaultAccess(null), true);
  assert.equal(accessSummary(null), "Standard");
  assert.equal(accessSummary({ contrast: "high" }), "High contrast");
  assert.equal(accessSummary({ contrast: "high", links: true, targets: "large" }), "3 adjustments on");
});
