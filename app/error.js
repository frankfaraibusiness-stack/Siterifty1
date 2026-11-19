"use client";

import Link from "next/link";
import { useEffect } from "react";

// Shown when something throws while a page is rendering. "Try again" re-runs
// just that part of the page; nothing else on screen is lost.
export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="oops-wrap" id="main">
      <section className="oops" role="alert">
        <p className="oops-code" aria-hidden="true">!</p>
        <h1 className="oops-title">
          <span>Busted.</span> Something went wrong.
        </h1>
        <p className="oops-sub">
          That one’s on us. Give it another go, and if it keeps happening, let us know from the contact page.
        </p>
        {error?.digest && <p className="oops-ref">Reference: {error.digest}</p>}
        <div className="oops-actions">
          <button type="button" className="oops-btn solid" onClick={() => reset()}>Try again</button>
          <Link href="/" className="oops-btn">Back to the feed</Link>
          <Link href="/contact" className="oops-btn">Contact us</Link>
        </div>
      </section>
    </main>
  );
}
