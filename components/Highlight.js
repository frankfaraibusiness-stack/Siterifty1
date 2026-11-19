const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Server component: wraps every search-term match in <mark>.
export default function Highlight({ text, terms }) {
  if (!text || !terms || terms.length === 0) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRe).join("|")})`, "gi");
  const parts = String(text).split(pattern);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="sr-mark">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}
