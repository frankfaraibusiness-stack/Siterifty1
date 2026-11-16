// Artwork for the full-screen Auth: a Leonida skyline with palms.
// Everything here is generated from a fixed seed, so the server and the
// browser always draw exactly the same picture (no hydration mismatch).

const W = 1200;
const H = 220;

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function towers(seed, minW, maxW, minH, maxH, withWindows) {
  const rand = rng(seed);
  const out = [];
  let x = -10;
  while (x < W) {
    const w = Math.round(minW + rand() * (maxW - minW));
    const h = Math.round(minH + rand() * (maxH - minH));
    const b = { x, w, h, wins: [] };
    if (withWindows) {
      const cols = Math.floor((w - 8) / 10);
      const rows = Math.floor((h - 16) / 15);
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (rand() < 0.16) {
            b.wins.push({
              x: x + 6 + c * 10,
              y: H - h + 10 + r * 15,
              k: Math.floor(rand() * 3),
              f: rand() < 0.12,
            });
          }
        }
      }
    }
    out.push(b);
    x += w + Math.round(rand() * 5);
  }
  return out;
}

const BACK = towers(11, 34, 70, 70, 150, false);
const FRONT = towers(27, 26, 54, 40, 112, true);

const FROND_ANGLES = [-168, -138, -108, -72, -42, -12, 14];

function Palm({ x, h, lean }) {
  const cx = x + lean * 30;
  const cy = H - h;
  const fronds = FROND_ANGLES.map((deg) => {
    const rad = (deg * Math.PI) / 180;
    const len = 46;
    const ex = Math.round(cx + Math.cos(rad) * len);
    const ey = Math.round(cy + Math.sin(rad) * len + 22);
    const qx = Math.round(cx + Math.cos(rad) * len * 0.55);
    const qy = Math.round(cy + Math.sin(rad) * len * 0.55 - 12);
    return `M${cx} ${cy}Q${qx} ${qy} ${ex} ${ey}`;
  });
  return (
    <g className="auth-palm" fill="none" stroke="#07030f" strokeLinecap="round">
      <path d={`M${x} ${H}Q${x + lean * 5} ${H - h * 0.55} ${cx} ${cy}`} strokeWidth="6" />
      {fronds.map((d, i) => (
        <path key={i} d={d} strokeWidth="4.5" />
      ))}
    </g>
  );
}

export function Skyline() {
  return (
    <svg
      className="auth-skyline"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <g fill="#1a0b2e" opacity="0.92">
        {BACK.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g fill="#0b0514">
        {FRONT.map((b, i) => (
          <rect key={i} x={b.x} y={H - b.h} width={b.w} height={b.h} />
        ))}
      </g>
      <g>
        {FRONT.flatMap((b) =>
          b.wins.map((w, i) => (
            <rect
              key={`${b.x}-${i}`}
              className={`auth-win auth-win-${w.k}${w.f ? " auth-win-flick" : ""}`}
              x={w.x}
              y={w.y}
              width="4"
              height="7"
              rx="0.6"
            />
          ))
        )}
      </g>
      <Palm x={300} h={128} lean={1} />
      <Palm x={372} h={90} lean={-1} />
      <Palm x={830} h={118} lean={-1} />
      <Palm x={912} h={146} lean={1} />
    </svg>
  );
}

// Small line glyphs for the perk cards and the mission list.
export function Glyph({ name }) {
  switch (name) {
    case "feed":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
      );
    case "crew":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
          <circle cx="17" cy="9" r="2.4" />
          <path d="M17 14c2.5 0 4.5 2 4.5 4.5" />
        </svg>
      );
    case "star":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3l2.6 6 6.4.6-4.8 4.2 1.4 6.2L12 16.8 6.4 20l1.4-6.2L3 9.6 9.4 9z" />
        </svg>
      );
    case "mail":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="M3.5 7l8.5 6 8.5-6" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      );
  }
}
