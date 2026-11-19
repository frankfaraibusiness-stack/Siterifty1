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
import Greeting from "@/components/touches/Greeting";
import { getCurrentUser } from "@/lib/current-user";
import FeedTabs from "@/components/FeedTabs";
import { fetchPosts, fetchPostsByUids, fetchStories } from "@/lib/feed-data";
import { getFollowingUids } from "@/lib/social-data";
import { fetchPromotedCommunity } from "@/lib/community-data";
import RecommendedRail from "@/components/RecommendedRail";
import { RAIL_SIZE, fetchRail } from "@/lib/recommend-data";
import { fetchForYou } from "@/lib/feed-rank-data";
import { getPrefs } from "@/lib/user-prefs";
import { applyViewerFilters, orderPosts } from "@/lib/viewer-filters";
import { trendingTags } from "@/lib/trending";
import FeedTypeFilter from "@/components/FeedTypeFilter";
import { feedHref, feedTypeInfo, readFeedType } from "@/lib/feed-types";

// Always read fresh from Firestore — likes/saves/new posts shouldn't be cached.
export const dynamic = "force-dynamic";

// /?type=poll is the same page as /, so search engines should index only /.
export async function generateMetadata({ searchParams }) {
  return readFeedType((await searchParams)?.type) === "all" ? {} : { alternates: { canonical: "/" } };
}

export default async function HomePage({ searchParams }) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  // "Following" shows only people you follow (and only when signed in).
  const wantsFollowing = sp?.feed === "following" && !!user;
  // "Only videos / polls / ..." (lib/feed-types.js). "all" when absent or not a real format.
  const type = readFeedType(sp?.type);
  const typed = type !== "all";
  // Settings > Leak Filter: each member's own feed choices.
  const prefs = await getPrefs(user?.uid);
  const followingUids = wantsFollowing ? await getFollowingUids(user.uid) : [];
  // "For you" (the default, Settings > Leak Filter > Order) is ranked per member and shuffled on every
  // visit (lib/feed-rank.js). The Following tab, "Newest" and "Hot" stay plain.
  const ranked = !wantsFollowing && prefs.feed.order === "foryou";
  const [stories, homePosts, promo, rail] = await Promise.all([
    prefs.feed.stories ? fetchStories({ currentUid: user?.uid }) : [],
    wantsFollowing
      ? fetchPostsByUids({ currentUid: user.uid, uids: followingUids, limit: prefs.feed.length, type })
      : ranked
        ? fetchForYou({ currentUid: user?.uid, prefs, limit: prefs.feed.length + (typed ? 0 : RAIL_SIZE), type })
        : fetchPosts({ currentUid: user?.uid, limit: prefs.feed.length, type }),
    fetchPromotedCommunity(user?.uid),
    // Recommendations are matched on the server to the member's interests (see lib/recommend-data.js).
    // The picks row mixes every format, so it steps aside while the feed is filtered.
    typed ? [] : fetchRail({ currentUid: user?.uid || null, prefs }),
  ]);
  let posts;
  let hidden;
  if (ranked) {
    // The row on top already shows its picks, so the feed under it doesn't repeat them.
    const inRail = new Set(rail.map((r) => r.id));
    posts = homePosts.posts.filter((p) => !inRail.has(p.id)).slice(0, prefs.feed.length);
    hidden = homePosts.hidden;
  } else {
    const filtered = applyViewerFilters(homePosts, prefs);
    posts = orderPosts(filtered.posts, prefs.feed.order);
    hidden = filtered.hidden;
  }
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

        {user?.username && (
          <div className="lp-pad">
            <Greeting name={user.username} />
          </div>
        )}

        <div className="lp-pad">
          <SearchBar compact />
        </div>

        <div className="lp-grid">
          {prefs.feed.composer && <ComposerLauncher user={user} />}
          {prefs.feed.stories && <StoriesRail stories={stories} user={user} defaults={prefs.stories} />}

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
            {user && <FeedTabs active={wantsFollowing ? "following" : "foryou"} type={type} />}
            <FeedTypeFilter active={type} feed={wantsFollowing ? "following" : null} />
            {posts.length > 0 ? (
              <Feed posts={posts} adPlacement="feed" track={{ source: wantsFollowing ? "following" : "feed", uid: user?.uid || null }} />
            ) : typed ? (
              <div className="empty-feed">
                <h2 className="empty-feed-title">No {feedTypeInfo(type).plural} to show</h2>
                <p className="empty-feed-sub">
                  {wantsFollowing
                    ? `None of the people you follow have posted ${feedTypeInfo(type).plural} lately.`
                    : `There are no ${feedTypeInfo(type).plural} in the latest posts yet.`}
                </p>
                <div className="ft-empty-actions">
                  <Link href={feedHref({ feed: wantsFollowing ? "following" : null })} className="cmp-link">Show everything</Link>
                  {user?.username && <Link href={`/create?type=${type}`} className="cmp-link">Create one</Link>}
                </div>
              </div>
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
