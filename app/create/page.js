import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import Composer from "@/components/composer/Composer";
import { getCurrentUser } from "@/lib/current-user";
import { getAdminBucket, getAdminDb } from "@/lib/firebase-admin";
import { getTheme } from "@/lib/profile-themes";
import { TYPES } from "@/lib/post-schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a post · GTA6FanBase" };

export default async function CreatePage({ searchParams }) {
  const user = await getCurrentUser();
  const { type } = await searchParams;

  if (!user || !user.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <main className="page-content">
          <div className="empty-feed">
            <h2 className="empty-feed-title">Sign in to post</h2>
            <p className="empty-feed-sub">
              Log in or join the crew with the button up top, then come back to share
              your screenshots, clips, polls and theories.
            </p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        </main>
      </>
    );
  }

  const profile = await getAdminDb().collection("users").doc(user.uid).get();
  const theme = getTheme(profile.data()?.theme);

  return (
    <>
      <SiteHeaderClient user={user} />
      <Composer
        user={{ username: user.username }}
        theme={{ a: theme.a, b: theme.b }}
        initialType={TYPES[type] ? type : null}
        videoUploads={!!getAdminBucket()}
      />
    </>
  );
}
