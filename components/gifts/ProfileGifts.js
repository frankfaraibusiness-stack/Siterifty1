import Link from "next/link";
import { getGame, giftFxProps, giftMessage, giftsHref } from "@/lib/gifts";
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
            const fx = giftFxProps(g.giftId);
            const msg = giftMessage(g.giftId, g.note, g.id);
            return (
              <li key={g.id} className="pf-gift" style={{ "--g": getGame(g.game).color }} title={msg.text}>
                <span className="pf-gift-emoji" aria-hidden="true">
                  <span className={fx.className} style={fx.style}>{g.emoji}</span>
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
