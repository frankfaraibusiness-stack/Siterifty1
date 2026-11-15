"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Main Feed", href: "/", match: (p) => p === "/" },
  { label: "Communities", href: "/communities", match: (p) => p.startsWith("/communities") || p.startsWith("/c/") },
  { label: "Messages", href: "#" },
  { label: "Leaderboard", href: "#" },
];

export default function MainNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="main-nav">
      {NAV_LINKS.map(({ label, href, match }) => {
        const active = match ? match(pathname) : false;
        const Tag = href === "#" ? "a" : Link;
        return (
          <Tag key={label} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
            {label}
          </Tag>
        );
      })}
    </nav>
  );
}
