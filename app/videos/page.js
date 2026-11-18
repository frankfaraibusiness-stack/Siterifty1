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

export default async function VideosPage() {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <VideosApp signedIn={signedIn} />
    </>
  );
}
