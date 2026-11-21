import Link from "next/link";
import { doorsFor } from "@/lib/discover";

// Links to the places that used to live only in the side menu. No hooks and no
// state, so it renders on the server or inside a client component alike.
//
//   <Discover spot="profile" variant="tiles" card title="Your corner" />
//
// `spot` picks the doors (lib/discover.js SPOTS). Three looks, all themed from
// the City Look variables (styles in app/discover.css):
//   tiles  a grid of small cards. Profile, and the strip at the foot of the shop pages
//   rows   a compact list with a chevron. Settings
//   chips  one line of pills. The "all caught up" end of a feed
//
// `card` wraps tiles in a single surface, so a group of them reads as one block
// instead of several loose cards. `notes` swaps a door's one-liner.

// 24px grid, 2px stroke, same style as the side menu icons.
const ICONS = {
  spark: (
    <>
      <path d="M11 3.5l1.9 5.1 5.1 1.9-5.1 1.9L11 17.5l-1.9-5.1L4 10.5l5.1-1.9z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>
  ),
  gift: (
    <>
      <rect x="4" y="9" width="16" height="11" rx="2" />
      <path d="M12 9v11M3.5 9h17M12 9C9.5 9 7.5 7.8 7.5 6.2 7.5 4.9 8.7 4.2 9.8 4.5 11 4.9 12 7 12 9zm0 0c2.5 0 4.5-1.2 4.5-2.8 0-1.3-1.2-2-2.3-1.7C13 4.9 12 7 12 9z" />
    </>
  ),
  ads: (
    <>
      <path d="M3.5 10.5v3a1 1 0 0 0 1 1H7l6 4.5V5L7 9.5H4.5a1 1 0 0 0-1 1z" />
      <path d="M17 8.5a5 5 0 0 1 0 7" />
    </>
  ),
  map: (
    <>
      <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  bookmark: <path d="M6.5 4h11a1 1 0 0 1 1 1v15l-6.5-4-6.5 4V5a1 1 0 0 1 1-1z" />,
  rank: (
    <>
      <path d="m6 13.5 6-6 6 6" />
      <path d="m6 19 6-6 6 6" />
    </>
  ),
  chevron: <path d="m9 6 6 6-6 6" />,
};

function Icon({ name }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export default function Discover({
  spot,
  variant = "tiles",
  title,
  sub,
  card = false,
  notes,
  className = "",
}) {
  const doors = doorsFor(spot, notes);
  if (!doors.length) return null;
  const headId = `dc-h-${spot}`;
  const cls = `dc dc-${variant}${card ? " dc-card" : ""} ${className}`.trim();

  if (variant === "chips") {
    return (
      <nav className={cls} aria-label={title || "Explore GTAFanbase"}>
        {title && <span className="dc-chips-label">{title}</span>}
        <ul className="dc-chip-list">
          {doors.map((d) => (
            <li key={d.id}>
              <Link href={d.href} prefetch={false} className={`dc-chip dc-t-${d.tone}`}>
                <Icon name={d.icon} />
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  const rows = variant === "rows";
  return (
    <section className={cls} aria-labelledby={headId}>
      {(title || sub) && (
        <header className="dc-head">
          {title && (
            <h2 id={headId} className="dc-title">
              {title}
            </h2>
          )}
          {sub && <p className="dc-sub">{sub}</p>}
        </header>
      )}
      <ul className="dc-list" data-n={doors.length}>
        {doors.map((d) => (
          <li key={d.id}>
            <Link href={d.href} prefetch={false} className={`dc-item dc-t-${d.tone}`}>
              <span className="dc-blip">
                <Icon name={d.icon} />
              </span>
              <span className="dc-text">
                <b>{d.title}</b>
                <small>{d.short}</small>
              </span>
              {rows && (
                <span className="dc-go">
                  <Icon name="chevron" />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
