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

// Always read fresh from Firestore — likes/saves/new posts shouldn't be cached.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [stories, posts] = await Promise.all([
    fetchStories(),
    fetchPosts({ currentUid: user?.uid }),
  ]);

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

        <ComposerLauncher user={user} />
        <StoriesRail stories={stories} />
        {posts.length > 0 ? <Feed posts={posts} /> : <EmptyFeed />}
      </main>

      <ScrollTopButton />
    </>
  );
}
