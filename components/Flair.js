import { hasPerk } from "@/lib/perks";

// Perks Shop cosmetics that other people can see. `flair` is the short list
// of cosmetic perk ids a person owns (see publicFlair in lib/perks.js).

// Gold Supporter star next to a name (Supporter Badge).
export function FlairBadge({ flair, className = "" }) {
  if (!hasPerk(flair, "supporter_badge")) return null;
  return (
    <span className={`fb-supporter ${className}`.trim()} title="Supporter" role="img" aria-label="Supporter">
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 2.8l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.6l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
      </svg>
    </span>
  );
}

// Name text in a moving gradient of the person's two accent colours
// (Gradient Name). Renders the plain children when they don't own it.
export function FlairName({ flair, a, b, children }) {
  if (!hasPerk(flair, "gradient_name")) return children;
  return (
    <span className="fx-name" style={{ "--na": a, "--nb": b }}>
      {children}
    </span>
  );
}

// Extra class for an avatar element that has Halo Avatar.
export function haloClass(flair) {
  return hasPerk(flair, "halo_avatar") ? " has-halo" : "";
}
