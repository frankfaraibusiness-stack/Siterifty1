import { headers } from "next/headers";
import { after } from "next/server";
import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import PostCard from "@/components/PostCard";
import PostBar from "@/components/post/PostBar";
import ScrollTopButton from "@/components/ScrollTopButton";
import PostRecommendations from "@/components/post/PostRecommendations";
import { getCurrentUser } from "@/lib/current-user";
import { fetchPostById } from "@/lib/feed-data";
import { fetchRecommendations } from "@/lib/recommend-data";
import { getPrefs } from "@/lib/user-prefs";
import { postImageUrl } from "@/lib/media-url";
import { TYPES } from "@/lib/post-schema";
import { siteUrl } from "@/lib/site";
import { isRealBrowserVisit, recordDirectView } from "@/lib/analytics-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await fetchPostById(id, user?.uid);
  if (!post) return { title: "Post not found · GTAFanbase" };

  const title = post.title || post.poll?.options?.join(" or ") || `${post.user} on GTAFanbase`;
  const description = (post.text || `A ${post.type} by @${post.user} on GTAFanbase.`).slice(0, 160);
  const image =
    post.media?.type === "images" || post.media?.hasPoster
      ? postImageUrl(post.id, 0)
      : post.media?.kind === "youtube"
      ? `https://i.ytimg.com/vi/${post.media.ytId}/hqdefault.jpg`
      : null;

  return {
    title: `${title} · GTAFanbase`,
    description,
    metadataBase: process.env.NEXT_PUBLIC_APP_URL ? new URL(process.env.NEXT_PUBLIC_APP_URL) : undefined,
    // One address per post, however someone arrived (profile tab, feed, shared link).
    alternates: { canonical: `${siteUrl()}/p/${post.id}` },
    openGraph: { title, description, ...(image && { images: [image] }) },
  };
}

// The first batch of "More to explore". If it can't be read the post still
// opens: the list just starts empty and asks for its first page itself.
async function firstRecommendations(postId, uid) {
  try {
    const prefs = await getPrefs(uid);
    return await fetchRecommendations({ currentUid: uid || null, prefs, excludeId: postId });
  } catch (err) {
    console.error("first recommendations failed", err);
    return { items: [], next: null, more: true };
  }
}

// A single post, so shared links have somewhere real to land. The post sits on
// top at full size; below it an endless list of smaller posts keeps people
// reading (see PostRecommendations).
export default async function PostPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const [post, recs] = await Promise.all([fetchPostById(id, user?.uid), firstRecommendations(id, user?.uid)]);
  if (!post) notFound();

  // +1 view when a real browser opens this link directly (a shared URL, a bookmark, a refresh).
  // Counted here on the server, after the page has been sent: in-app navigation, link-preview
  // crawlers and prefetches don't qualify, and there is nothing for a client to fake.
  const h = await headers();
  if (isRealBrowserVisit(h)) {
    const viewerKey = user?.uid || (h.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
    after(() => recordDirectView({ post, uid: user?.uid || null, viewerKey }));
  }

  // What the sticky bar calls this post: its format, or just "Post" for plain text.
  const barType = TYPES[post.type] ? post.type : "post";
  const barLabel = barType === "post" ? (post.media ? "Photo post" : "Post") : TYPES[barType].label;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pd-page">
        <PostBar type={barType} label={barLabel} user={post.user} id={post.id} title={post.title} />
        <PostCard key={post.id} post={post} detail />
        {/* key: opening another post from the list starts a fresh list */}
        <PostRecommendations key={post.id} postId={post.id} initial={recs} />
      </main>
      <ScrollTopButton />
    </>
  );
}
