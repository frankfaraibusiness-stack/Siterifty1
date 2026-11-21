import { contextLabel } from "@/lib/gifts";

// Round avatar for the person receiving a gift: their picture when they have
// one, otherwise their initial on their accent colours.
export function RecipientAvatar({ person, size = 44 }) {
  const initial = (person.displayName || person.username || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="gf-av"
      style={{ "--a": person.a, "--b": person.b, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {initial}
      {person.hasAvatar && (
        <span
          className="gf-av-img"
          style={{ backgroundImage: `url("/avatar/${encodeURIComponent(person.username)}?v=${person.avatarV}")` }}
        />
      )}
    </span>
  );
}

// "Sending to @lucia · from their comment". Shown on the shop page so the
// destination is never lost while browsing, and again in the checkout.
export function SendingTo({ person, ctx, children }) {
  return (
    <div className="gf-to">
      <RecipientAvatar person={person} />
      <span className="gf-to-text">
        <span className="gf-to-label">Sending to</span>
        <b className="gf-to-name">@{person.username}</b>
        {ctx && ctx.type !== "shop" && (
          <span className="gf-to-from">From {contextLabel(ctx)}</span>
        )}
      </span>
      {children}
    </div>
  );
}
