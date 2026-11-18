// The one loader for every page change (Feed, Communities, Profile, Settings,
// Upgrade, a post, a community...). Next shows it the instant a nav is clicked,
// through a loading.js next to each page, so nothing ever looks frozen.
//
// It repeats the real header (hamburger + logo) so the top of the screen stays
// put while the page behind it loads, then shows sunset-shimmer skeleton cards.
// Plain server component: no state, pure markup + CSS (see "Nav loader" in globals.css).

export default function NavLoader({ reel = false }) {
  return (
    <div className="nl" role="status" aria-live="polite" aria-busy="true">
      <span className="nl-sr">Loading…</span>

      {/* neon road-light bar along the very top */}
      <div className="nl-bar" aria-hidden="true">
        <i />
      </div>

      <header className="site-header" aria-hidden="true">
        <div className="header-left">
          <span className="hamburger">
            <span className="hamburger-bars">
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className="brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-logo" src="/logo.webp" alt="" width="540" height="300" />
            <span className="brand-word">
              GTAFANBASE<em>.COM</em>
            </span>
          </span>
        </div>
        <div className="header-actions">
          <span className="nl-s nl-pill" />
          <span className="nl-s nl-round" />
          <span className="nl-s nl-round" />
        </div>
      </header>

      {reel ? (
        <main className="nl-reel" aria-hidden="true">
          <div className="nl-reel-stage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="nl-reel-logo" src="/logo.webp" alt="" width="540" height="300" fetchPriority="high" />
            <span className="nl-reel-bar"><i /></span>
            <span className="nl-reel-text">Loading clips…</span>
          </div>
        </main>
      ) : (
      <main className="nl-body" aria-hidden="true">
        <div className="nl-chip">
          <span className="nl-sun" />
          <span>Loading Leonida</span>
        </div>

        <div className="nl-s nl-title" />
        <div className="nl-s nl-search" />

        {[0, 1, 2].map((i) => (
          <div className="nl-card" key={i}>
            <div className="nl-card-head">
              <span className="nl-s nl-avatar" />
              <div className="nl-lines">
                <span className="nl-s" />
                <span className="nl-s" />
              </div>
            </div>
            <div className="nl-s nl-line" />
            <div className="nl-s nl-line nl-short" />
            {i !== 1 && <div className="nl-s nl-media" />}
            <div className="nl-actions">
              <span className="nl-s" />
              <span className="nl-s" />
              <span className="nl-s" />
            </div>
          </div>
        ))}
      </main>
      )}
    </div>
  );
}
