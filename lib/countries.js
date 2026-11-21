// The countries a member can pick in Settings (ISO 3166-1 alpha-2, plus XK for Kosovo), and the rules for
// saving "my country" and "my gender". Pure, so the settings panel, the API route and the tests share them.
import { countryName } from "./flag.js";

export const COUNTRY_CODES = (
  "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT " +
  "MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW"
).split(" ");

const CODE_SET = new Set(COUNTRY_CODES);

export function isCountryCode(v) {
  return typeof v === "string" && CODE_SET.has(v);
}

// [{ value: "ZA", label: "South Africa" }, ...] sorted by name, for the dropdown.
export function countryOptions() {
  return COUNTRY_CODES.map((value) => ({ value, label: countryName(value) })).sort((a, b) => a.label.localeCompare(b.label, "en"));
}

export const GENDERS = ["female", "male"];

// Cleans what the browser sent to change country and/or gender.
// -> { ok: true, patch: { country?, gender? } } or { ok: false, error }. Only the fields that were sent are in the patch.
export function cleanIdentityPatch(body) {
  const b = body && typeof body === "object" ? body : {};
  const patch = {};
  if ("country" in b) {
    const code = typeof b.country === "string" ? b.country.trim().toUpperCase() : "";
    if (!isCountryCode(code)) return { ok: false, error: "Pick a country from the list." };
    patch.country = code;
  }
  if ("gender" in b) {
    if (!GENDERS.includes(b.gender)) return { ok: false, error: "Pick female or male." };
    patch.gender = b.gender;
  }
  if (!("country" in patch) && !("gender" in patch)) return { ok: false, error: "Nothing to change." };
  return { ok: true, patch };
}
