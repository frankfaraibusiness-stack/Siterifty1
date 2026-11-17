"use client";

import { useEffect, useRef, useState } from "react";

// "On this page" list. A vertical list in the rail on desktop, a row of chips
// under the header on phones. Highlights the section you are reading.
export default function Toc({ items }) {
  const [active, setActive] = useState(items[0]?.id || "");
  const nav = useRef(null);

  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    if (!els.length || !("IntersectionObserver" in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const seen = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (seen[0]) setActive(seen[0].target.id);
      },
      { rootMargin: "-120px 0px -62% 0px", threshold: 0 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);

  // On phones the chips scroll sideways: keep the active one in view.
  useEffect(() => {
    const box = nav.current;
    if (!box || box.scrollWidth <= box.clientWidth + 4) return;
    const el = box.querySelector("[aria-current='true']");
    if (el) box.scrollTo({ left: el.offsetLeft - box.clientWidth / 2 + el.clientWidth / 2, behavior: "smooth" });
  }, [active]);

  if (!items.length) return null;

  return (
    <nav className="ip-toc" aria-label="On this page" ref={nav}>
      <span className="ip-toc-h">On this page</span>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            <a href={`#${i.id}`} aria-current={active === i.id ? "true" : undefined}>
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
