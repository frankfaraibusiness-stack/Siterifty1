"use client";

import { createContext, useContext, useMemo } from "react";
import { BASE_CURRENCY, formatMoney } from "@/lib/currency";

// Holds the visitor's currency and live rate (worked out on the server in
// lib/fx.js and passed in from the root layout), so any client or server
// component can show a USD price in their currency without fetching anything.
const USD = { country: "US", currency: BASE_CURRENCY, rate: 1, updatedAt: null };
const FxContext = createContext(USD);

export default function CurrencyProvider({ fx, children }) {
  const { country, currency, rate, updatedAt } = { ...USD, ...fx };
  const value = useMemo(
    () => ({ country, currency, rate, updatedAt }),
    [country, currency, rate, updatedAt]
  );
  return <FxContext.Provider value={value}>{children}</FxContext.Provider>;
}

export function useCurrency() {
  return useContext(FxContext);
}

// const money = useMoney();  money(4.99) -> "R85", "£3.79", "$4.99"
export function useMoney() {
  const fx = useCurrency();
  return useMemo(() => (usd) => formatMoney(usd, fx), [fx]);
}
