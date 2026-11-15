import Link from "next/link";
import SearchBar from "@/components/SearchBar";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import StoriesRail from "@/components/StoriesRail";
import ComposerLauncher from "@/components/ComposerLauncher";
import Feed from "@/components/Feed";
import EmptyFeed from "@/components/EmptyFeed";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { fetchPosts, fetchStories } from "@/lib/feed-data";
import { getPrefs } from "@/lib/user-prefs";
import { applyViewerFilters, orderPosts } from "@/lib/viewer-filters";

// Always read fresh from Firestore — likes/saves/new posts shouldn't be cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  // Settings > Leak Filter: each member's own feed choices.
  const prefs = await getPrefs(user?.uid);
  const [stories, rawPosts] = await Promise.all([
    prefs.feed.stories ? fetchStories({ currentUid: user?.uid }) : [],
    fetchPosts({ currentUid: user?.uid, limit: prefs.feed.length }),
  ]);
  const { posts: filtered, hidden } = applyViewerFilters(rawPosts, prefs);
  const posts = orderPosts(filtered, prefs.feed.order);

  const handle = user?.username
    ? `@${user.username}`
    : user?.email
    ? user.email
    : "@guest";

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />

      <main className="page-content">
        <h1 className="welcome-title">
          Welcome back,{" "}
          {user?.username ? (
            <Link href={`/u/${user.username}`} className="name">
              {handle}
            </Link>
          ) : (
            <span className="name">{handle}</span>
          )}
        </h1>

        <div className="sr-pad">
          <SearchBar />
        </div>

        {prefs.feed.composer && <ComposerLauncher user={user} />}
        {prefs.feed.stories && <StoriesRail stories={stories} user={user} />}
        {hidden > 0 && (
          <p className="feed-note">
            {hidden} {hidden === 1 ? "post is" : "posts are"} hidden by your Leak Filter.{" "}
            <Link href="/settings#leaks">Manage</Link>
          </p>
        )}
        {posts.length > 0 ? <Feed posts={posts} /> : <EmptyFeed />}
      </main>

      <ScrollTopButton />
    </>
  );
}
