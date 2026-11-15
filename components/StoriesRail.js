"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

function gradientFor(story) {
  return story.gradient || "linear-gradient(135deg, #ff3d7f, #7b2ff7)";
}

// A card's backdrop: the story's own picture (photo or video frame) with the
// colour gradient behind it as a fallback.
function cardBackground(story) {
  if (story.kind === "gradient") return gradientFor(story);
  return `url(/story/${story.id}/poster), ${gradientFor(story)}`;
}

export default function StoriesRail({ stories, user }) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerAt, setViewerAt] = useState(null); // group index or null

  // One card per person (their own first), stories inside oldest -> newest.
  const groups = useMemo(() => {
    const byUser = new Map();
    for (const s of stories) {
      if (!byUser.has(s.username)) byUser.set(s.username, { username: s.username, mine: s.mine, stories: [] });
      byUser.get(s.username).stories.push(s);
    }
    const list = [...byUser.values()];
    for (const g of list) g.stories.sort((a, b) => a.createdAtMs - b.createdAtMs);
    return list.sort((a, b) => Number(b.mine) - Number(a.mine));
  }, [stories]);

  function addStory() {
    if (user?.username) setComposerOpen(true);
    else setAuthOpen(true);
  }

  return (
    <>
      <div className="stories-rail">
        <button type="button" className="story-card add-story" onClick={addStory}>
          <div className="add-story-inner">
            <div className="add-story-plus">+</div>
            <span>Your Story</span>
          </div>
        </button>

        {groups.map((group, index) => {
          const latest = group.stories[group.stories.length - 1];
          const hasVideo = group.stories.some((s) => s.kind === "video");
          return (
            <button
              type="button"
              key={group.username}
              className="story-card"
              style={{ backgroundImage: cardBackground(latest) }}
              onClick={() => setViewerAt(index)}
              aria-label={`Open ${group.mine ? "your" : `${group.username}’s`} story`}
            >
              <div className="story-user">
                <div
                  className="story-avatar"
                  style={{
                    backgroundImage: `url(/avatar/${encodeURIComponent(group.username)}), linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))`,
                  }}
                />
                <span className="story-username">{group.mine ? "You" : group.username}</span>
              </div>
              {(hasVideo || group.stories.length > 1) && (
                <div className="story-badges">
                  {hasVideo && <span className="story-badge" aria-label="Contains video">▶</span>}
                  {group.stories.length > 1 && <span className="story-badge">{group.stories.length}</span>}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {composerOpen && (
        <StoryComposer
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            router.refresh();
          }}
        />
      )}

      {viewerAt !== null && groups[viewerAt] && (
        <StoryViewer
          groups={groups}
          startGroup={viewerAt}
          onClose={() => setViewerAt(null)}
          onDeleted={() => router.refresh()}
        />
      )}
    </>
  );
}
