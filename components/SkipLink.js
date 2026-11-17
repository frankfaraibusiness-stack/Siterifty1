"use client";

// "Skip to content": the first thing a keyboard or screen-reader user reaches
// on every page. It jumps past the header and nav pills to the page's <main>.
export default function SkipLink() {
  function go(e) {
    e.preventDefault();
    const main = document.querySelector("main");
    if (!main) return;
    if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
    main.focus({ preventScroll: true });
    main.scrollIntoView({ block: "start" });
  }
  return (
    <a href="#main" className="skip-link" onClick={go}>
      Skip to content
    </a>
  );
}
