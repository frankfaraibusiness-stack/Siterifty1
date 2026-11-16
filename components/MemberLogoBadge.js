import { MEMBER_LOGO, hasMemberLogo } from "@/lib/plans";

// The GTA6 FanBase logo as a small badge. Renders nothing for the free plan
// (or no plan), so it can be dropped in anywhere a plan is known.
export default function MemberLogoBadge({ plan, className = "" }) {
  if (!hasMemberLogo(plan)) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={`mlb ${className}`.trim()}
      src={MEMBER_LOGO.src}
      alt={MEMBER_LOGO.label}
      title={MEMBER_LOGO.label}
      width="360"
      height="240"
      loading="lazy"
      decoding="async"
    />
  );
}
