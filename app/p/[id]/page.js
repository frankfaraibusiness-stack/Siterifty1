import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import PostCard from "@/components/PostCard";
import { getCurrentUser } from "@/lib/current-user";
import { fetchPostById } from "@/lib/feed-data";
import { postImageUrl } from "@/lib/media-url";

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
    openGraph: { title, description, ...(image && { images: [image] }) },
  };
}

// A single post, so shared links have somewhere real to land.
export default async function PostPage({ params }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const post = await fetchPostById(id, user?.uid);
  if (!post) notFound();

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pd-page">
        <Link href="/" className="single-back">&larr; Back to the feed</Link>
        <PostCard post={post} detail />
      </main>
    </>
  );
}
