"use client";

import { useCurrency } from "./CurrencyProvider";
import { currencyName } from "@/lib/currency";

// One line of small print under prices, only for visitors who are not seeing
// US dollars. The link is the credit the free rate source asks for.
export default function PriceNote({ className = "" }) {
  const { currency } = useCurrency();
  if (currency === "USD") return null;
  return (
    <p className={`fx-note ${className}`.trim()}>
      Prices are set in US dollars. We show them in {currencyName(currency)} ({currency}) at today’s exchange rate,
      rounded up to a neat number where we can.{" "}
      <a href="https://www.exchangerate-api.com" target="_blank" rel="noopener noreferrer">
        Rates by Exchange Rate API
      </a>
      .
    </p>
  );
}
