export default function StoriesRail({ stories }) {
  return (
    <div className="stories-rail">
      <div className="story-card add-story">
        <div className="add-story-inner">
          <div className="add-story-plus">+</div>
          <span>Your Story</span>
        </div>
      </div>

      {stories.map((story) => (
        <div
          key={story.id}
          className="story-card"
          style={{ backgroundImage: story.gradient }}
        >
          <div className="story-user">
            <div className="story-avatar" />
            <span className="story-username">{story.username}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
