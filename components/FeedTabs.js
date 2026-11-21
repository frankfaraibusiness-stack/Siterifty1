import Link from "next/link";
import { feedHref } from "@/lib/feed-types";

// "For you" (everyone) and "Following" (people you follow). Plain links, so
// the choice lives in the URL and the page is rendered on the server.
// `type` keeps the Posts / Videos / Polls filter when switching tabs.
export default function FeedTabs({ active, type = "all" }) {
  const tabs = [
    ["foryou", "For you", feedHref({ type })],
    ["following", "Following", feedHref({ feed: "following", type })],
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
