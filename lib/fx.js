import "server-only";
import { headers } from "next/headers";
import { BASE_CURRENCY, currencyForCountry } from "./currency";

// Live exchange rates, server side only. Prices in the app are typed in USD;
// getFx() works out the visitor's currency from their country and returns the
// live "1 USD = rate" for it, which the layout hands to <CurrencyProvider>.
//
// Rates come from a free source with no API key (open.er-api.com, updated once
// a day), with a second free source as backup. Next caches each fetch for an
// hour, so this adds no real delay to a page. If neither source answers (and
// there is no earlier answer in memory) everyone just sees USD prices.

const REVALIDATE_SECONDS = 3600;
const TIMEOUT_MS = 2500;

// The last good answer this server instance saw, used if both sources fail.
let lastGood = null;

async function getJson(url) {
  let timer;
  try {
    const res = await Promise.race([
      fetch(url, { next: { revalidate: REVALIDATE_SECONDS } }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
      }),
    ]);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function loadRates() {
  try {
    const d = await getJson("https://open.er-api.com/v6/latest/USD");
    if (d?.result === "success" && d.rates) {
      const updatedAt = d.time_last_update_unix ? d.time_last_update_unix * 1000 : Date.now();
      return (lastGood = { rates: d.rates, updatedAt });
    }
  } catch {
    // fall through to the backup source
  }
  try {
    const d = await getJson("https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json");
    if (d?.usd) {
      const rates = Object.fromEntries(Object.entries(d.usd).map(([code, rate]) => [code.toUpperCase(), rate]));
      return (lastGood = { rates, updatedAt: Date.parse(d.date) || Date.now() });
    }
  } catch {
    // fall through to the last good answer
  }
  return lastGood;
}

// Two-letter country of the visitor: Vercel's (or Cloudflare's) IP country when
// there is one, otherwise the region in their browser language (en-ZA -> ZA,
// which is also what makes it testable on localhost), otherwise US.
function countryFrom(h) {
  const ip = (h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || "").toUpperCase();
  if (/^[A-Z]{2}$/.test(ip) && ip !== "XX" && ip !== "T1") return ip;
  const region = (h.get("accept-language") || "").split(",")[0].match(/-([A-Za-z]{2})\b/);
  return region ? region[1].toUpperCase() : "US";
}

// -> { country, currency, rate, updatedAt }. Never throws.
export async function getFx() {
  const usd = { country: "US", currency: BASE_CURRENCY, rate: 1, updatedAt: null };
  try {
    const country = countryFrom(await headers());
    const currency = currencyForCountry(country);
    if (currency === BASE_CURRENCY) return { ...usd, country };

    const data = await loadRates();
    const rate = Number(data?.rates?.[currency]);
    if (!(rate > 0 && Number.isFinite(rate))) return { ...usd, country };
    return { country, currency, rate, updatedAt: data.updatedAt };
  } catch {
    return usd;
  }
}
