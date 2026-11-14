export default function PostMedia({ media }) {
  if (media.type === "16x9") {
    return (
      <div className="media-16x9">
        <div className="ph" style={{ "--a": media.tiles[0].a, "--b": media.tiles[0].b }} />
      </div>
    );
  }

  if (media.type === "1x1") {
    return (
      <div className="media-1x1">
        <div className="ph" style={{ "--a": media.tiles[0].a, "--b": media.tiles[0].b }} />
      </div>
    );
  }

  // grid
  return (
    <div className={`media-grid ${media.grid}`}>
      {media.tiles.map((tile, i) => (
        <div key={i}>
          <div className="ph" style={{ "--a": tile.a, "--b": tile.b }} />
          {tile.overlay && <div className="more-overlay">{tile.overlay}</div>}
        </div>
      ))}
    </div>
  );
}
