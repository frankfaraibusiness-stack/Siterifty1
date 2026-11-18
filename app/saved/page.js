import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ScrollTopButton from "@/components/ScrollTopButton";
import Feed from "@/components/Feed";
import { getCurrentUser } from "@/lib/current-user";
import { fetchSavedPosts } from "@/lib/event-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Saved posts · GTAFanbase" };

export default async function SavedPage() {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  const posts = signedIn ? await fetchSavedPosts({ currentUid: user.uid }) : [];

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="page-content sv-wrap">
        <header className="sv-head">
          <h1>Saved posts</h1>
          <p>Everything you bookmarked, newest first. Only you can see this list.</p>
        </header>

        {!signedIn ? (
          <div className="empty-feed">
            <h2 className="empty-feed-title">Log in to see your saved posts</h2>
            <p className="empty-feed-sub">Use the button up top, then tap the bookmark on any post to keep it here.</p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        ) : posts.length > 0 ? (
          <>
            <p className="sv-count">{posts.length} saved {posts.length === 1 ? "post" : "posts"}</p>
            <Feed posts={posts} track={{ source: "saved", uid: user?.uid || null }} />
          </>
        ) : (
          <div className="empty-feed">
            <h2 className="empty-feed-title">Nothing saved yet</h2>
            <p className="empty-feed-sub">Tap the bookmark on a post, clip or event and it will wait for you here.</p>
            <Link href="/" className="cmp-link">Browse the feed</Link>
          </div>
        )}
      </main>
      <ScrollTopButton />
    </>
  );
}
