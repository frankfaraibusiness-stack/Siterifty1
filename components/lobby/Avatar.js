// A member's round avatar: their picture when they have one, otherwise their
// two theme colours with an initial. `p` is any person from /api/lobby.
export default function Avatar({ p, size = 34 }) {
  const photo = p.hasAvatar !== false ? `url("/avatar/${encodeURIComponent(p.username)}?v=${p.avatarV || 0}"), ` : "";
  return (
    <span
      className="lb-av"
      aria-hidden="true"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42), backgroundImage: `${photo}linear-gradient(135deg, ${p.a}, ${p.b})` }}
    >
      {String(p.username || "?").charAt(0).toUpperCase()}
    </span>
  );
}
