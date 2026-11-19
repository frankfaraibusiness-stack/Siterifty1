import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ScrollTopButton from "@/components/ScrollTopButton";
import Feed from "@/components/Feed";
import SavedTabs from "@/components/SavedTabs";
import Discover from "@/components/Discover";
import { countSaved, filterSaved, readSavedTab, savedHref, savedTabInfo } from "@/lib/saved-tabs";
import { reelHref } from "@/lib/post-href";
import { getCurrentUser } from "@/lib/current-user";
import { fetchSavedPosts } from "@/lib/event-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved posts · GTAFanbase" };

export default async function SavedPage({ searchParams }) {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  const all = signedIn ? await fetchSavedPosts({ currentUid: user.uid }) : [];
  // Tabs (/saved?tab=reel): your bookmarks separated by what they are. Done here, in memory: it is
  // at most 100 posts, so the counts on every tab come from one read.
  const tab = readSavedTab((await searchParams)?.tab);
  const info = savedTabInfo(tab);
  const counts = countSaved(all);
  const posts = filterSaved(all, tab);
  const firstReel = tab === "reel" ? posts[0] : null;

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="page-content sv-wrap">
        <header className="sv-head">
          <h1>Saved posts</h1>
          <p>Everything you bookmarked, newest first, sorted by type. Only you can see this list.</p>
        </header>

        {!signedIn ? (
          <div className="empty-feed">
            <h2 className="empty-feed-title">Log in to see your saved posts</h2>
            <p className="empty-feed-sub">Use the button up top, then tap the bookmark on any post to keep it here.</p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        ) : all.length > 0 ? (
          <>
            <SavedTabs active={tab} counts={counts} />
            {posts.length > 0 ? (
              <>
                <div className="svt-bar">
                  <p className="sv-count">
                    {posts.length} saved {posts.length === 1 ? info.singular : info.plural}
                  </p>
                  {firstReel && (
                    <Link href={reelHref(firstReel.id)} className="svt-play">
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5.5 11 6.5-11 6.5z" /></svg>
                      Play in Videos
                    </Link>
                  )}
                </div>
                <Feed posts={posts} track={{ source: "saved", uid: user?.uid || null }} />
                {all.length >= 100 && (
                  <p className="svt-cap">Showing your 100 most recent bookmarks.</p>
                )}
              </>
            ) : (
              <div className="empty-feed">
                <h2 className="empty-feed-title">No saved {info.plural} yet</h2>
                <p className="empty-feed-sub">{info.hint}</p>
                <Link href={savedHref()} className="cmp-link">See all bookmarks</Link>
              </div>
            )}
          </>
        ) : (
          <div className="empty-feed">
            <h2 className="empty-feed-title">Nothing saved yet</h2>
            <p className="empty-feed-sub">Tap the bookmark on a post, clip or event and it will wait for you here.</p>
            <Link href="/" className="cmp-link">Browse the feed</Link>
          </div>
        )}

        <Discover spot="saved" variant="tiles" className="dc-foot" title="More from GTAFanbase" />
      </main>
      <ScrollTopButton />
    </>
  );
}
