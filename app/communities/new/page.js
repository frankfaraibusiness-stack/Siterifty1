import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import CreateWizard from "@/components/communities/CreateWizard";
import { getCurrentUser } from "@/lib/current-user";
import { col } from "@/lib/community-data";
import { LIMITS } from "@/lib/community-schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Create a community · GTAFanbase" };

export default async function NewCommunityPage() {
  const user = await getCurrentUser();
  if (!user?.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <MainNav />
        <main className="page-content">
          <div className="empty-feed">
            <h2 className="empty-feed-title">Log in to start a community</h2>
            <p className="empty-feed-sub">Use the button up top to log in or join, then come back to build yours.</p>
            <Link href="/communities" className="cmp-link">Back to communities</Link>
          </div>
        </main>
      </>
    );
  }
  const owned = (await col().where("ownerUid", "==", user.uid).limit(LIMITS.owned + 1).get()).size;
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <CreateWizard user={{ username: user.username }} owned={owned} />
    </>
  );
}
