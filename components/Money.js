"use client";

import { useMoney } from "./CurrencyProvider";

// <Money usd={4.99} /> shows a dollar price in the visitor's own currency.
// Works inside server components too. suppressHydrationWarning covers the rare
// case where a browser formats a currency symbol slightly differently from Node.
export default function Money({ usd }) {
  const money = useMoney();
  return <span suppressHydrationWarning>{money(usd)}</span>;
}
