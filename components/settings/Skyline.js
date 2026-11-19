// The sunset behind the player card. Colours come from the City Look variables,
// so the sun, skyline and palms recolour with the rest of the site.
const SKYLINE = [
  [18, 22, 30], [44, 18, 52], [66, 26, 36], [96, 16, 62], [116, 24, 42],
  [144, 20, 28], [170, 16, 56], [190, 26, 38], [250, 20, 32], [274, 24, 58],
  [302, 18, 40], [324, 28, 30],
];

export default function Skyline() {
  return (
    <svg
      className="st-skyline"
      viewBox="0 0 360 150"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="stSun" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: "var(--accent-lime)" }} />
          <stop offset=".55" style={{ stopColor: "var(--accent-pink)" }} />
          <stop offset="1" style={{ stopColor: "var(--accent-cyan)" }} />
        </linearGradient>
        <mask id="stSunMask">
          <rect width="360" height="150" fill="#fff" />
          <rect y="88" width="360" height="2" fill="#000" />
          <rect y="97" width="360" height="3.5" fill="#000" />
          <rect y="107" width="360" height="5" fill="#000" />
          <rect y="118" width="360" height="7" fill="#000" />
        </mask>
        <g id="stPalm">
          <path d="M0 0C3-24 2-48-5-72" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          <g fill="currentColor" transform="translate(-5 -72)">
            <path d="M0 0C-15-14-36-13-52 2-33-5-16-6 0 0z" />
            <path d="M0 0C15-15 36-14 52 1 33-5 16-6 0 0z" />
            <path d="M0 0C-10-20-25-30-45-30-29-23-15-13 0 0z" />
            <path d="M0 0C10-20 25-30 45-30 29-23 15-13 0 0z" />
            <path d="M0 0C-2-17-1-32 4-46 5-30 3-15 0 0z" />
          </g>
        </g>
      </defs>
      <circle cx="180" cy="112" r="64" fill="url(#stSun)" mask="url(#stSunMask)" />
      <g className="st-sky-blocks">
        {SKYLINE.map(([x, w, h]) => (
          <rect key={x} x={x} y={132 - h} width={w} height={h + 4} />
        ))}
      </g>
      <g className="st-sky-palms">
        <use href="#stPalm" x="42" y="140" />
        <use href="#stPalm" x="318" y="140" transform="translate(636 0) scale(-1 1)" />
      </g>
      <rect className="st-sky-ground" y="132" width="360" height="18" />
    </svg>
  );
}
