import test from "node:test";
import assert from "node:assert/strict";
import { COUNTRY_CODES, GENDERS, cleanIdentityPatch, countryOptions, isCountryCode } from "../lib/countries.js";
import { countryName } from "../lib/flag.js";

test("countries: every code is a unique, real two-letter country", () => {
  assert.equal(new Set(COUNTRY_CODES).size, COUNTRY_CODES.length);
  for (const c of COUNTRY_CODES) {
    assert.match(c, /^[A-Z]{2}$/, c);
    assert.notEqual(countryName(c), c, `${c} has no country name`);
  }
  assert.ok(COUNTRY_CODES.length >= 245);
  for (const c of ["US", "GB", "ZA", "NG", "IN", "BR", "DE", "FR", "JP", "AU", "XK"]) assert.ok(isCountryCode(c), c);
});

test("countries: junk is not a country, 'unknown' included", () => {
  for (const v of ["unknown", "", "za", "USA", "XX", "ZZ", "AA", null, undefined, 5, {}]) assert.equal(isCountryCode(v), false, String(v));
});

test("countries: dropdown options are sorted by name and complete", () => {
  const o = countryOptions();
  assert.equal(o.length, COUNTRY_CODES.length);
  const names = o.map((x) => x.label);
  assert.deepEqual(names, [...names].sort((a, b) => a.localeCompare(b, "en")));
  assert.equal(o.find((x) => x.value === "ZA").label, "South Africa");
});

test("identity patch: country and gender, either or both", () => {
  assert.deepEqual(cleanIdentityPatch({ country: "ZA" }), { ok: true, patch: { country: "ZA" } });
  assert.deepEqual(cleanIdentityPatch({ country: " gb " }), { ok: true, patch: { country: "GB" } });
  assert.deepEqual(cleanIdentityPatch({ gender: "female" }), { ok: true, patch: { gender: "female" } });
  assert.deepEqual(cleanIdentityPatch({ country: "US", gender: "male" }), { ok: true, patch: { country: "US", gender: "male" } });
  assert.deepEqual(GENDERS, ["female", "male"]);
});

test("identity patch: bad values and extras are refused or dropped", () => {
  for (const body of [{ country: "unknown" }, { country: "" }, { country: 5 }, { country: "XX" }, { gender: "other" }, { gender: "" }, {}, null, "x"]) {
    assert.equal(cleanIdentityPatch(body).ok, false, JSON.stringify(body));
  }
  // only country and gender ever reach the database
  assert.deepEqual(cleanIdentityPatch({ country: "ZA", plan: "kingpin", uid: "x" }), { ok: true, patch: { country: "ZA" } });
});

import { existsSync, statSync } from "node:fs";

test("flags: every selectable country has a flag picture, and none is bloated", () => {
  for (const c of COUNTRY_CODES) {
    const file = new URL(`../public/flags/${c.toLowerCase()}.png`, import.meta.url);
    assert.ok(existsSync(file), `public/flags/${c.toLowerCase()}.png is missing`);
    assert.ok(statSync(file).size < 8000, `${c} flag is too big`);
  }
});
