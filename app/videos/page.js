import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import VideosApp from "@/components/videos/VideosApp";
import { getCurrentUser } from "@/lib/current-user";
import "./videos.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Vice Reel · GTAFanbase",
  description: "Swipe through GTA clips, build a combo, find Hidden Packages and climb from Tourist to Vice Legend.",
};

// /videos?v={postId} opens the player on that clip (a video tapped in the feed, a profile, a rail).
export default async function VideosPage({ searchParams }) {
  const sp = await searchParams;
  const v = Array.isArray(sp?.v) ? sp.v[0] : sp?.v;
  const startId = typeof v === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(v) ? v : "";
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <VideosApp signedIn={signedIn} startId={startId} />
    </>
  );
}
