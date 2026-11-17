import Link from "next/link";
import TypeIcon from "./composer/TypeIcon";
import { TYPES } from "@/lib/post-schema";

// One quick-post tile per post format (signed-in users only). Each one is its own small card
// in its post format's colour: no shared container around them.
export default function ComposerLauncher({ user }) {
  if (!user?.username) return null;
  return (
    <nav className="lp-tiles" aria-label="Create a post">
      {Object.values(TYPES).map((t) => (
        <Link key={t.id} href={`/create?type=${t.id}`} className="lp-tile" style={{ "--a": t.a, "--b": t.b }}>
          <TypeIcon type={t.id} size={22} />
          <span>{t.label.replace(/\b[a-z]/g, (c) => c.toUpperCase())}</span>
        </Link>
      ))}
    </nav>
  );
}
