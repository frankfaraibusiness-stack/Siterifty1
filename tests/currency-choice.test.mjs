import test from "node:test";
import assert from "node:assert/strict";
import { CURRENCY_CODES, cleanCurrencyChoice, currencyForCountry } from "../lib/currency.js";

test("currency choice: auto, or a supported code in any case", () => {
  assert.equal(cleanCurrencyChoice(undefined), "auto");
  assert.equal(cleanCurrencyChoice(""), "auto");
  assert.equal(cleanCurrencyChoice("auto"), "auto");
  assert.equal(cleanCurrencyChoice("zar"), "ZAR");
  assert.equal(cleanCurrencyChoice(" gbp "), "GBP");
});

test("currency choice: junk never reaches the server's currency", () => {
  for (const v of ["XXX", "<script>", "US", "USDD", null, 5, {}]) assert.equal(cleanCurrencyChoice(v), "auto", String(v));
});

test("currency choice: every listed code is a real choice, USD included", () => {
  assert.ok(CURRENCY_CODES.includes("USD"));
  assert.ok(CURRENCY_CODES.every((c) => /^[A-Z]{3}$/.test(c)));
  assert.equal(currencyForCountry("ZA"), "ZAR");
});
