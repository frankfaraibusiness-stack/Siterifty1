import { characterSrc } from "@/lib/characters";
import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import SettingsApp from "@/components/settings/SettingsApp";
import { getCurrentUser } from "@/lib/current-user";
import { getAdminDb } from "@/lib/firebase-admin";
import { getContentStats } from "@/lib/user-prefs";
import { normalizePrefs } from "@/lib/settings";
import { DEFAULT_PLAN, isPlanId } from "@/lib/plans";
import { cleanPerks } from "@/lib/perks";
import "./settings.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Settings · GTAFanbase",
  description: "Manage your character, posts, privacy, feed and the look of the whole city.",
};

export default async function SettingsPage() {
  const user = await getCurrentUser();

  if (!user || !user.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <main className="page-content">
          <div className="empty-feed">
            <h2 className="empty-feed-title">Sign in to open your settings</h2>
            <p className="empty-feed-sub">
              Log in with the button up top and your character, privacy and look
              settings will be waiting here.
            </p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        </main>
      </>
    );
  }

  const [snap, stats] = await Promise.all([
    getAdminDb().collection("users").doc(user.uid).get(),
    getContentStats(user.uid),
  ]);
  const d = snap.data() || {};

  const me = {
    username: user.username,
    displayName: d.displayName || user.username,
    bio: d.bio || "",
    location: d.location || "",
    website: d.website || "",
    theme: d.theme || "vice",
    plan: isPlanId(d.plan) ? d.plan : DEFAULT_PLAN,
    perks: cleanPerks(d.perks),
    avatarUrl: d.avatarUrl || null,
    defaultAvatar: characterSrc(d.character),
    bannerUrl: d.bannerUrl || null,
    // Two-letter country saved at sign-up, or null ("unknown" / accounts from before it was saved).
    country: typeof d.country === "string" && /^[A-Z]{2}$/.test(d.country) ? d.country : null,
    gender: d.gender === "female" || d.gender === "male" ? d.gender : null,
  };

  return (
    <>
      <SiteHeaderClient user={user} />
      <SettingsApp me={me} prefs={normalizePrefs(d.prefs)} stats={stats} email={user.email || ""} />
    </>
  );
}
