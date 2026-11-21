import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import MessagesApp from "@/components/messages/MessagesApp";
import { getCurrentUser } from "@/lib/current-user";
import { cleanHandle } from "@/lib/chat-social";
import { NOTIF_KEY } from "@/lib/notif-pool";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Messages · GTAFanbase",
  description: "Chat with friends and followers, share lobby codes, plan heists and drop meet-up pins.",
};

export default async function MessagesPage({ searchParams }) {
  const user = await getCurrentUser();
  const sp = (await searchParams) || {};
  const rawWith = Array.isArray(sp.with) ? sp.with[0] : sp.with;
  // /messages?with=my-notifications opens the Notifications chat (not a handle, see lib/notif-pool.js).
  const withHandle = rawWith === NOTIF_KEY ? NOTIF_KEY : cleanHandle(rawWith);

  if (!user || !user.username) {
    return (
      <>
        <SiteHeaderClient user={user} />
        <MainNav />
        <main className="page-content">
          <div className="empty-feed">
            <h2 className="empty-feed-title">Sign in to open your messages</h2>
            <p className="empty-feed-sub">
              Log in with the button up top to chat with your friends and followers, swap lobby codes and plan your next session.
            </p>
            <Link href="/" className="cmp-link">Back to the feed</Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="page-content ms-page">
        <MessagesApp initialWith={withHandle} />
      </main>
    </>
  );
}
