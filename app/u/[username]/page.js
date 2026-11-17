import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ProfileHeader from "@/components/ProfileHeader";
import ProfilePosts from "@/components/ProfilePosts";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { getProfileByUsername, fetchUserPosts } from "@/lib/profile-data";
import { getRelationship, getSocialCounts, listIncomingRequests } from "@/lib/social-data";
import { getMessagingInfo } from "@/lib/chat-social";

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
  const [{ posts, stats, insights }, counts, relationship, requests, messaging] = await Promise.all([
    locked
      ? {
          posts: [],
          stats: { posts: 0, likes: 0, comments: 0, saves: 0 },
          insights: { breakdown: [], top: {} },
        }
      : fetchUserPosts(profile.username, user?.uid),
    getSocialCounts(profile.uid),
    getRelationship(user?.uid, profile.uid),
    isOwner ? listIncomingRequests(profile.uid) : [],
    // Whether the viewer may message this member (the Message button). Never
    // allowed to break the profile page.
    user?.username && !isOwner ? getMessagingInfo(user.uid, profile.uid).catch(() => null) : null,
  ]);
  const shown = locked ? { ...profile, bio: "", location: "", website: "" } : profile;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pf-page">
        <ProfileHeader
          initialProfile={shown}
          stats={stats}
          insights={insights}
          social={{ counts, relationship }}
          requests={requests}
          messaging={messaging}
          signedIn={!!user?.username}
          isOwner={isOwner}
          locked={locked}
        />
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
