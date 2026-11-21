import Link from "next/link";
import { getGame, getGift, giftMessage, giftsHref, rarityColor } from "@/lib/gifts";
import GiftGlyph from "./GiftGlyph";
import { formatCount } from "@/lib/format-count";

// "Gifts received" strip on a profile: the newest gifts and who sent them, plus
// a Send a gift button for visitors. Plain markup, rendered on the server.
export default function ProfileGifts({ username, gifts, total, isOwner }) {
  if (!gifts.length && isOwner) return null;
  return (
    <section className="pf-gifts" aria-label={`Gifts @${username} received`}>
      <div className="pf-gifts-head">
        <h2 className="pf-gifts-title">
          <span aria-hidden="true">🎁</span> Gifts received
          {total > 0 && <em>{formatCount(total)}</em>}
        </h2>
        {!isOwner && (
          <Link href={giftsHref({ type: "profile", to: username })} className="pf-gifts-send" prefetch={false}>
            Send a gift
          </Link>
        )}
      </div>
      {gifts.length > 0 ? (
        <ul className="pf-gifts-row">
          {gifts.map((g) => {
            const rarity = getGift(g.giftId)?.rarity || "common";
            const msg = giftMessage(g.giftId, g.note, g.id);
            return (
              <li key={g.id} className={`pf-gift pf-gift-${rarity}`} style={{ "--g": getGame(g.game).color, "--r": rarityColor(rarity) }} title={msg.text}>
                <span className="pf-gift-emoji" aria-hidden="true">
                  <GiftGlyph giftId={g.giftId} emoji={g.emoji} />
                </span>
                <span className="pf-gift-name">{g.name}</span>
                <span className="pf-gift-from">
                  {g.fromUsername ? (
                    <Link href={`/u/${g.fromUsername}`}>@{g.fromUsername}</Link>
                  ) : (
                    "Someone"
                  )}
                  {g.timeAgo && <> · {g.timeAgo}</>}
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="pf-gifts-empty">No gifts yet. Be the first to send @{username} something nice.</p>
      )}
    </section>
  );
}
