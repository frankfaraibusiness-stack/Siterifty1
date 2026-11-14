import Link from "next/link";
import TypeIcon from "./composer/TypeIcon";
import { TYPES } from "@/lib/post-schema";

// The "start a post" card at the top of the home feed (signed-in users only).
export default function ComposerLauncher({ user }) {
  if (!user?.username) return null;
  return (
    <section className="launcher" aria-label="Create a post">
      <Link href="/create" className="launcher-prompt">
        <span className="launcher-av">{user.username.charAt(0).toUpperCase()}</span>
        <span>What’s happening in Leonida, @{user.username}?</span>
      </Link>
      <div className="launcher-types">
        {Object.values(TYPES).map((t) => (
          <Link
            key={t.id}
            href={`/create?type=${t.id}`}
            className="launcher-type"
            style={{ "--a": t.a, "--b": t.b }}
          >
            <TypeIcon type={t.id} size={18} />
            {t.label}
          </Link>
        ))}
      </div>
    </section>
  );
}
