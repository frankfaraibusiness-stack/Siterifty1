"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "./AuthModal";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

// Landing-page stories: a dashed "Your Story" card next to a compact "Stories"
// card that lists the people who have a story up. Tapping a person (or "See All")
// opens the existing story viewer. A full stories page can come later.
export default function StoriesRail({ stories, user }) {
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
        <button type="button" className="lp-yours" onClick={addStory}>
          <span className="lp-yours-plus" aria-hidden="true">+</span>
          <span>Your Story</span>
        </button>

        <div className="lp-card lp-people">
          <header className="lp-card-head">
            <h2 className="lp-h">Stories</h2>
            {groups.length > 0 && (
              <button type="button" className="lp-more" onClick={() => setViewerAt(0)}>
                See All <span aria-hidden="true">→</span>
              </button>
            )}
          </header>

          {groups.length > 0 ? (
            <ul className="lp-people-rail">
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
          ) : (
            <p className="lp-empty">No stories up right now. Be the first to post one.</p>
          )}
        </div>
      </section>

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
