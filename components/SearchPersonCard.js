import Link from "next/link";
import Highlight from "./Highlight";
import { PinIcon } from "./icons";
import { getTheme } from "@/lib/profile-themes";

export default function SearchPersonCard({ person, terms }) {
  const t = getTheme(person.theme);
  const initial = (person.displayName || person.username).trim().charAt(0).toUpperCase();

  return (
    <Link href={`/u/${person.username}`} className="sr-person">
      <span className="sr-avatar" style={{ "--a": t.a, "--b": t.b }}>
        {initial}
        {person.hasAvatar && (
          <span
            className="sr-avatar-img"
            style={{
              backgroundImage: `url("/avatar/${person.username}?v=${person.avatarV}")`,
            }}
          />
        )}
      </span>
      <span className="sr-person-body">
        <span className="sr-person-name">
          <Highlight text={person.displayName} terms={terms} />
        </span>
        <span className="sr-person-handle">
          @<Highlight text={person.username} terms={terms} />
        </span>
        {person.bio && (
          <span className="sr-person-bio">
            <Highlight text={person.bio} terms={terms} />
          </span>
        )}
        {person.location && (
          <span className="sr-person-loc">
            <span className="pf-ico">
              <PinIcon />
            </span>
            <Highlight text={person.location} terms={terms} />
          </span>
        )}
      </span>
      <span className="sr-person-cta">View</span>
    </Link>
  );
}
