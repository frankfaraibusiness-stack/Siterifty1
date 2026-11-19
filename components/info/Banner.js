// Hero art for the info pages: a Vice City sunset with a different centrepiece
// for every page (shield, cookie, road sign, billboard, lifebuoy...). Pure SVG,
// drawn on the server, so there is nothing to download and it stays sharp on
// any screen. The two page colours (a, b) tint the buildings, windows and glow.
//
// viewBox is 1200 x 340. Text sits on the left of the hero (CSS fades the art
// there); every centrepiece lives on the right, around x = 930.

const W = 1200;
const H = 340;
const GROUND = 292;
const DISPLAY = { fontFamily: "var(--font-display), Impact, sans-serif" };

// Small seeded random, so the skyline is the same every render.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function buildings(seed, x0, x1, minH, maxH) {
  const r = rng(seed);
  const out = [];
  let x = x0;
  while (x < x1) {
    const w = 22 + Math.floor(r() * 34);
    const h = minH + Math.floor(r() * (maxH - minH));
    const windows = [];
    for (let wy = GROUND - h + 10; wy < GROUND - 8; wy += 11) {
      for (let wx = x + 5; wx < x + w - 6; wx += 9) {
        if (r() > 0.78) windows.push([wx, wy]);
      }
    }
    out.push({ x, w, h, windows });
    x += w + 3 + Math.floor(r() * 8);
  }
  return out;
}

function Stars({ seed }) {
  const r = rng(seed);
  const dots = Array.from({ length: 36 }, () => [r() * W, r() * 150, r() * 1.4 + 0.5, r() * 0.5 + 0.25]);
  return (
    <g fill="#fff">
      {dots.map(([x, y, rad, o], i) => (
        <circle key={i} cx={x.toFixed(1)} cy={y.toFixed(1)} r={rad.toFixed(1)} opacity={o.toFixed(2)} />
      ))}
    </g>
  );
}

function Sun({ k, cx, cy, r }) {
  const bars = [
    [0.12, 3],
    [0.3, 5],
    [0.5, 7],
    [0.7, 9],
  ];
  return (
    <g>
      <defs>
        <linearGradient id={`${k}-sun`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffd36b" />
          <stop offset=".55" stopColor="#ff7a59" />
          <stop offset="1" stopColor="#ff3d7f" />
        </linearGradient>
        <mask id={`${k}-sm`}>
          <rect x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill="#fff" />
          {bars.map(([f, h]) => (
            <rect key={f} x={cx - r} y={cy + r * f} width={r * 2} height={h} fill="#000" />
          ))}
        </mask>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={`url(#${k}-sun)`} mask={`url(#${k}-sm)`} />
    </g>
  );
}

function Skyline({ seed, a, b }) {
  const far = buildings(seed, 280, W, 40, 120);
  const near = buildings(seed + 7, 300, W, 24, 70);
  return (
    <g>
      <g fill={a} opacity=".22">
        {far.map((bd) => (
          <rect key={bd.x} x={bd.x} y={GROUND - bd.h} width={bd.w} height={bd.h + 2} />
        ))}
      </g>
      <g fill={b} opacity=".7">
        {far.flatMap((bd) => bd.windows).map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="3" height="4" />
        ))}
      </g>
      <g fill="#1a1030" opacity=".95">
        {near.map((bd) => (
          <rect key={bd.x} x={bd.x} y={GROUND - bd.h} width={bd.w} height={bd.h + 2} />
        ))}
      </g>
    </g>
  );
}

function Palm({ id }) {
  return (
    <g id={id}>
      <path d="M0 0C5-42 3-84-8-128" fill="none" stroke="#120f1c" strokeWidth="6" strokeLinecap="round" />
      <g fill="#120f1c" transform="translate(-8 -128)">
        <path d="M0 0C-26-24-62-22-92 4 -58-8-28-10 0 0z" />
        <path d="M0 0C26-26 62-24 92 2 58-8 28-10 0 0z" />
        <path d="M0 0C-18-34-44-52-78-52 -50-40-26-22 0 0z" />
        <path d="M0 0C18-34 44-52 78-52 50-40 26-22 0 0z" />
        <path d="M0 0C-4-30-2-56 6-80 8-52 6-26 0 0z" />
      </g>
    </g>
  );
}

function Ground({ k, a, b }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${k}-line`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={a} />
          <stop offset="1" stopColor={b} />
        </linearGradient>
      </defs>
      <rect y={GROUND} width={W} height={H - GROUND} fill="#120f1c" />
      <rect y={GROUND} width={W} height="2" fill={`url(#${k}-line)`} />
      <g stroke="#fff" strokeOpacity=".14" strokeWidth="2" strokeDasharray="26 22">
        <path d={`M0 ${GROUND + 24}H${W}`} />
      </g>
    </g>
  );
}

// ---- centrepieces (drawn around 0,0) --------------------------------------

function Terms({ a, b }) {
  return (
    <g>
      <rect x="-82" y="-112" width="164" height="206" rx="16" fill="#1b1330" stroke={a} strokeWidth="5" />
      <rect x="-56" y="-84" width="112" height="11" rx="5.5" fill={b} />
      {[-56, -34, -12, 10].map((y, i) => (
        <rect key={y} x="-56" y={y} width={i === 3 ? 66 : 112} height="8" rx="4" fill="#fff" opacity=".28" />
      ))}
      <circle cx="46" cy="66" r="36" fill={a} stroke="#1b1330" strokeWidth="6" />
      <path d="M29 66l12 12 22-24" fill="none" stroke="#14101f" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  );
}

function Privacy({ a, b }) {
  return (
    <g>
      <path d="M-70 150 -150 -40 -20 -40z" fill={b} opacity=".14" />
      <path d="M70 150 150 -40 20 -40z" fill={a} opacity=".14" />
      <path d="M0 -118 -92 -80v62c0 52 36 90 92 114 56-24 92-62 92-114v-62z" fill="#1b1330" stroke={a} strokeWidth="6" strokeLinejoin="round" />
      <path d="M0 -92 -68 -64v46c0 38 26 66 68 85 42-19 68-47 68-85v-46z" fill={b} opacity=".22" />
      <circle cx="0" cy="-14" r="17" fill={a} />
      <path d="M-7 -4h14l6 40h-26z" fill={a} />
    </g>
  );
}

function Cookies({ a, b }) {
  const chips = [
    [-34, -36, 11],
    [22, -52, 9],
    [-58, 16, 9],
    [10, 8, 12],
    [48, 34, 10],
    [-20, 56, 9],
  ];
  return (
    <g>
      <circle cx="0" cy="0" r="104" fill={b} opacity=".16" />
      <path d="M0 -92A92 92 0 1 0 92 0 38 38 0 0 1 54 -38 38 38 0 0 1 0 -92z" fill="#e8a45a" stroke="#6a3b2a" strokeWidth="6" strokeLinejoin="round" />
      <path d="M-70 -50A92 92 0 0 1 -20 -86" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="7" strokeLinecap="round" />
      {chips.map(([x, y, r]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r={r} fill="#4a2618" />
      ))}
      <g stroke={a} strokeOpacity=".5" strokeWidth="4" strokeLinecap="round">
        <path d="M-80 126h160M-52 144h104M-26 162h52" />
      </g>
    </g>
  );
}

function Guidelines({ a, b }) {
  return (
    <g>
      <rect x="-5" y="-30" width="10" height="150" fill="#2b2140" />
      <rect x="-96" y="-34" width="192" height="70" rx="12" fill="#1b1330" stroke={a} strokeWidth="5" />
      <text x="0" y="-4" textAnchor="middle" fontSize="23" fill="#fff" style={DISPLAY}>
        KEEP IT
      </text>
      <text x="0" y="24" textAnchor="middle" fontSize="27" fill={a} style={DISPLAY}>
        GTA 6
      </text>
      <g transform="translate(-110 -92)">
        <path d="M0 -36 36 0 0 36 -36 0z" fill={b} stroke="#14101f" strokeWidth="5" strokeLinejoin="round" />
        <path d="M-15 0l11 11 19-21" fill="none" stroke="#14101f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <g transform="translate(112 -86)">
        <circle r="30" fill="#14101f" stroke={a} strokeWidth="5" />
        <path d="M-12 -12 12 12M12 -12 -12 12" stroke={a} strokeWidth="6" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Copyright({ a, b }) {
  return (
    <g>
      <path d="M-100 150 -40 -30h80l60 180z" fill={a} opacity=".12" />
      <rect x="-5" y="40" width="10" height="90" fill="#2b2140" />
      <circle cx="0" cy="-20" r="92" fill="#1b1330" stroke={a} strokeWidth="7" />
      <circle cx="0" cy="-20" r="74" fill="none" stroke={b} strokeWidth="3" strokeDasharray="4 9" strokeLinecap="round" />
      <path d="M33 -48a40 40 0 1 0 0 56" fill="none" stroke="#fff" strokeWidth="13" strokeLinecap="round" />
    </g>
  );
}

function Disclaimer({ a, b }) {
  return (
    <g>
      <rect x="-70" y="40" width="10" height="92" fill="#2b2140" />
      <rect x="60" y="40" width="10" height="92" fill="#2b2140" />
      <rect x="-150" y="-88" width="300" height="136" rx="10" fill="#1b1330" stroke={a} strokeWidth="6" />
      <rect x="-136" y="-74" width="272" height="108" rx="5" fill="none" stroke={b} strokeOpacity=".55" strokeWidth="2" strokeDasharray="6 8" />
      <text x="0" y="-26" textAnchor="middle" fontSize="38" fill="#fff" style={DISPLAY}>
        FAN MADE.
      </text>
      <text x="0" y="22" textAnchor="middle" fontSize="38" fill={a} style={DISPLAY}>
        NOT ROCKSTAR.
      </text>
      <g fill={b}>
        <rect x="-110" y="-100" width="14" height="10" rx="2" />
        <rect x="-10" y="-100" width="14" height="10" rx="2" />
        <rect x="90" y="-100" width="14" height="10" rx="2" />
      </g>
    </g>
  );
}

function Help({ a, b }) {
  return (
    <g>
      <rect x="-66" y="52" width="10" height="80" fill="#2b2140" />
      <rect x="56" y="52" width="10" height="80" fill="#2b2140" />
      <path d="M-86 52h172l-14-34h-144z" fill="#1b1330" stroke={b} strokeWidth="5" strokeLinejoin="round" />
      <circle cx="0" cy="-34" r="88" fill="#1b1330" opacity=".6" />
      <circle cx="0" cy="-34" r="64" fill="none" stroke="#fff" strokeWidth="38" />
      <circle cx="0" cy="-34" r="64" fill="none" stroke={a} strokeWidth="38" strokeDasharray="100.5 100.5" />
      <circle cx="0" cy="-34" r="83" fill="none" stroke="#14101f" strokeOpacity=".6" strokeWidth="3" />
      <circle cx="0" cy="-34" r="45" fill="none" stroke="#14101f" strokeOpacity=".6" strokeWidth="3" />
    </g>
  );
}

function Contact({ a, b }) {
  return (
    <g>
      <rect x="-110" y="-70" width="220" height="150" rx="16" fill="#1b1330" stroke={a} strokeWidth="6" />
      <path d="M-104 -62 0 14 104 -62" fill="none" stroke={a} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M-104 72-30 4M104 72 30 4" fill="none" stroke={b} strokeOpacity=".7" strokeWidth="4" strokeLinecap="round" />
      <g transform="translate(86 -78)">
        <path d="M-44 -34h88a8 8 0 0 1 8 8v44a8 8 0 0 1-8 8H8L-16 50V26h-28a8 8 0 0 1-8-8v-44a8 8 0 0 1 8-8z" fill={b} stroke="#14101f" strokeWidth="5" strokeLinejoin="round" />
        <g fill="#14101f">
          <circle cx="-22" cy="-4" r="6" />
          <circle cx="0" cy="-4" r="6" />
          <circle cx="22" cy="-4" r="6" />
        </g>
      </g>
    </g>
  );
}

function About({ a, b, image }) {
  return (
    <g transform="rotate(-3)">
      <rect x="-196" y="-102" width="392" height="184" rx="18" fill="#1b1330" stroke={a} strokeWidth="6" />
      <clipPath id="about-clip">
        <rect x="-190" y="-96" width="380" height="172" rx="13" />
      </clipPath>
      {image && (
        <image
          href={image}
          x="-190"
          y="-96"
          width="380"
          height="172"
          preserveAspectRatio="xMidYMid slice"
          clipPath="url(#about-clip)"
        />
      )}
      <rect x="-190" y="-96" width="380" height="172" rx="13" fill="none" stroke={b} strokeOpacity=".5" strokeWidth="2" />
    </g>
  );
}

const SCENES = {
  terms: { Piece: Terms, sun: [1010, 214, 96], at: [930, 150] },
  privacy: { Piece: Privacy, sun: [830, 204, 100], at: [930, 160] },
  cookies: { Piece: Cookies, sun: [1040, 200, 70], at: [930, 138] },
  guidelines: { Piece: Guidelines, sun: [1040, 208, 90], at: [900, 170] },
  copyright: { Piece: Copyright, sun: [800, 210, 96], at: [930, 160] },
  disclaimer: { Piece: Disclaimer, sun: [1050, 200, 80], at: [910, 158] },
  help: { Piece: Help, sun: [1040, 214, 84], at: [920, 160] },
  contact: { Piece: Contact, sun: [820, 206, 92], at: [930, 160] },
  about: { Piece: About, sun: [1060, 200, 86], at: [915, 150] },
};

export default function Banner({ scene, a, b, image }) {
  const cfg = SCENES[scene] || SCENES.about;
  const k = `bn-${scene}`;
  const { Piece, sun, at } = cfg;
  const seed = scene.split("").reduce((n, c) => n + c.charCodeAt(0), 11);

  return (
    <svg
      className="ip-hero-art"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMaxYMax slice"
      aria-hidden="true"
      focusable="false"
    >
      <Stars seed={seed} />
      <Sun k={k} cx={sun[0]} cy={sun[1]} r={sun[2]} />
      <Skyline seed={seed} a={a} b={b} />
      <defs>
        <Palm id={`${k}-palm`} />
      </defs>
      <use href={`#${k}-palm`} x="470" y={GROUND + 6} opacity=".95" />
      <use href={`#${k}-palm`} x="1150" y={GROUND + 6} transform="translate(2300 0) scale(-1 1)" />
      <Ground k={k} a={a} b={b} />
      <g transform={`translate(${at[0]} ${at[1]})`}>
        <Piece a={a} b={b} image={image} />
      </g>
    </svg>
  );
}
