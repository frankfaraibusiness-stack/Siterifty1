import Link from "next/link";

// Tiny inline markup for copy that lives in data (FAQ answers, card text):
//   **bold**   `code`   and   [label](/path)  or  [label](https://...)  or  [label](mailto:...)
// Pure function, works in server and client components.
const TOKEN = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;

export function renderRich(text) {
  if (typeof text !== "string") return text;
  return text.split(TOKEN).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
      return <code key={i}>{part.slice(1, -1)}</code>;
    }
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
export function plainText(text) {
  return String(text || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
}
