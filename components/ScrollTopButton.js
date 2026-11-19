"use client";

import { useEffect, useState } from "react";
import { ChevronUpIcon } from "./icons";

// A ring around the button fills as you read down the page (it reads --scroll-p, which
// components/touches/PageTouches.js keeps up to date on <html>).
export default function ScrollTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 500);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      className={`scroll-top-btn${visible ? " visible" : ""}`}
      aria-label="Scroll to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <span className="stb-ring" aria-hidden="true" />
      <ChevronUpIcon />
    </button>
  );
}
