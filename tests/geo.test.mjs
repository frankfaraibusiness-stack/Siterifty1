import test from "node:test";
import assert from "node:assert/strict";
import { UNKNOWN_COUNTRY, detectCountry } from "../lib/geo.js";

const h = (obj) => new Headers(obj);

test("country: read from the host's IP country header, in any case", () => {
  assert.equal(detectCountry(h({ "x-vercel-ip-country": "ZA" })), "ZA");
  assert.equal(detectCountry(h({ "cf-ipcountry": "gb" })), "GB");
  assert.equal(detectCountry(h({ "cloudfront-viewer-country": " us " })), "US");
});

test("country: the first usable header wins", () => {
  assert.equal(detectCountry(h({ "x-vercel-ip-country": "FR", "cf-ipcountry": "DE" })), "FR");
  assert.equal(detectCountry(h({ "x-vercel-ip-country": "XX", "cf-ipcountry": "DE" })), "DE");
});

test("country: no header, or a header that is not a country, is unknown", () => {
  assert.equal(detectCountry(h({})), UNKNOWN_COUNTRY);
  assert.equal(UNKNOWN_COUNTRY, "unknown");
  for (const v of ["XX", "T1", "ZZ", "A1", "", "USA", "1", "<script>"]) {
    assert.equal(detectCountry(h({ "cf-ipcountry": v })), UNKNOWN_COUNTRY, v);
  }
});

test("country: a browser language is never used as a guess", () => {
  assert.equal(detectCountry(h({ "accept-language": "en-ZA,en;q=0.9" })), UNKNOWN_COUNTRY);
});

test("country: bad input never throws", () => {
  for (const v of [undefined, null, {}, 5, { get() { throw new Error("boom"); } }]) {
    assert.equal(detectCountry(v), UNKNOWN_COUNTRY);
  }
});
