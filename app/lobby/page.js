import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import LobbyApp from "@/components/lobby/LobbyApp";
import { getCurrentUser } from "@/lib/current-user";
import { startingSoon } from "@/lib/lobby-data";
import "./lobby.css";
import { shareMeta } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = shareMeta({
  title: "The Lobby · GTAFanbase",
  description: "See who’s online, jump into live rooms, start your own session and find a crew for GTA 6.",
  path: "/lobby",
});

export default async function LobbyPage() {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  // Events are only a nice-to-have strip: a hiccup there must never block the lobby.
  const soon = signedIn ? await startingSoon(user).catch(() => []) : [];
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <LobbyApp user={signedIn ? { uid: user.uid, username: user.username } : null} soon={soon} />
    </>
  );
}
