import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ProfileHeader from "@/components/ProfileHeader";
import ProfilePosts from "@/components/ProfilePosts";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { getProfileByUsername, fetchUserPosts } from "@/lib/profile-data";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: `@${username} · GTA6FanBase` };
}

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const user = await getCurrentUser();
  const profile = await getProfileByUsername(username, user);
  if (!profile) notFound();

  const isOwner = user?.uid === profile.uid;
  // Settings > Character: a private account only shows its name and photo.
  const locked = profile.isPrivate && !isOwner;
  const { posts, stats } = locked
    ? { posts: [], stats: { posts: 0, likes: 0, comments: 0, saves: 0 } }
    : await fetchUserPosts(profile.username, user?.uid);
  const shown = locked ? { ...profile, bio: "", location: "", website: "" } : profile;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pf-page">
        <ProfileHeader initialProfile={shown} stats={stats} isOwner={isOwner} locked={locked} />
        {locked ? (
          <section className="pf-locked">
            <h2>This account is private</h2>
            <p>@{profile.username} keeps their posts to themselves.</p>
          </section>
        ) : (
          <ProfilePosts posts={posts} isOwner={isOwner} />
        )}
      </main>
      <ScrollTopButton />
    </>
  );
}
