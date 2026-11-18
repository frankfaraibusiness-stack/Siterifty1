import { notFound, redirect } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ManagePanel from "@/components/communities/ManagePanel";
import { getCurrentUser } from "@/lib/current-user";
import { fetchBans, fetchMembers, fetchRequests, getCommunityBySlug, getViewerState } from "@/lib/community-data";
import { isStaff } from "@/lib/community-schema";

export const dynamic = "force-dynamic";
export const metadata = { title: "Manage community · GTAFanbase" };

export default async function ManagePage({ params, searchParams }) {
  const { slug } = await params;
  const { tab } = await searchParams;
  const user = await getCurrentUser();
  const c = await getCommunityBySlug(slug);
  if (!c) notFound();
  const v = await getViewerState(c.id, user?.uid);
  if (!isStaff(v.role)) redirect(`/c/${c.slug}`);
  const [members, requests, bans] = await Promise.all([fetchMembers(c.id, 500), fetchRequests(c.id), fetchBans(c.id)]);
  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <ManagePanel community={c} role={v.role} uid={user.uid} members={members} requests={requests} bans={bans} initialTab={Array.isArray(tab) ? tab[0] : tab} />
    </>
  );
}
