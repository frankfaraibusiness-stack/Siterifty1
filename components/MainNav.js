"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Small outline icons, drawn to match the rest of the UI (24px grid, 2px stroke).
const ICONS = {
  home: <path d="M4 11.2 12 4l8 7.2V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  people: (
    <>
      <circle cx="9" cy="8.5" r="3.2" />
      <path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" />
      <circle cx="17.4" cy="9.4" r="2.4" />
      <path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
    </>
  ),
  chat: (
    <>
      <path d="M5 4h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="M8.5 9.5h.01M12 9.5h.01M15.5 9.5h.01" />
    </>
  ),
};

const NAV_LINKS = [
  { label: "Main Feed", href: "/", icon: "home", match: (p) => p === "/" },
  { label: "Communities", href: "/communities", icon: "people", match: (p) => p.startsWith("/communities") || p.startsWith("/c/") },
  { label: "Messages", href: "#", icon: "chat" },
];

export default function MainNav() {
  const pathname = usePathname() || "/";
  return (
    <nav className="main-nav" aria-label="Main">
      {NAV_LINKS.map(({ label, href, icon, match }) => {
        const active = match ? match(pathname) : false;
        const Tag = href === "#" ? "a" : Link;
        return (
          <Tag key={label} href={href} className={`nav-link${active ? " active" : ""}`} aria-current={active ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill={active && icon === "home" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {ICONS[icon]}
            </svg>
            <span>{label}</span>
          </Tag>
        );
      })}
    </nav>
  );
}
