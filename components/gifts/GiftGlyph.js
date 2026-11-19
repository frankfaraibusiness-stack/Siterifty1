"use client";

import { useState } from "react";
import { giftArtUrl, giftFxProps } from "@/lib/gifts";

// The picture of a gift, everywhere it appears (shop, checkout, comments,
// profiles). Shows the gift's artwork when it has some (see GIFT_ART in
// lib/gifts.js) and its emoji otherwise, with the gift's own animation either
// way. If the artwork can't load, it quietly falls back to the emoji.
// Size comes from the parent's font-size (art is 1.1em square, like an emoji).
export default function GiftGlyph({ giftId, emoji }) {
  const [broken, setBroken] = useState(false);
  const fx = giftFxProps(giftId);
  const art = broken ? null : giftArtUrl(giftId);
  return (
    <span className={fx.className} style={fx.style}>
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className="gf-art"
          src={art}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setBroken(true)}
        />
      ) : (
        emoji
      )}
    </span>
  );
}
