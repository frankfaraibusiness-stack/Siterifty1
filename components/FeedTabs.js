import Link from "next/link";

// "For you" (everyone) and "Following" (people you follow). Plain links, so
// the choice lives in the URL and the page is rendered on the server.
export default function FeedTabs({ active }) {
  const tabs = [
    ["foryou", "For you", "/"],
    ["following", "Following", "/?feed=following"],
  ];
  return (
    <nav className="feed-tabs" aria-label="Feed">
      {tabs.map(([id, label, href]) => (
        <Link
          key={id}
          href={href}
          className={`feed-tab${active === id ? " active" : ""}`}
          aria-current={active === id ? "page" : undefined}
          prefetch={false}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
