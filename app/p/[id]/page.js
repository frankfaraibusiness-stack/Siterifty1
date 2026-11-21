import Link from "next/link";
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
import { shareMeta } from "@/lib/seo";
import { isRealBrowserVisit, recordDirectView } from "@/lib/analytics-data";
import { postEarnings } from "@/lib/instream-ads-data";
import { VideoStrip } from "@/components/earnings/Earn";
import "../../earnings/earnings.css";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await fetchPostById(id, user?.uid);
  if (!post) return { title: "Post not found · GTAFanbase" };

  // A post covered as a spoiler (by its author, or by enough members) must not give itself away in a link
  // preview: no title, no text, no picture. Link-preview crawlers are anonymous, so this is what they get.
  if (post.settings?.spoiler) {
    return shareMeta({
      title: `Spoiler post by @${post.user} · GTAFanbase`,
      description: `@${post.user} covered this post as a spoiler. Open it on GTAFanbase to choose whether to look.`,
      path: `/p/${post.id}`,
    });
  }

  const title = post.title || post.poll?.options?.join(" or ") || `Post by @${post.user}`;
  const description = post.text || `A ${post.type} by @${post.user} on GTAFanbase.`;

  // The post's own picture: its first photo, an uploaded video's poster, or a YouTube link's thumbnail.
  // Anything else (text, poll, theory, event, a video with no poster) uses the site's default image.
  const m = post.media;
  let image = null;
  let size = {};
  if (m?.type === "images" || m?.hasPoster) {
    image = postImageUrl(post.id, 0);
  } else if (m?.kind === "youtube") {
    image = `https://i.ytimg.com/vi/${m.ytId}/hqdefault.jpg`;
    size = { width: 480, height: 360 };
  }

  return shareMeta({
    title: `${title} · GTAFanbase`,
    description,
    path: `/p/${post.id}`,
    image,
    imageAlt: image ? title : undefined,
    ...size,
    type: "article",
  });
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
  // The author of a monetized video sees what its ads have earned (nobody else does).
  const earned = post.isOwner && post.media?.monetized ? await postEarnings(post.id, user.uid).catch(() => null) : null;

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
        {post.isOwner && post.media?.monetized && (earned ? <VideoStrip e={earned} /> : <p className="ern-strip ern-empty">Ads are on for this video. Earnings show up here as people watch. <Link className="ern-link" href="/earnings">All earnings →</Link></p>)}
        {/* key: opening another post from the list starts a fresh list */}
        <PostRecommendations key={post.id} postId={post.id} initial={recs} />
      </main>
      <ScrollTopButton />
    </>
  );
}
