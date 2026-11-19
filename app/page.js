import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import StoriesRail from "@/components/StoriesRail";
import ComposerLauncher from "@/components/ComposerLauncher";
import HotDiscussions from "@/components/HotDiscussions";
import TrendingTags from "@/components/TrendingTags";
import Feed from "@/components/Feed";
import SpoilerModeSync from "@/components/SpoilerModeSync";
import EmptyFeed from "@/components/EmptyFeed";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import FeedTabs from "@/components/FeedTabs";
import { fetchPosts, fetchPostsByUids, fetchStories } from "@/lib/feed-data";
import { getFollowingUids } from "@/lib/social-data";
import { fetchPromotedCommunity } from "@/lib/community-data";
import RecommendedRail from "@/components/RecommendedRail";
import { fetchRail } from "@/lib/recommend-data";
import { getPrefs } from "@/lib/user-prefs";
import { applyViewerFilters, orderPosts } from "@/lib/viewer-filters";
import { trendingTags } from "@/lib/trending";

// Always read fresh from Firestore — likes/saves/new posts shouldn't be cached.
export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }) {
  const user = await getCurrentUser();
  // "Following" shows only people you follow (and only when signed in).
  const wantsFollowing = (await searchParams)?.feed === "following" && !!user;
  // Settings > Leak Filter: each member's own feed choices.
  const prefs = await getPrefs(user?.uid);
  const followingUids = wantsFollowing ? await getFollowingUids(user.uid) : [];
  const [stories, rawPosts, promo, rail] = await Promise.all([
    prefs.feed.stories ? fetchStories({ currentUid: user?.uid }) : [],
    wantsFollowing
      ? fetchPostsByUids({ currentUid: user.uid, uids: followingUids, limit: prefs.feed.length })
      : fetchPosts({ currentUid: user?.uid, limit: prefs.feed.length }),
    fetchPromotedCommunity(user?.uid),
    // Recommendations are matched on the server to the member's interests (see lib/recommend-data.js).
    fetchRail({ currentUid: user?.uid || null, prefs }),
  ]);
  const { posts: filtered, hidden } = applyViewerFilters(rawPosts, prefs);
  const posts = orderPosts(filtered, prefs.feed.order);
  // Tags are counted from the posts already loaded, so this costs no extra reads.
  const tags = trendingTags(posts, { limit: 8 });

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />

      <SpoilerModeSync mode={prefs.feed.spoilers} />
      <main className="page-content lp">
        {/* Banner */}
        <div className="lp-banner">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/banner.webp" alt="GTAFanbase.com: discuss, share, connect" width="1660" height="513" decoding="async" fetchPriority="high" />
        </div>

        <div className="lp-pad">
          <SearchBar compact />
        </div>

        <div className="lp-grid">
          {prefs.feed.composer && <ComposerLauncher user={user} />}
          {prefs.feed.stories && <StoriesRail stories={stories} user={user} />}

          {/* Phone: sits between stories and the feed. Desktop: right-hand column. */}
          <aside className="lp-aside" aria-label="Discover">
            <HotDiscussions promo={promo} />
            {!wantsFollowing && <TrendingTags tags={tags} />}
          </aside>

          <div className="lp-feedcol">
            <RecommendedRail items={rail} />
            {hidden > 0 && (
              <p className="feed-note">
                {hidden} {hidden === 1 ? "post is" : "posts are"} hidden by your Leak Filter.{" "}
                <Link href="/settings#leaks">Manage</Link>
              </p>
            )}
            {user && <FeedTabs active={wantsFollowing ? "following" : "foryou"} />}
            {posts.length > 0 ? (
              <Feed posts={posts} adPlacement="feed" track={{ source: wantsFollowing ? "following" : "feed", uid: user?.uid || null }} />
            ) : wantsFollowing ? (
              <p className="feed-note feed-note-empty">
                {followingUids.length === 0
                  ? "You aren’t following anyone yet. Open a profile and tap Follow to fill this feed."
                  : "No new posts from the people you follow yet."}
              </p>
            ) : (
              <EmptyFeed />
            )}
          </div>
        </div>
      </main>

      <ScrollTopButton />
    </>
  );
}
