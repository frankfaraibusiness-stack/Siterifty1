import test from "node:test";
import assert from "node:assert/strict";
import { countryName, flagEmoji } from "../lib/flag.js";

test("flag: two-letter code to the flag emoji", () => {
  assert.equal(flagEmoji("ZA"), "🇿🇦");
  assert.equal(flagEmoji("US"), "🇺🇸");
  assert.equal(flagEmoji("GB"), "🇬🇧");
});

test("flag: unknown or junk gives no flag", () => {
  for (const v of ["unknown", "", "za", "USA", null, undefined, 5]) assert.equal(flagEmoji(v), "", String(v));
});

test("flag: country name for the tooltip", () => {
  assert.equal(countryName("ZA"), "South Africa");
  assert.equal(countryName("US"), "United States");
});
