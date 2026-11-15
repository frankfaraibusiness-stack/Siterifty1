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

  const { posts, stats } = await fetchUserPosts(profile.username, user?.uid);
  const isOwner = user?.uid === profile.uid;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pf-page">
        <ProfileHeader initialProfile={profile} stats={stats} isOwner={isOwner} />
        <ProfilePosts posts={posts} isOwner={isOwner} />
      </main>
      <ScrollTopButton />
    </>
  );
}
