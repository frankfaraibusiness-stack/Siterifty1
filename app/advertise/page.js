import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import ScrollTopButton from "@/components/ScrollTopButton";
import AdsApp from "@/components/ads/AdsApp";
import Discover from "@/components/Discover";
import { getCurrentUser } from "@/lib/current-user";
import { listMine, listOrders } from "@/lib/ads-data";
import { BackIc } from "@/components/ads/AdIcons";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Advertise · GTAFanbase",
  description:
    "Reach GTA 6 fans with image and video ads. Pay once, choose your budget and placements, and track views, clicks and CTR live.",
};

export default async function AdvertisePage() {
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  // Two small reads (the advertiser's ads and orders). Nothing is read for visitors who aren't signed in.
  const [ads, orders] = signedIn ? await Promise.all([listMine(user.uid), listOrders(user.uid)]) : [[], []];

  return (
    <>
      <SiteHeaderClient user={user} />
      <main className="am-page">
        <Link href="/" className="up-back"><BackIc size="15px" /> Back to the feed</Link>
        <AdsApp user={signedIn ? { uid: user.uid, username: user.username } : null} initialAds={ads} initialOrders={orders} />
        <Discover spot="advertise" variant="tiles" className="dc-foot" title="More from GTAFanbase" />
      </main>
      <ScrollTopButton />
    </>
  );
}
