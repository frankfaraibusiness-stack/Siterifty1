import { BADGES, getPlan, planRank } from "@/lib/plans";

// Scalloped seal used for the verified badge.
const SEAL = "M22.75 12.00 L22.57 12.69 L22.09 13.33 L21.42 13.87 L20.72 14.34 L20.15 14.77 L19.81 15.23 L19.72 15.81 L19.82 16.51 L19.98 17.33 L20.07 18.19 L19.97 18.99 L19.60 19.60 L18.99 19.97 L18.19 20.07 L17.33 19.98 L16.51 19.82 L15.81 19.72 L15.23 19.81 L14.77 20.15 L14.34 20.72 L13.87 21.42 L13.33 22.09 L12.69 22.57 L12.00 22.75 L11.31 22.57 L10.67 22.09 L10.13 21.42 L9.66 20.72 L9.23 20.15 L8.77 19.81 L8.19 19.72 L7.49 19.82 L6.67 19.98 L5.81 20.07 L5.01 19.97 L4.40 19.60 L4.03 18.99 L3.93 18.19 L4.02 17.33 L4.18 16.51 L4.28 15.81 L4.19 15.23 L3.85 14.77 L3.28 14.34 L2.58 13.87 L1.91 13.33 L1.43 12.69 L1.25 12.00 L1.43 11.31 L1.91 10.67 L2.58 10.13 L3.28 9.66 L3.85 9.23 L4.19 8.77 L4.28 8.19 L4.18 7.49 L4.02 6.67 L3.93 5.81 L4.03 5.01 L4.40 4.40 L5.01 4.03 L5.81 3.93 L6.67 4.02 L7.49 4.18 L8.19 4.28 L8.77 4.19 L9.23 3.85 L9.66 3.28 L10.13 2.58 L10.67 1.91 L11.31 1.43 L12.00 1.25 L12.69 1.43 L13.33 1.91 L13.87 2.58 L14.34 3.28 L14.77 3.85 L15.23 4.19 L15.81 4.28 L16.51 4.18 L17.33 4.02 L18.19 3.93 L18.99 4.03 L19.60 4.40 L19.97 5.01 L20.07 5.81 L19.98 6.67 L19.82 7.49 L19.72 8.19 L19.81 8.77 L20.15 9.23 L20.72 9.66 L21.42 10.13 L22.09 10.67 L22.57 11.31Z";

function Icon({ id }) {
  if (id === "verified") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={SEAL} fill="currentColor" />
        <path d="M7.6 12.4l3 3 5.8-6.2" fill="none" stroke="#14101f" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (id === "crown") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M2.8 7.6l4.7 4.1L12 4.6l4.5 7.1 4.7-4.1-2 11.2H4.8L2.8 7.6z" fill="currentColor" />
        <path d="M5.6 21.4h12.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "target") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
        <path d="M12 1.8v4M12 18.2v4M1.8 12h4M18.2 12h4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (id === "creator") {
    // coin with a dollar sign
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path d="M14.9 9.4c-.4-1-1.4-1.6-2.9-1.6-1.6 0-2.8.9-2.8 2.1 0 2.9 5.8 1.5 5.8 4.3 0 1.3-1.3 2.2-3.1 2.2-1.4 0-2.5-.6-3-1.7M12 5.9v1.9M12 16.3v1.9" fill="none" stroke="#14101f" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // diamond
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.2 3h11.6L22 9.2 12 21.4 2 9.2 6.2 3z" fill="currentColor" />
      <path d="M2.4 9.2h19.2M9.2 3L12 9.2 14.8 3M12 21L8.6 9.2M12 21l3.4-11.8" fill="none" stroke="#14101f" strokeOpacity=".45" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

// Plan badges next to a name. Free plan (or no plan) renders nothing.
// Sized in em, so it scales with the surrounding text.
export default function PlanBadges({ plan, className = "" }) {
  if (planRank(plan) === 0) return null;
  const p = getPlan(plan);
  return (
    <span
      className={`pb ${className}`.trim()}
      style={{ "--a": p.a, "--b": p.b }}
      role="img"
      aria-label={`${p.name} member`}
      title={p.name}
    >
      {p.badges.map((id) => (
        <span
          key={id}
          className={`pb-i pb-${id}`}
          style={BADGES[id].color ? { color: BADGES[id].color } : undefined}
        >
          <Icon id={id} />
        </span>
      ))}
    </span>
  );
}
