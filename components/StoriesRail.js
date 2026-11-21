"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

// Landing-page stories: one compact card. The header has a "+" (add a story) and "See All";
// below it a single row starts with a dashed "Your Story" circle, then a ring per person who
// has a story up. Tapping a ring (or "See All") opens the story viewer.
export default function StoriesRail({ stories, user, defaults }) {
  const router = useRouter();
  const [authOpen, setAuthOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerAt, setViewerAt] = useState(null); // group index or null
  // Hearts given (and the owner's latest count) since the page loaded, by story id.
  const [overrides, setOverrides] = useState({});
  const patch = useCallback((id, p) => setOverrides((o) => ({ ...o, [id]: { ...o[id], ...p } })), []);

  // One entry per person (their own first), stories inside oldest -> newest.
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
      <section className="lp-stories" aria-label="Stories">
        <div className="lp-card lp-people">
          <header className="lp-card-head lp-people-head">
            <button type="button" className="lp-plus" onClick={addStory} aria-label="Add to your story">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>
            <h2 className="lp-h">Stories</h2>
            {groups.length > 0 && (
              <button type="button" className="lp-more" onClick={() => setViewerAt(0)}>
                See All <span aria-hidden="true">→</span>
              </button>
            )}
          </header>

          <ul className="lp-people-rail">
            <li>
              <button type="button" className="lp-person" onClick={addStory} aria-label="Add your story">
                <span className="lp-yours-circle" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </span>
                <span className="lp-person-name">Your Story</span>
              </button>
            </li>
            {groups.map((group, index) => (
              <li key={group.username}>
                <button
                  type="button"
                  className="lp-person"
                  onClick={() => setViewerAt(index)}
                  aria-label={`Open ${group.mine ? "your" : `${group.username}’s`} story`}
                >
                  <span className="lp-ring">
                    <span
                      className="lp-ring-img"
                      style={{
                        backgroundImage: `url(/avatar/${encodeURIComponent(group.username)}), linear-gradient(135deg, var(--accent-pink), var(--accent-cyan))`,
                      }}
                    />
                  </span>
                  <span className="lp-person-name">{group.mine ? "You" : group.username}</span>
                </button>
              </li>
            ))}
          </ul>
          {groups.length === 0 && <p className="lp-empty">No stories up right now. Be the first to post one.</p>}
        </div>
      </section>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}

      {composerOpen && (
        <StoryComposer
          defaults={defaults}
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
          canHeart={!!user?.username}
          onNeedAuth={() => {
            setViewerAt(null);
            setAuthOpen(true);
          }}
          overrides={overrides}
          onOverride={patch}
        />
      )}
    </>
  );
}
