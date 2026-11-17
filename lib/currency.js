// Currency helpers shared by server and client code (no imports, no I/O).
//
// Every price in the app (lib/plans.js, lib/perks.js) is typed once, in US
// dollars. This file decides how that dollar price is SHOWN to a visitor:
//   1. which currency their country uses (currencyForCountry),
//   2. the amount in that currency, rounded UP to a clean number when that
//      looks tidy, otherwise the plain live conversion (formatMoney).
//
// The live exchange rate itself is fetched on the server in lib/fx.js.

export const BASE_CURRENCY = "USD";

// How far we are willing to round a converted price UP to make it look clean,
// as a fraction of the price. 0.035 = at most 3.5% above the real conversion.
//   $10 at 16.598 -> R165.98 -> R170   (2.4% up, accepted)
//   $4.99 in GBP  -> £3.79   -> £4     (5.5% up, too much, so we show £3.79)
// Raise it for rounder numbers, lower it for numbers closer to the real rate.
export const ROUND_UP_TOLERANCE = 0.035;

// Country (ISO 3166-1 alpha-2) -> currency, written the short way round:
// one line per currency. Any country not listed falls back to USD.
const COUNTRIES_BY_CURRENCY = {
  USD: "US PR GU VI AS MP UM EC SV PA TL FM MH PW BQ VG TC IO ZW",
  EUR: "AT BE BG HR CY EE FI FR DE GR IE IT LV LT LU MT NL PT SK SI ES AD MC SM VA ME XK AX GF GP MQ RE YT BL MF PM",
  GBP: "GB GG JE IM",
  CAD: "CA",
  AUD: "AU CX CC NF KI NR TV",
  NZD: "NZ CK NU TK PN",
  CHF: "CH LI",
  JPY: "JP",
  CNY: "CN",
  HKD: "HK",
  MOP: "MO",
  TWD: "TW",
  KRW: "KR",
  SGD: "SG",
  MYR: "MY",
  THB: "TH",
  IDR: "ID",
  PHP: "PH",
  VND: "VN",
  INR: "IN",
  PKR: "PK",
  BDT: "BD",
  LKR: "LK",
  NPR: "NP",
  ZAR: "ZA",
  NAD: "NA",
  LSL: "LS",
  SZL: "SZ",
  NGN: "NG",
  KES: "KE",
  GHS: "GH",
  EGP: "EG",
  MAD: "MA",
  TZS: "TZ",
  UGX: "UG",
  ETB: "ET",
  DZD: "DZ",
  TND: "TN",
  BWP: "BW",
  ZMW: "ZM",
  MUR: "MU",
  RWF: "RW",
  AOA: "AO",
  MZN: "MZ",
  XOF: "BJ BF CI GW ML NE SN TG",
  XAF: "CM CF TD CG GQ GA",
  XPF: "PF NC WF",
  XCD: "AG AI DM GD KN LC MS VC",
  AED: "AE",
  SAR: "SA",
  QAR: "QA",
  KWD: "KW",
  BHD: "BH",
  OMR: "OM",
  ILS: "IL",
  JOD: "JO",
  TRY: "TR",
  BRL: "BR",
  MXN: "MX",
  ARS: "AR",
  CLP: "CL",
  COP: "CO",
  PEN: "PE",
  UYU: "UY",
  PYG: "PY",
  BOB: "BO",
  CRC: "CR",
  DOP: "DO",
  GTQ: "GT",
  HNL: "HN",
  JMD: "JM",
  TTD: "TT",
  SEK: "SE",
  NOK: "NO",
  DKK: "DK GL FO",
  ISK: "IS",
  PLN: "PL",
  CZK: "CZ",
  HUF: "HU",
  RON: "RO",
  UAH: "UA",
  RUB: "RU",
  KZT: "KZ",
  GEL: "GE",
  AMD: "AM",
  AZN: "AZ",
  RSD: "RS",
  BAM: "BA",
  MKD: "MK",
  ALL: "AL",
  MDL: "MD",
  BYN: "BY",
};

const COUNTRY_TO_CURRENCY = Object.fromEntries(
  Object.entries(COUNTRIES_BY_CURRENCY).flatMap(([currency, list]) =>
    list.split(" ").map((country) => [country, currency])
  )
);

export function currencyForCountry(country) {
  return COUNTRY_TO_CURRENCY[String(country || "").toUpperCase()] || BASE_CURRENCY;
}

// ---- Rounding up to a clean number ----------------------------------------
// Whole-unit steps from big to small: 5,000,000 / 1,000,000 / ... / 50 / 10 / 5 / 1.
const STEPS = (() => {
  const steps = [];
  for (let p = 1e7; p >= 1; p /= 10) {
    steps.push(p);
    if (p >= 10) steps.push(p / 2);
  }
  return steps;
})();

// Rounds `amount` UP to the roundest step that stays within ROUND_UP_TOLERANCE
// of the real amount. Returns null when no step is close enough (the amount is
// small, like £3.79, so rounding up to a whole pound would be a big jump).
export function cleanRoundUp(amount) {
  if (!(amount > 0)) return null;
  for (const step of STEPS) {
    // The tiny epsilon stops float noise (85.00000000001) from jumping a step.
    const up = Math.ceil(amount / step - 1e-9) * step;
    if (up - amount <= amount * ROUND_UP_TOLERANCE) return up;
  }
  return null;
}

// ---- Formatting -------------------------------------------------------------
const formatters = new Map();

// "R170", "£3.79", "€4.29", "¥3,100". Dollar-family currencies other than USD
// get a prefix so they are not mistaken for US dollars: "CA$6.89", "A$7.70".
function formatter(currency, whole) {
  const key = `${currency}:${whole ? 1 : 0}`;
  let nf = formatters.get(key);
  if (!nf) {
    const base = { style: "currency", currency };
    const narrow = new Intl.NumberFormat("en-US", { ...base, currencyDisplay: "narrowSymbol" });
    const sym = narrow.formatToParts(0).find((p) => p.type === "currency")?.value;
    const currencyDisplay = sym === "$" && currency !== BASE_CURRENCY ? "symbol" : "narrowSymbol";
    nf = new Intl.NumberFormat("en-US", {
      ...base,
      currencyDisplay,
      ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : null),
    });
    formatters.set(key, nf);
  }
  return nf;
}

// ICU puts a non-breaking space after a symbol that is a letter ("R 170"). A
// one-character symbol reads better stuck to the number: "R170".
function tidy(text) {
  return text.replace(/^(\S)[\u00a0\u202f ]+(?=\d)/, "$1");
}

// `fx` is { currency, rate } where rate is "1 USD = rate units of currency".
// Anything missing or invalid just shows the plain dollar price.
export function formatMoney(usd, fx) {
  const price = Number(usd) || 0;
  const rate = Number(fx?.rate);
  let currency = fx?.currency || BASE_CURRENCY;
  if (currency !== BASE_CURRENCY && !(rate > 0 && Number.isFinite(rate))) currency = BASE_CURRENCY;

  try {
    if (currency === BASE_CURRENCY || price === 0) return tidy(formatter(currency, false).format(price));
    const exact = price * rate;
    const clean = cleanRoundUp(exact);
    return tidy(clean === null ? formatter(currency, false).format(exact) : formatter(currency, true).format(clean));
  } catch {
    // A currency code this browser or server does not know.
    return tidy(formatter(BASE_CURRENCY, false).format(price));
  }
}

// "ZAR" -> "South African Rand" (falls back to the code).
export function currencyName(currency) {
  try {
    return new Intl.DisplayNames("en", { type: "currency" }).of(currency) || currency;
  } catch {
    return currency;
  }
}

// ---- Prices inside copy ------------------------------------------------------
// FAQ answers, terms and help text are plain strings, so a price inside them is
// written as a token, {{usd:4.99}}. components/info/rich.js turns the token into
// the visitor's currency when the text is shown, and into "$4.99" for search
// and JSON-LD (plainText).
export const USD_TOKEN = /\{\{usd:(\d+(?:\.\d+)?)\}\}/g;

export function usdToken(price) {
  return `{{usd:${price}}}`;
}

export function usdPlain(price) {
  return formatter(BASE_CURRENCY, false).format(Number(price) || 0);
}
