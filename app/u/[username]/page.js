import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ProfileView from "@/components/ProfileView";
import ScrollTopButton from "@/components/ScrollTopButton";
import ActivitySeen from "@/components/ActivitySeen";
import { getCurrentUser } from "@/lib/current-user";
import { shareMeta } from "@/lib/seo";
import { getProfileByUsername, fetchUserPosts } from "@/lib/profile-data";
import { getRelationship, getSocialCounts, listIncomingRequests } from "@/lib/social-data";
import { getMessagingInfo } from "@/lib/chat-social";
import { listReceivedGifts } from "@/lib/gifts-data";
import ProfileGifts from "@/components/gifts/ProfileGifts";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { username } = await params;
  const user = await getCurrentUser();
  const profile = await getProfileByUsername(username, user).catch(() => null);
  if (!profile) return { title: `@${username} · GTAFanbase` };

  const name = profile.displayName || profile.username;
  // A private account only shows its name and photo (same rule as the page itself).
  const locked = profile.isPrivate && user?.uid !== profile.uid;
  const title = name === profile.username ? `@${profile.username} · GTAFanbase` : `${name} (@${profile.username}) · GTAFanbase`;
  const description = locked
    ? `${name} is on GTAFanbase, the social media for GTA fans.`
    : profile.bio || `${name} on GTAFanbase: posts, clips and more from a fellow GTA fan.`;

  // Their profile picture (a small square, so the compact card). No picture -> the site's default image.
  // The length is only there so a new picture is fetched fresh instead of a cached old one.
  const image = profile.avatarUrl
    ? `/avatar/${encodeURIComponent(profile.username)}?v=${profile.avatarUrl.length}`
    : profile.character
    ? `/avatar/${encodeURIComponent(profile.username)}?v=${profile.character}`
    : null;
  return shareMeta({
    title,
    description,
    path: `/u/${profile.username}`,
    image,
    imageAlt: `${name}’s profile picture`,
    card: "summary",
    type: "profile",
    og: { username: profile.username },
  });
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
      {isOwner && <ActivitySeen />}
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
