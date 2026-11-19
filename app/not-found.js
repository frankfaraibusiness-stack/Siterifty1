import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import SearchBar from "@/components/SearchBar";
import { getCurrentUser } from "@/lib/current-user";

export const metadata = { title: "Page not found · GTAFanbase" };

// Any address that doesn't exist (communities and profiles have their own, friendlier ones).
export default async function NotFound() {
  const user = await getCurrentUser();
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="oops-wrap" id="main">
        <section className="oops">
          <p className="oops-code" aria-hidden="true">404</p>
          <h1 className="oops-title">
            <span>Wasted.</span> This page left the map.
          </h1>
          <p className="oops-sub">
            The link may be old, mistyped, or the post was taken down. Try a search, or head back to somewhere that exists.
          </p>
          <div className="oops-search">
            <SearchBar compact />
          </div>
          <div className="oops-actions">
            <Link href="/" className="oops-btn solid">Back to the feed</Link>
            <Link href="/events" className="oops-btn">Events</Link>
            <Link href="/communities" className="oops-btn">Communities</Link>
            <Link href="/help" className="oops-btn">Help</Link>
          </div>
        </section>
      </main>
    </>
  );
}
