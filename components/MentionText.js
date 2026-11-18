import Link from "next/link";

// Turns @handles in a piece of text into links to those profiles. Handles are
// 3-20 letters, numbers, "_" or "." (a trailing dot is punctuation, not part of
// the name). Everything else is left exactly as written.
const MENTION = /(^|[^A-Za-z0-9_.@])@([A-Za-z0-9_.]{3,20})/g;

export default function MentionText({ text, className = "cm-mention" }) {
  const out = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(MENTION)) {
    const handle = m[2].replace(/\.+$/, "");
    if (handle.length < 3) continue;
    const start = m.index + m[1].length;
    if (start > last) out.push(text.slice(last, start));
    out.push(
      <Link key={key++} href={`/u/${handle}`} className={className}>
        @{handle}
      </Link>
    );
    last = start + 1 + handle.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
