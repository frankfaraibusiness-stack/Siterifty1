import Link from "next/link";
import Money from "@/components/Money";
import { USD_TOKEN, usdPlain } from "@/lib/currency";

// Tiny inline markup for copy that lives in data (FAQ answers, card text):
//   **bold**   `code`   and   [label](/path)  or  [label](https://...)  or  [label](mailto:...)
//   {{usd:4.99}}  a dollar price, shown in the visitor's own currency (see lib/currency.js)
// Pure function, works in server and client components.
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\{\{usd:\d+(?:\.\d+)?\}\})/g;

export function renderRich(text) {
  if (typeof text !== "string") return text;
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
    const price = part.match(/^\{\{usd:(\d+(?:\.\d+)?)\}\}$/);
    if (price) return <Money key={i} usd={Number(price[1])} />;
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) {
      const [, label, href] = m;
      if (href.startsWith("/")) {
        return (
          <Link key={i} href={href} prefetch={false}>
            {label}
          </Link>
        );
      }
      const external = /^https?:/.test(href);
      return (
        <a key={i} href={href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
          {label}
        </a>
      );
    }
    return part;
  });
}

// The same text with the markup removed (for search matching and JSON-LD).
// Prices stay in US dollars here, the base currency search engines should see.
export function plainText(text) {
  return String(text || "")
    .replace(USD_TOKEN, (_, n) => usdPlain(n))
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}
