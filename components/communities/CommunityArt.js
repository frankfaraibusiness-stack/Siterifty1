// Presentational only (no hooks) so it works in server and client components.
import { getCommunityTheme } from "@/lib/community-schema";

const ICON_PATHS = {
  car: <><path d="M5 16l1.5-5a2 2 0 0 1 1.9-1.4h7.2A2 2 0 0 1 17.5 11L19 16" /><rect x="3" y="16" width="18" height="3.5" rx="1.5" /><circle cx="7.5" cy="17.7" r=".6" /><circle cx="16.5" cy="17.7" r=".6" /></>,
  pin: <><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  camera: <><path d="M4 8h3l1.6-2.2h6.8L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13" r="3.6" /></>,
  bolt: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  palm: <><path d="M12 22c0-6 .5-9 2-12" /><path d="M14 10c-1-3-4-4.5-8-4 2 .5 3.5 1.7 4.5 3.5" /><path d="M14 10c1-3.5 4-4.5 8-3.5-2.3.4-3.8 1.6-5 3.2" /><path d="M14 10c2.5.5 4.5 2.5 5 5-1.8-1.8-3.5-2.8-5-3" /><path d="M14 10c-2 1.2-3.8 3.2-4.2 5.5 1.2-1.5 2.6-2.6 4.2-3.5" /></>,
  music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
  star: <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6.100L12 16.9 6.6 19.800l1.1-6.100L3.2 9.400l6.1-.8L12 3z" />,
  crown: <><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8z" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" /></>,
  flame: <path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.2-3.5-7-.300 1.8-1.3 3-2.5 3 0-3-1.5-5.8-4-8 .200 3.5-3.5 5.8-3.5 11.500C5.5 19 8 22 12 22z" />,
  eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  skull: <><path d="M12 3a8 8 0 0 0-8 8c0 2.7 1.3 4.2 3 5.300V20h10v-3.700c1.7-1.1 3-2.6 3-5.300a8 8 0 0 0-8-8z" /><circle cx="9" cy="11.5" r="1.5" /><circle cx="15" cy="11.5" r="1.5" /><path d="M10 20v-2.500M14 20v-2.5" /></>,
};

export function CommunityIcon({ id, size = 22 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICON_PATHS[id] || ICON_PATHS.bolt}
    </svg>
  );
}

function Palm({ x, y, s = 1, color }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeLinecap="round" strokeWidth="3.5">
      <path d="M0 0C2-30 4-52 14-78" strokeWidth="4" />
      <path d="M14-78C2-92-16-92-34-80M14-78C26-96 48-96 66-82M14-78C28-80 46-72 54-56M14-78C4-76-12-70-22-54M14-78C14-96 20-108 34-114" />
    </g>
  );
}

// Banner scenes are drawn from the community's two theme colours.
export function BannerScene({ scene = "sunset", a, b }) {
  const id = `gcb-${scene}-${a.slice(1)}-${b.slice(1)}`;
  const dark = "#14111d";
  const skyline = (
    <path fill={dark} d="M0 200V150h30v-24h22v32h18v-46h26v56h20v-30h28v42h24v-62h20v62h30v-38h24v50h22v-70h30v70h26v-28h28v34h24v-52h24v52h30v-40h26v40h28v-26h22v26h26v-60h26v60h24v-34h28v34h40v10z" />
  );
  return (
    <svg className="gc-scene" viewBox="0 0 800 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={scene === "neon" ? "#1a1030" : b} />
          <stop offset="1" stopColor={scene === "neon" ? dark : a} />
        </linearGradient>
        <linearGradient id={`${id}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff2a8" />
          <stop offset="1" stopColor={a} />
        </linearGradient>
        <clipPath id={`${id}-clip`}><circle cx="560" cy="110" r="62" /></clipPath>
      </defs>
      <rect width="800" height="200" fill={`url(#${id}-sky)`} />
      {scene === "sunset" && (
        <>
          <circle cx="560" cy="110" r="62" fill={`url(#${id}-sun)`} />
          <g clipPath={`url(#${id}-clip)`} fill={b} opacity=".55">
            {[118, 134, 148, 160].map((y, i) => <rect key={y} x="480" y={y} width="170" height={2 + i * 1.5} />)}
          </g>
          {skyline}
          <Palm x={90} y={206} s={1.3} color={dark} />
          <Palm x={720} y={206} s={1} color={dark} />
        </>
      )}
      {scene === "neon" && (
        <>
          <g stroke={a} strokeWidth="1.2" opacity=".65">
            {Array.from({ length: 15 }, (_, i) => <line key={i} x1={400 + (i - 7) * 18} y1="112" x2={400 + (i - 7) * 120} y2="200" />)}
            {[118, 128, 142, 160, 184].map((y) => <line key={y} x1="0" y1={y} x2="800" y2={y} />)}
          </g>
          <g fill={b} opacity=".5">
            <rect x="150" y="58" width="40" height="54" /><rect x="205" y="30" width="30" height="82" /><rect x="520" y="44" width="36" height="68" /><rect x="570" y="70" width="48" height="42" />
          </g>
          <circle cx="400" cy="112" r="54" fill={a} opacity=".22" />
          <rect x="0" y="108" width="800" height="3" fill={a} />
        </>
      )}
      {scene === "lagoon" && (
        <>
          <circle cx="400" cy="92" r="52" fill={`url(#${id}-sun)`} />
          <rect y="112" width="800" height="88" fill={dark} opacity=".5" />
          <g stroke="#fff" opacity=".28" strokeWidth="2" strokeLinecap="round">
            {[124, 138, 154, 172].map((y, i) => <path key={y} d={`M${40 + i * 70} ${y}h${150 - i * 14}M${430 - i * 36} ${y + 6}h${210 + i * 20}`} />)}
          </g>
          <Palm x={690} y={150} s={1.1} color={dark} />
          <Palm x={120} y={160} s={.8} color={dark} />
        </>
      )}
      {scene === "hills" && (
        <>
          <circle cx="250" cy="96" r="40" fill={`url(#${id}-sun)`} />
          <path d="M0 150C90 110 190 130 290 118S520 96 640 128 760 120 800 112V200H0z" fill={dark} opacity=".42" />
          <path d="M0 172C120 140 220 168 360 152S600 136 800 166V200H0z" fill={dark} opacity=".72" />
          <path d="M0 192C160 170 300 190 460 180S700 176 800 188V200H0z" fill={dark} />
        </>
      )}
    </svg>
  );
}

export function CommunityBanner({ community, bannerSrc, className = "" }) {
  const { a, b } = community.a ? community : getCommunityTheme(community.theme);
  const src = bannerSrc || (community.hasBanner ? `/cmedia/${community.id}/banner?v=${community.assetsV || 0}` : null);
  return (
    <div className={`gc-banner ${className}`} style={{ "--a": a, "--b": b }}>
      {src ? <img src={src} alt="" /> : <BannerScene scene={community.scene} a={a} b={b} />}
    </div>
  );
}

export function CommunityAvatar({ community, avatarSrc, size = 56 }) {
  const { a, b } = community.a ? community : getCommunityTheme(community.theme);
  const src = avatarSrc || (community.hasAvatar ? `/cmedia/${community.id}/avatar?v=${community.assetsV || 0}` : null);
  return (
    <span className="gc-avatar" style={{ width: size, height: size, borderRadius: size * 0.3, "--a": a, "--b": b }}>
      {src ? <img src={src} alt="" /> : <CommunityIcon id={community.icon} size={Math.round(size * 0.46)} />}
    </span>
  );
}

// Handle shown like a Leonida plate: c/vice-city-spotters
export function HandlePlate({ slug }) {
  return <span className="gc-plate">c/{slug || "your-handle"}</span>;
}
