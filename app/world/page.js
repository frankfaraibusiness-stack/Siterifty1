import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import { getCurrentUser } from "@/lib/current-user";
import { getAdminDb } from "@/lib/firebase-admin";
import WorldHub from "@/components/world/WorldHub";
import Discover from "@/components/Discover";
import "./world.css";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leonida World Hub · GTAFanbase", description: "Discover locations, collect characters, rate vehicles, discuss trailer frames and make GTA 6 predictions." };

export default async function WorldPage() {
  const user = await getCurrentUser();
  const db = getAdminDb();
  const [itemsSnap, userSnap] = await Promise.all([
    db.collection("gta6World").orderBy("createdAt", "desc").limit(50).get(),
    user?.uid ? db.collection("users").doc(user.uid).get() : Promise.resolve(null),
  ]);
  const items = await Promise.all(itemsSnap.docs.map(async (d, index) => {
    const data = d.data();
    let comments = [];
    if (data.type === "trailer" && index < 12) {
      const cs = await d.ref.collection("comments").orderBy("createdAt", "desc").limit(8).get();
      comments = cs.docs.map(c => ({ id: c.id, ...c.data(), createdAt: c.data().createdAt?.toMillis?.() || 0 }));
    }
    return { id: d.id, ...data, createdAt: data.createdAt?.toMillis?.() || 0, comments };
  }));
  const profile = userSnap?.data() || {};
  return <><SiteHeaderClient user={user} /><MainNav /><WorldHub user={user ? { uid: user.uid, username: user.username } : null} items={items} characterCollection={profile.gta6Characters || {}} reputation={profile.gta6Reputation || 0} /><div className="dc-outer"><Discover spot="world" variant="tiles" className="dc-foot" title="More from GTAFanbase" /></div></>;
}
