"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Block } from "./bits";
import { useSettings } from "./context";
import { useCurrency, useMoney } from "../CurrencyProvider";
import { CURRENCY_CODES, rememberCurrency } from "@/lib/currency";

// Region: the currency prices are shown in. Plans and perks are priced in US
// dollars and converted with a live rate; this only changes how they are shown.
export default function RegionPanel() {
  const { prefs, update } = useSettings();
  const router = useRouter();
  const money = useMoney();
  const fx = useCurrency();
  const choice = prefs.region.currency;

  // Currency names are filled in after the page loads, so the server and the
  // browser can never disagree about the text.
  const [names, setNames] = useState(null);
  useEffect(() => {
    try {
      const dn = new Intl.DisplayNames(["en"], { type: "currency" });
      setNames(Object.fromEntries(CURRENCY_CODES.map((c) => [c, dn.of(c) || c])));
    } catch {
      setNames({});
    }
  }, []);

  const codes = names
    ? [...CURRENCY_CODES].sort((a, b) => String(names[a] || a).localeCompare(String(names[b] || b)))
    : CURRENCY_CODES;

  function change(value) {
    rememberCurrency(value); // this device, so the server renders the new prices
    update("region", { currency: value }); // your account, so other devices follow
    router.refresh();
  }

  return (
    <>
      <Block
        title="Price currency"
        hint="Choose Automatic and prices follow where you are. If a rate can’t be loaded, prices show in US dollars."
      >
        <select className="cmp-input" value={choice} aria-label="Currency" onChange={(e) => change(e.target.value)}>
          <option value="auto">Automatic (from where you are)</option>
          {codes.map((code) => (
            <option key={code} value={code}>
              {names?.[code] ? `${names[code]} (${code})` : code}
            </option>
          ))}
        </select>
      </Block>

      <Block title="Preview">
        <p className="st-hint">
          A $9.99 plan shows as <b>{money(9.99)}</b>
          {fx.currency !== "USD" ? ` (${fx.currency})` : ""}.
        </p>
        <p className="st-hint">Rates update once a day. What you’re charged is set by the checkout.</p>
      </Block>
    </>
  );
}
