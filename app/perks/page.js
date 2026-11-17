import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import PerksShop from "@/components/PerksShop";
import ScrollTopButton from "@/components/ScrollTopButton";
import { getCurrentUser } from "@/lib/current-user";
import { getUserPerks } from "@/lib/user-perks";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Perks Shop · GTA6FanBase",
  description:
    "One-time perks for your GTA6FanBase account. Pay once, keep them forever: pinned comments, longer comments, neon glow, exclusive accents and longer stories.",
};

export default async function PerksPage() {
  const user = await getCurrentUser();
  const owned = user ? await getUserPerks(user.uid) : [];

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="pk-page">
        <Link href={user?.username ? `/u/${user.username}` : "/"} className="up-back">
          ← {user?.username ? "Back to your profile" : "Back to the feed"}
        </Link>
        <PerksShop
          user={user ? { uid: user.uid, username: user.username } : null}
          initialOwned={owned}
        />
      </main>
      <ScrollTopButton />
    </>
  );
}
