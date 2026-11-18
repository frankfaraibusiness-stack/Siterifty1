import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ProfileView from "@/components/ProfileView";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { getProfileByUsername, fetchUserPosts } from "@/lib/profile-data";
import { getRelationship, getSocialCounts, listIncomingRequests } from "@/lib/social-data";
import { getMessagingInfo } from "@/lib/chat-social";
import { listReceivedGifts } from "@/lib/gifts-data";
import ProfileGifts from "@/components/gifts/ProfileGifts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { username } = await params;
  return { title: `@${username} · GTAFanbase` };
}

export default async function ProfilePage({ params, searchParams }) {
  const { username } = await params;
  // ?tab=videos (and so on) reopens the tab someone was on, e.g. after coming back from a post.
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const profile = await getProfileByUsername(username, user);
  if (!profile) notFound();

  const isOwner = user?.uid === profile.uid;
  // Settings > Character: a private account only shows its name and photo.
  const locked = profile.isPrivate && !isOwner;
  const [{ posts, stats, insights }, counts, relationship, requests, messaging, gifts] = await Promise.all([
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
    // Newest gifts received (never allowed to break the profile page).
    locked ? [] : listReceivedGifts(profile.uid, 12),
  ]);
  const shown = locked ? { ...profile, bio: "", location: "", website: "" } : profile;

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pf-page">
        <ProfileView
          initialProfile={shown}
          initialTab={Array.isArray(tab) ? tab[0] : tab}
          posts={posts}
          stats={stats}
          insights={insights}
          social={{ counts, relationship }}
          requests={requests}
          messaging={messaging}
          signedIn={!!user?.username}
          isOwner={isOwner}
          locked={locked}
          giftsStrip={
            locked ? null : (
              <ProfileGifts
                username={profile.username}
                gifts={gifts}
                total={profile.giftsReceived}
                isOwner={isOwner}
              />
            )
          }
        />
      </main>
      <ScrollTopButton />
    </>
  );
}
