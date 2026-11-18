import Link from "next/link";
import { RARITIES, formatPrice, getGame, giftFxProps, giftHref } from "@/lib/gifts";

// The gift picture: a big emoji on a glowing tile in the colour of its game.
// Plain markup (no hooks) so it works in server and client components.
export function GiftTile({ gift, large = false }) {
  const game = getGame(gift.game);
  const rarity = RARITIES.find((r) => r.id === gift.rarity) || RARITIES[0];
  const fx = giftFxProps(gift);
  return (
    <span
      className={`gf-tile gf-r-${rarity.id}${large ? " gf-tile-lg" : ""}`}
      style={{ "--g": game.color, "--r": rarity.color }}
      aria-hidden="true"
    >
      <span className="gf-tile-grid" />
      {(rarity.id === "legendary" || rarity.id === "mythic") && <span className="gf-aura" />}
      <span className="gf-emoji">
        <span className={fx.className} style={fx.style}>{gift.emoji}</span>
      </span>
    </span>
  );
}

export function RarityTag({ gift }) {
  const rarity = RARITIES.find((r) => r.id === gift.rarity) || RARITIES[0];
  return (
    <span className="gf-rarity" style={{ "--r": rarity.color }}>
      {rarity.name}
    </span>
  );
}

// One gift in the shop grid. A real link (so search engines can follow it and
// "open in new tab" works); `ctx` carries where the gift is going.
export default function GiftCard({ gift, ctx }) {
  const game = getGame(gift.game);
  return (
    <Link
      href={giftHref(gift.id, ctx)}
      className="gf-card"
      style={{ "--g": game.color }}
      prefetch={false}
    >
      <GiftTile gift={gift} />
      <RarityTag gift={gift} />
      <span className="gf-card-body">
        <span className="gf-card-name">{gift.name}</span>
        <span className="gf-card-game">{game.name}</span>
        <span className="gf-card-price">{formatPrice(gift.price)}</span>
      </span>
    </Link>
  );
}
