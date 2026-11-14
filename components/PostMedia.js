"use client";

import { useState } from "react";

function Tile({ a, b }) {
  return <div className="ph" style={{ "--a": a, "--b": b }} />;
}

function YouTube({ id }) {
  const [on, setOn] = useState(false);
  if (on) {
    return (
      <iframe
        className="media-embed"
        src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
        title="YouTube video"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }
  return (
    <button type="button" className="media-yt" onClick={() => setOn(true)} aria-label="Play video">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" />
      <span className="media-play" aria-hidden="true">
        <svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z" /></svg>
      </span>
    </button>
  );
}

// `postId` builds the image URLs; `media.preview` (object URLs) overrides them
// so the composer can preview before anything is uploaded.
export default function PostMedia({ media, postId }) {
  if (media.type === "images") {
    const srcs = media.preview || Array.from({ length: media.count }, (_, i) => `/media/${postId}/${i}`);
    const grid = { 2: "g2", 3: "g3", 4: "g4" }[srcs.length];
    if (!grid) {
      return (
        <div className="media-photo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={srcs[0]} alt={media.alts?.[0] || ""} loading="lazy" />
        </div>
      );
    }
    return (
      <div className={`media-grid ${grid}`}>
        {srcs.map((src, i) => (
          <div key={src + i}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="media-cell" src={src} alt={media.alts?.[i] || ""} loading="lazy" />
          </div>
        ))}
      </div>
    );
  }

  if (media.type === "video") {
    if (media.kind === "youtube") {
      return (
        <div className="media-16x9">
          <YouTube id={media.ytId} />
        </div>
      );
    }
    const poster = media.preview?.poster || (media.hasPoster ? `/media/${postId}/0` : undefined);
    return (
      <div className="media-16x9 media-native">
        <video
          controls
          playsInline
          preload="metadata"
          poster={poster}
          src={media.preview?.src || `/video/${postId}`}
        />
      </div>
    );
  }

  if (media.type === "16x9" || media.type === "1x1") {
    return (
      <div className={`media-${media.type}`}>
        <Tile a={media.tiles[0].a} b={media.tiles[0].b} />
      </div>
    );
  }

  return (
    <div className={`media-grid ${media.grid}`}>
      {media.tiles.map((tile, i) => (
        <div key={i}>
          <Tile a={tile.a} b={tile.b} />
          {tile.overlay && <div className="more-overlay">{tile.overlay}</div>}
        </div>
      ))}
    </div>
  );
}
