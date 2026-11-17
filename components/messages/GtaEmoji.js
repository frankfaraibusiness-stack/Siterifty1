// The GTA6FanBase emoji pack: our own artwork, drawn as SVG so no system
// emoji are ever used. Keyed by the ids in lib/chat-config.js (EMOJI).
// Render <EmojiDefs /> once on a page (gradients live there), then use
// <GtaEmoji id="fire" size={24} /> anywhere.

const INK = "#3a1a33";
const g = (id) => `url(#ge-${id})`;

const GRADS = {
  face: ["#ffe985", "#ffb23a"],
  hot: ["#ff9a6a", "#ff3d4f"],
  pink: ["#ff8cc0", "#ff2d7a"],
  gold: ["#ffe98a", "#f2a117"],
  cyan: ["#9af6ff", "#1fb0e6"],
  green: ["#9bf27a", "#2fb04a"],
  violet: ["#c3a0ff", "#6a3de8"],
  red: ["#ff7a7a", "#d4203a"],
  blue: ["#7cbcff", "#2a62e0"],
  bone: ["#ffffff", "#d3cbe8"],
  dark: ["#5a4d7a", "#1d1830"],
  sun: ["#ffe066", "#ff3d7f"],
  orange: ["#ffc04d", "#ff5a1f"],
};

export function EmojiDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      <defs>
        {Object.entries(GRADS).map(([id, [a, b]]) => (
          <linearGradient key={id} id={`ge-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={a} />
            <stop offset="1" stopColor={b} />
          </linearGradient>
        ))}
        <mask id="ge-sunmask" maskUnits="userSpaceOnUse" x="0" y="0" width="32" height="32">
          <rect width="32" height="32" fill="#fff" />
          <rect y="16.6" width="32" height="1.2" fill="#000" />
          <rect y="19.4" width="32" height="1.8" fill="#000" />
          <rect y="22.6" width="32" height="2.4" fill="#000" />
        </mask>
      </defs>
    </svg>
  );
}

const Face = ({ fill = "face" }) => (
  <>
    <circle cx="16" cy="16" r="14" fill={g(fill)} />
    <circle cx="16" cy="16" r="13.6" fill="none" stroke="#000" strokeOpacity=".14" />
    <ellipse cx="11" cy="7.6" rx="6" ry="2.8" fill="#fff" opacity=".24" transform="rotate(-18 11 7.6)" />
  </>
);
const stroke = { fill: "none", stroke: INK, strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round" };
const eye = (x, y = 12.8, rx = 1.9, ry = 2.6) => <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={INK} />;

const ART = {
  grin: (
    <>
      <Face />
      {eye(11.2)}
      {eye(20.8)}
      <path d="M8.5 18.2h15c0 4.6-3.4 7.6-7.5 7.6s-7.5-3-7.5-7.6z" fill={INK} />
      <path d="M9.8 18.2h12.4v2.4H9.8z" fill="#fff" />
      <path d="M12 24c1-.9 2.5-1.4 4-1.4s3 .5 4 1.4c-1 1.2-2.4 1.9-4 1.9s-3-.7-4-1.9z" fill="#ff6b88" />
    </>
  ),
  lol: (
    <>
      <Face />
      <path d="M7.8 13.8q3.2-3.8 6.4 0M17.8 13.8q3.2-3.8 6.4 0" {...stroke} />
      <path d="M8.5 18.6h15c0 4.4-3.4 7.2-7.5 7.2s-7.5-2.8-7.5-7.2z" fill={INK} />
      <path d="M12 24c1-.9 2.5-1.3 4-1.3s3 .4 4 1.3c-1 1.1-2.4 1.8-4 1.8s-3-.7-4-1.8z" fill="#ff6b88" />
      <path d="M4.6 15.4c-2.4 2.4-2 5 0 5s2.4-2.6 0-5zM27.4 15.4c2.4 2.4 2 5 0 5s-2.4-2.6 0-5z" fill="#5fd8ff" />
    </>
  ),
  wink: (
    <>
      <Face />
      {eye(11.2)}
      <path d="M17.4 13.4q3.3-3 6.4 0" {...stroke} />
      <path d="M8.8 19q7.2 7.4 14.4 0" {...stroke} />
    </>
  ),
  cool: (
    <>
      <Face />
      <path d="M4.2 10.8h10.4v4.2c0 2.6-2.2 4.2-5.2 4.2S4.2 17.6 4.2 15z" fill={INK} />
      <path d="M17.4 10.8h10.4v4.2c0 2.6-2.2 4.2-5.2 4.2s-5.2-1.6-5.2-4.2z" fill={INK} />
      <path d="M14.6 12.2q1.4-1.2 2.8 0" {...stroke} strokeWidth="1.6" />
      <path d="M6.2 12.4h3.6l-2.6 3.4zM19.4 12.4H23l-2.6 3.4z" fill="#ff7ab8" opacity=".85" />
      <path d="M10.6 22.6q5.4 3.4 10.8 0" {...stroke} />
    </>
  ),
  love: (
    <>
      <Face />
      <path id="ge-h" d="M11 17.6c-3.4-2.5-4.8-4.2-4.8-6a2.6 2.6 0 0 1 4.8-1.4 2.6 2.6 0 0 1 4.8 1.4c0 1.8-1.4 3.5-4.8 6z" fill="#ff2d5f" />
      <path d="M21 17.6c-3.4-2.5-4.8-4.2-4.8-6a2.6 2.6 0 0 1 4.8-1.4 2.6 2.6 0 0 1 4.8 1.4c0 1.8-1.4 3.5-4.8 6z" fill="#ff2d5f" />
      <path d="M10.4 20.8c.8 3.2 3 4.8 5.6 4.8s4.8-1.6 5.6-4.8z" fill={INK} />
    </>
  ),
  shock: (
    <>
      <Face />
      <ellipse cx="11" cy="13.2" rx="3.2" ry="3.8" fill="#fff" />
      <ellipse cx="21" cy="13.2" rx="3.2" ry="3.8" fill="#fff" />
      <circle cx="11.2" cy="13.8" r="1.6" fill={INK} />
      <circle cx="20.8" cy="13.8" r="1.6" fill={INK} />
      <path d="M7.4 8q3.2-2.2 6.4 0M18.2 8q3.2-2.2 6.4 0" {...stroke} strokeWidth="1.8" />
      <ellipse cx="16" cy="23.4" rx="3.2" ry="4" fill={INK} />
    </>
  ),
  think: (
    <>
      <Face />
      {eye(11.2, 14, 1.7, 2.3)}
      {eye(20.8, 14, 1.7, 2.3)}
      <path d="M7.8 9.8q3-1.8 6 .2M18 8q3-1.4 6.2.4" {...stroke} strokeWidth="1.8" />
      <path d="M11.6 23.4q2.2-1.6 4.4 0t4.4-1.2" {...stroke} strokeWidth="2" />
    </>
  ),
  sleepy: (
    <>
      <Face />
      <path d="M7.8 13.6q3.2 3 6.4 0M17.8 13.6q3.2 3 6.4 0" {...stroke} />
      <ellipse cx="16" cy="22.6" rx="2.2" ry="1.8" fill={INK} />
      <path d="M22 3.6h5l-5 5h5" fill="none" stroke="#8fd3ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sad: (
    <>
      <Face />
      {eye(11.2, 14)}
      {eye(20.8, 14)}
      <path d="M7.6 9.6l5.2 1.8M24.4 9.6l-5.2 1.8" {...stroke} strokeWidth="1.8" />
      <path d="M10.4 24.4q5.6-5.2 11.2 0" {...stroke} />
      <path d="M23.4 17c-2 2.2-1.6 4.4.2 4.4s2.2-2.4-.2-4.4z" fill="#5fd8ff" />
    </>
  ),
  angry: (
    <>
      <Face fill="hot" />
      <path d="M7 8.4l7.4 3.4M25 8.4l-7.4 3.4" {...stroke} strokeWidth="2.8" />
      {eye(11.4, 14.6, 1.8, 2.2)}
      {eye(20.6, 14.6, 1.8, 2.2)}
      <path d="M10.4 24.4q5.6-4.8 11.2 0" {...stroke} strokeWidth="2.4" />
    </>
  ),

  fire: (
    <>
      <path d="M16 2c.8 4.6 7.6 8.2 7.6 16A7.6 7.6 0 0 1 16 29.6 7.6 7.6 0 0 1 8.4 18c0-3 1.4-5.2 3.1-7 .3 2.4 1.5 3.8 2.8 4.3C13.7 10.6 14.4 5.4 16 2z" fill={g("orange")} />
      <path d="M16 15.4c.7 2.6 4 4.2 4 8a4 4 0 0 1-8 0c0-1.8.8-2.8 1.7-3.7.1 1.1.8 1.8 1.4 2-.2-2.5.1-4.8.9-6.3z" fill={g("gold")} />
    </>
  ),
  heart: (
    <>
      <path d="M16 28.4C6 21.2 2.8 15.6 2.8 11.2A6.8 6.8 0 0 1 9.7 4.4c2.6 0 4.8 1.5 6.3 3.7 1.5-2.2 3.7-3.7 6.3-3.7a6.8 6.8 0 0 1 6.9 6.8c0 4.4-3.2 10-13.2 17.2z" fill={g("pink")} />
      <ellipse cx="9.6" cy="9.6" rx="2.8" ry="1.7" fill="#fff" opacity=".45" transform="rotate(-35 9.6 9.6)" />
    </>
  ),
  hundred: (
    <>
      <text x="16" y="21.4" textAnchor="middle" fontSize="15.5" fontWeight="900" fontStyle="italic" fontFamily="Arial Black, Impact, sans-serif" fill="#ff4458" stroke="#fff" strokeWidth=".7" paintOrder="stroke">100</text>
      <path d="M4.6 25.2h22.8M8.4 28h15.2" stroke="#ff4458" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  bolt: <path d="M18.8 1.8L5.4 18.4h8.4l-2.2 11.8L26.6 12h-8.8z" fill={g("gold")} stroke="#f2a117" strokeWidth="1" strokeLinejoin="round" />,
  star: <path d="M16 2.2l4.1 8.7 9.5 1.2-7 6.5 1.8 9.4L16 23.3l-8.4 4.7 1.8-9.4-7-6.5 9.5-1.2z" fill={g("gold")} stroke="#f2a117" strokeWidth="1.2" strokeLinejoin="round" />,
  thumbs: (
    <>
      <path d="M10.6 14.4l4.4-9.2c1.8-.2 3.2 1.2 2.7 3.2l-1 4h8.4c1.7 0 2.8 1.6 2.4 3.2l-2.2 9c-.4 1.7-1.7 3-3.4 3H10.6z" fill={g("face")} />
      <path d="M2.8 13.8h5.8V28H2.8z" fill={g("blue")} />
      <path d="M12 20h9M12.6 24h8" stroke="#000" strokeOpacity=".12" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  eyes: (
    <>
      <ellipse cx="9.6" cy="16" rx="6.2" ry="8.4" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <ellipse cx="22.4" cy="16" rx="6.2" ry="8.4" fill="#fff" stroke={INK} strokeOpacity=".5" />
      <ellipse cx="11.4" cy="18.2" rx="2.6" ry="3.4" fill={INK} />
      <ellipse cx="24.2" cy="18.2" rx="2.6" ry="3.4" fill={INK} />
      <circle cx="12.2" cy="16.8" r=".9" fill="#fff" />
      <circle cx="25" cy="16.8" r=".9" fill="#fff" />
    </>
  ),
  gg: (
    <>
      <rect x="1.8" y="6" width="28.4" height="20" rx="7" fill={g("violet")} />
      <rect x="1.8" y="6" width="28.4" height="20" rx="7" fill="none" stroke="#fff" strokeOpacity=".4" />
      <text x="16" y="21.2" textAnchor="middle" fontSize="13.6" fontWeight="900" fontFamily="Arial Black, Impact, sans-serif" fill="#fff">GG</text>
      <path d="M8 23.6h16" stroke="#2de2c5" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  six: (
    <>
      <circle cx="16" cy="16" r="14" fill={g("sun")} />
      <circle cx="16" cy="16" r="13.4" fill="none" stroke="#fff" strokeOpacity=".4" />
      <text x="16" y="23" textAnchor="middle" fontSize="20" fontWeight="900" fontFamily="Arial Black, Impact, sans-serif" fill="#fff" stroke="#7b2ff7" strokeWidth=".9" paintOrder="stroke">6</text>
    </>
  ),
  trophy: (
    <>
      <path d="M9 4h14v8a7 7 0 0 1-14 0z" fill={g("gold")} />
      <path d="M9 7H4.6c0 4.4 2 7 5.2 7.4M23 7h4.4c0 4.4-2 7-5.2 7.4" fill="none" stroke="#f2a117" strokeWidth="2" strokeLinecap="round" />
      <path d="M14.4 19h3.2v4h-3.2z" fill="#f2a117" />
      <path d="M10 23.4h12v3.2a1.4 1.4 0 0 1-1.4 1.4H11.4A1.4 1.4 0 0 1 10 26.6z" fill={g("violet")} />
      <path d="M12.4 6.6v5.6" stroke="#fff" opacity=".55" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  crown: (
    <>
      <path d="M3.6 9l6.4 6 6-9.4 6 9.4 6.4-6-2.2 17.4H5.8z" fill={g("gold")} stroke="#f2a117" strokeWidth="1" strokeLinejoin="round" />
      <circle cx="16" cy="19" r="2.2" fill="#ff3d7f" />
      <circle cx="9.6" cy="21" r="1.5" fill="#2de2c5" />
      <circle cx="22.4" cy="21" r="1.5" fill="#2de2c5" />
    </>
  ),
  diamond: (
    <>
      <path d="M9 5h14l6 7.2-13 16.4L3 12.2z" fill={g("cyan")} />
      <path d="M3 12.2h26M12 5l-3 7.2 7 16.4 7-16.4L20 5M9 12.2L16 5l7 7.2" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.1" strokeLinejoin="round" />
    </>
  ),

  skull: (
    <>
      <path d="M16 3c-6.7 0-11 4.2-11 10 0 3.6 1.6 6 3.6 7.2V25a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2v-4.8c2-1.2 3.6-3.6 3.6-7.2 0-5.8-4.3-10-11-10z" fill={g("bone")} />
      <ellipse cx="11.3" cy="14.2" rx="3.4" ry="3.9" fill={INK} />
      <ellipse cx="20.7" cy="14.2" rx="3.4" ry="3.9" fill={INK} />
      <circle cx="11.3" cy="14.8" r="1.1" fill="#ff3d7f" />
      <circle cx="20.7" cy="14.8" r="1.1" fill="#ff3d7f" />
      <path d="M16 18.4l-1.9 3.4h3.8z" fill={INK} />
      <path d="M12.6 24.6v-2.8M16 24.6v-2.8M19.4 24.6v-2.8" stroke={INK} strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  mask: (
    <>
      <path d="M5.2 10c0-4.4 4.8-7 10.8-7s10.8 2.6 10.8 7v10.8c0 4.4-4.4 8.2-10.8 8.2S5.2 25.2 5.2 20.8z" fill={g("dark")} />
      <rect x="7.6" y="10.4" width="7.2" height="4.6" rx="2.3" fill={g("face")} />
      <rect x="17.2" y="10.4" width="7.2" height="4.6" rx="2.3" fill={g("face")} />
      <circle cx="11.2" cy="12.7" r="1.3" fill={INK} />
      <circle cx="20.8" cy="12.7" r="1.3" fill={INK} />
      <rect x="12.4" y="20.4" width="7.2" height="3.6" rx="1.8" fill="#ff3d7f" />
      <path d="M5.6 17.4h20.8" stroke="#ff3d7f" strokeWidth="1.3" opacity=".7" />
    </>
  ),
  siren: (
    <>
      <path d="M8.6 24v-6.6a7.4 7.4 0 0 1 7.4-7.4V24z" fill={g("red")} />
      <path d="M16 10a7.4 7.4 0 0 1 7.4 7.4V24H16z" fill={g("blue")} />
      <rect x="5.6" y="24" width="20.8" height="4.4" rx="1.6" fill={g("dark")} />
      <path d="M16 2.6v3.2M6.8 6l2.2 2.4M25.2 6L23 8.4M3 14l3 .6M29 14l-3 .6" stroke="#ffe066" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M10.6 14.4a5 5 0 0 1 3-2.4" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.5" strokeLinecap="round" />
    </>
  ),
  bag: (
    <>
      <path d="M11 5.4c1.6 1.4 8.4 1.4 10 0L18.6 11c4.2 2 7 5.8 7 10.4 0 4.6-4 7.6-9.6 7.6s-9.6-3-9.6-7.6c0-4.6 2.8-8.4 7-10.4z" fill={g("green")} />
      <path d="M12.6 10.6c2.2 1 4.6 1 6.8 0" stroke="#1a7a32" strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <text x="16" y="25" textAnchor="middle" fontSize="12.5" fontWeight="900" fontFamily="Arial Black, Impact, sans-serif" fill="#fff">$</text>
    </>
  ),
  cash: (
    <>
      <rect x="2.4" y="8" width="27.2" height="16" rx="3" fill={g("green")} />
      <rect x="5" y="10.6" width="22" height="10.8" rx="1.8" fill="none" stroke="#fff" strokeOpacity=".55" />
      <circle cx="16" cy="16" r="4.4" fill="#fff" fillOpacity=".92" />
      <text x="16" y="19.6" textAnchor="middle" fontSize="8.6" fontWeight="900" fontFamily="Arial Black, Impact, sans-serif" fill="#1a7a32">$</text>
    </>
  ),
  target: (
    <>
      <circle cx="16" cy="16" r="13.2" fill="#fff" stroke={INK} strokeOpacity=".3" />
      <circle cx="16" cy="16" r="9.4" fill="#ff3d4f" />
      <circle cx="16" cy="16" r="5.4" fill="#fff" />
      <circle cx="16" cy="16" r="2.4" fill="#ff3d4f" />
    </>
  ),

  car: (
    <>
      <path d="M2 21.6v-3.8c0-1 .7-1.8 1.7-2l5-1.2 4-4.6c.6-.7 1.5-1 2.4-1h5.2c1 0 1.9.5 2.5 1.3l2.3 3.5 3 .7c1.1.2 1.9 1.1 1.9 2.3v4.8c0 .7-.6 1.2-1.3 1.2H3.3c-.7 0-1.3-.5-1.3-1.2z" fill={g("pink")} />
      <path d="M12 15.2l2.4-2.8c.4-.4.8-.6 1.4-.6h4.2c.6 0 1 .3 1.4.8l1.8 2.6z" fill={g("cyan")} />
      <path d="M4 19.6h24" stroke="#fff" strokeOpacity=".5" strokeWidth="1" />
      <path d="M27.4 17.6h2.2l-.3 1.8h-1.9z" fill="#ffe066" />
      <circle cx="9" cy="22.4" r="4.2" fill={INK} />
      <circle cx="23.4" cy="22.4" r="4.2" fill={INK} />
      <circle cx="9" cy="22.4" r="1.8" fill="#cfc6e6" />
      <circle cx="23.4" cy="22.4" r="1.8" fill="#cfc6e6" />
    </>
  ),
  bike: (
    <>
      <circle cx="7.4" cy="21.4" r="5" fill="none" stroke={INK} strokeWidth="2.6" />
      <circle cx="24.6" cy="21.4" r="5" fill="none" stroke={INK} strokeWidth="2.6" />
      <path d="M7.4 21.4l5.2-7.4h6.4l5.6 7.4M20.6 12.4l2.2-2.6h3" fill="none" stroke={g("pink")} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12.4 14.2c1-2.2 3-3.2 5.4-3.2h2l1.2 2.2-2.4 1.8z" fill={g("orange")} />
      <path d="M9.4 12.4h5l-1 1.8H10z" fill={INK} />
      <circle cx="7.4" cy="21.4" r="1.4" fill="#cfc6e6" />
      <circle cx="24.6" cy="21.4" r="1.4" fill="#cfc6e6" />
    </>
  ),
  heli: (
    <>
      <path d="M2.6 8h22M13.6 8.2v3.4" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <path d="M20.6 15.4l9.2-3.4v3.8l-8.2 3.2z" fill={g("pink")} />
      <ellipse cx="13.6" cy="17" rx="9" ry="6" fill={g("pink")} />
      <path d="M7.6 15.6a6.4 5.2 0 0 1 5.4-3.4v6.2H6.4z" fill={g("cyan")} />
      <path d="M5.6 25.4h17.6M9 23.2v2.2M19.6 23.2v2.2" stroke={INK} strokeWidth="2" strokeLinecap="round" />
      <circle cx="29.2" cy="12.8" r="1.6" fill="none" stroke={INK} strokeWidth="1.3" />
    </>
  ),
  boat: (
    <>
      <path d="M2.8 19.4h26.4l-3.8 6.4a2 2 0 0 1-1.7 1H8.3a2 2 0 0 1-1.7-1z" fill={g("pink")} />
      <path d="M10 19.4l3.2-5.8h7l3.8 5.8z" fill={g("cyan")} />
      <path d="M4.6 22.2h22.8" stroke="#fff" strokeOpacity=".6" strokeWidth="1.2" />
      <path d="M2 29q3-2.2 6 0t6 0 6 0 6 0" fill="none" stroke="#5fd8ff" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  plane: (
    <g transform="rotate(-42 16 16) scale(.92) translate(1.4 1.4)">
      <path d="M16 1.6c1.1 0 1.9 1 1.9 2.6V12l11.2 6.8v3.2l-11.2-3.4v5.2l3.2 2.6V30L16 28.6 10.9 30v-2.2l3.2-2.6v-5.2L2.9 22v-3.2L14.1 12V4.2c0-1.6.8-2.6 1.9-2.6z" fill={g("bone")} stroke="#6a3de8" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M16 3.6v6" stroke="#6a3de8" strokeWidth="1.6" strokeLinecap="round" />
    </g>
  ),

  palm: (
    <>
      <path d="M15 29.6c.2-6.2.8-11.4 2.6-16.6" fill="none" stroke="#a8693a" strokeWidth="3.4" strokeLinecap="round" />
      {[-78, -42, 0, 42, 78].map((r) => (
        <path key={r} d="M17.6 13C14.4 9.4 14.8 5 17.6 2c2.8 3 3.2 7.4 0 11z" fill={g("green")} transform={`rotate(${r} 17.6 13)`} />
      ))}
      <circle cx="15.8" cy="14.6" r="1.7" fill="#7a4a22" />
      <circle cx="19.4" cy="14.8" r="1.7" fill="#7a4a22" />
    </>
  ),
  sunset: (
    <>
      <circle cx="16" cy="15" r="11.5" fill={g("sun")} mask="url(#ge-sunmask)" />
      <path d="M2 26.4q3.5-2 7 0t7 0 7 0 7 0" fill="none" stroke="#5fd8ff" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 30q3-1.6 6 0t6 0 6 0" fill="none" stroke="#ff7ab8" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  gator: (
    <>
      <path d="M2.6 17c0-3.2 2.6-5.4 6-5.4h6.4c1.4 0 2.4.6 3.4 1.4l.6.4h8.6c1.4 0 2.4.9 2.4 2.2V17.6H2.6z" fill={g("green")} />
      <path d="M2.6 17.6h26.8v1.2c0 1.2-.8 2.2-2.2 2.2h-7.6l-2.6 3.4c-1 .8-2 1.2-3.2 1.2H8.6c-3.4 0-6-2.2-6-5.6z" fill="#2a9a42" />
      <path d="M17.4 17.6l1.2 2.6 1.2-2.6 1.2 2.6 1.2-2.6 1.2 2.6 1.2-2.6 1.2 2.6 1.2-2.6" fill="#fff" stroke="#fff" strokeWidth=".6" strokeLinejoin="round" />
      <circle cx="11.6" cy="12.6" r="2.7" fill="#ffe066" />
      <ellipse cx="12" cy="12.8" rx="1" ry="1.9" fill={INK} />
      <circle cx="28.4" cy="14.6" r="1" fill={INK} />
    </>
  ),
  flamingo: (
    <>
      <path d="M13 24.2l-1 5.8M16.6 24.4l.8 5.6" stroke="#ff7aa8" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M7.6 17.2L2.8 14.4l3.6 5z" fill={INK} />
      <ellipse cx="14.4" cy="19.4" rx="8.2" ry="5.4" fill={g("pink")} />
      <path d="M10 19.4c2.4 3 7 3 9.6.2-3-.4-6.4-.4-9.6-.2z" fill="#ff2d7a" />
      <path d="M20.4 16c3.2-1.4 4.4-4.2 2.6-6.8-1.2-1.8-3.8-1.6-4.6.2" fill="none" stroke="#ff8cc0" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="18.6" cy="8" r="2.6" fill="#ff8cc0" />
      <path d="M19.8 7.2l3.6 1.6-3.4 1.8z" fill={INK} />
      <circle cx="18.2" cy="7.4" r=".8" fill={INK} />
    </>
  ),
  pin: (
    <>
      <path d="M16 2.4c5.5 0 9.4 4 9.4 9.4 0 7-9.4 18-9.4 18S6.6 18.8 6.6 11.8C6.6 6.4 10.5 2.4 16 2.4z" fill={g("red")} />
      <circle cx="16" cy="11.8" r="3.8" fill="#fff" />
    </>
  ),
  controller: (
    <>
      <path d="M9.6 7.6h12.8c3.6 0 5.6 2.4 6.6 7l1.4 6.4c.5 2.6-1.2 4.6-3.6 4.6-1.4 0-2.4-.6-3.4-1.8L21 20.6H11l-2.4 3.2c-1 1.2-2 1.8-3.4 1.8-2.4 0-4.1-2-3.6-4.6l1.4-6.4c1-4.6 3-7 7-7z" fill={g("violet")} />
      <circle cx="10.4" cy="13.6" r="2.2" fill={INK} />
      <path d="M13.6 17.6v4.4M11.4 19.8h4.4" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="22.6" cy="12.8" r="1.3" fill="#ff3d7f" />
      <circle cx="25.2" cy="15.4" r="1.3" fill="#2de2c5" />
      <circle cx="20" cy="15.4" r="1.3" fill="#ffe066" />
      <circle cx="22.6" cy="18" r="1.3" fill="#7ff2ff" />
    </>
  ),
};

export default function GtaEmoji({ id, size = 22, className = "", title }) {
  const art = ART[id];
  if (!art) return null;
  return (
    <svg
      className={`ge ${className}`.trim()}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      role="img"
      aria-label={title || id}
    >
      {art}
    </svg>
  );
}
