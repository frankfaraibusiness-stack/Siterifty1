import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";

export default function CommunityNotFound() {
  return (
    <>
      <SiteHeaderClient user={null} />
      <MainNav />
      <main className="page-content">
        <div className="empty-feed">
          <h2 className="empty-feed-title">That community doesn’t exist</h2>
          <p className="empty-feed-sub">The link may be wrong, or the owner deleted it. Browse what’s out there or start your own.</p>
          <Link href="/communities" className="cmp-link">Browse communities</Link>
        </div>
      </main>
    </>
  );
}
