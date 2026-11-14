export default function EmptyFeed() {
  return (
    <div className="empty-feed">
      <div className="empty-feed-icon">
        <svg viewBox="0 0 24 24">
          <path d="M3 11l18-7-7 18-2.5-7.5L3 11z" />
        </svg>
      </div>
      <h2 className="empty-feed-title">The streets are quiet&hellip;</h2>
      <p className="empty-feed-sub">
        No posts yet. Once the crew starts sharing, their heists and
        highlights will show up here.
      </p>
    </div>
  );
}
