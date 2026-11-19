import Link from "next/link";
import { RARITIES, formatPrice, getGame, giftHref, rarityColor } from "@/lib/gifts";
import GiftGlyph from "./GiftGlyph";

// The gift picture (artwork, or its emoji) on a tile framed by its rarity and tinted by its game.
// Plain markup (no hooks) so it works in server and client components.
export function GiftTile({ gift, large = false }) {
  const game = getGame(gift.game);
  const rarity = RARITIES.find((r) => r.id === gift.rarity) || RARITIES[0];
  const top = rarity.id === "legendary" || rarity.id === "mythic";
  return (
    <span
      className={`gf-tile gf-r-${rarity.id}${large ? " gf-tile-lg" : ""}`}
      style={{ "--g": game.color, "--r": rarity.color }}
      aria-hidden="true"
    >
      <span className="gf-tile-grid" />
      {top && <span className="gf-aura" />}
      <span className="gf-floor" />
      {top && (
        <>
          <span className="gf-spark gf-spark-a" />
          <span className="gf-spark gf-spark-b" />
          <span className="gf-spark gf-spark-c" />
        </>
      )}
      <span className="gf-emoji">
        <GiftGlyph giftId={gift.id} emoji={gift.emoji} />
      </span>
    </span>
  );
}

export function RarityTag({ gift }) {
  const rarity = RARITIES.find((r) => r.id === gift.rarity) || RARITIES[0];
  return (
    <span className={`gf-rarity gf-rarity-${rarity.id}`} style={{ "--r": rarity.color }}>
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
      className={`gf-card gf-card-${gift.rarity}`}
      style={{ "--g": game.color, "--r": rarityColor(gift.rarity) }}
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
