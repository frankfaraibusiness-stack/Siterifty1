import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ScrollTopButton from "@/components/ScrollTopButton";
import CommunityFeed from "@/components/communities/CommunityFeed";
import JoinButton from "@/components/communities/JoinButton";
import CopyLink from "@/components/communities/CopyLink";
import { CommunityAvatar, CommunityBanner, CommunityIcon, HandlePlate } from "@/components/communities/CommunityArt";
import { LockIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/current-user";
import { fetchCommunityPosts, fetchMembers, getCommunityBySlug, getViewerState, postingStatus, stateLabel, col } from "@/lib/community-data";
import { FIXED_RULE, ROLE_LABEL, getCategory, isStaff, roleRank } from "@/lib/community-schema";
import { formatCount } from "@/lib/format-count";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const c = await getCommunityBySlug((await params).slug);
  return { title: c ? `${c.name} · GTA6FanBase` : "Community · GTA6FanBase", description: c?.tagline };
}

const TABS = [["feed", "Feed"], ["about", "About"], ["members", "Members"]];
const when = (ms) => new Date(ms).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

function Allowed({ c }) {
  const p = c.permissions;
  const items = [
    [p.whoCanPost === "everyone" ? "ok" : "no", p.whoCanPost === "everyone" ? "Everyone can post" : p.whoCanPost === "mods" ? "Chat locked: mods & admins" : "Chat locked: admins only"],
    [p.links === "everyone" ? "ok" : p.links === "staff" ? "mid" : "no", p.links === "everyone" ? "Links allowed" : p.links === "staff" ? "Links: staff only" : "No links"],
    [p.images === "everyone" ? "ok" : p.images === "staff" ? "mid" : "no", p.images === "everyone" ? "Images allowed" : p.images === "staff" ? "Images: staff only" : "No images"],
    [p.leakPolicy === "banned" ? "no" : p.leakPolicy === "labelled" ? "mid" : "ok", p.leakPolicy === "banned" ? "Leaks banned" : p.leakPolicy === "labelled" ? "Leaks covered" : "Leaks allowed"],
  ];
  if (p.slowMode) items.push(["mid", `Slow mode ${p.slowMode < 60 ? `${p.slowMode}s` : `${p.slowMode / 60}m`}`]);
  return <ul className="gc-allowed">{items.map(([k, t]) => <li key={t} className={k}>{t}</li>)}</ul>;
}

function Rules({ c }) {
  return (
    <ol className="gc-rule-list">
      {[FIXED_RULE, ...c.rules].map((r) => <li key={r.title}><b>{r.title}</b>{r.body && <small>{r.body}</small>}</li>)}
    </ol>
  );
}

export default async function CommunityPage({ params, searchParams }) {
  const { slug } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const c = await getCommunityBySlug(slug);
  if (!c) notFound();

  const v = await getViewerState(c.id, user?.uid);
  const staff = isStaff(v.role);
  const isAdmin = roleRank(v.role) >= 3;
  const member = !!v.role;
  const canSee = c.privacy === "public" || member;
  const tab = TABS.some(([id]) => id === sp.tab) ? sp.tab : "feed";
  const cat = getCategory(c.category);
  const showMembersTab = canSee && (c.permissions.showMembers || staff);
  const tabs = TABS.filter(([id]) => id !== "members" || showMembersTab);

  const [posts, members, reqCount] = await Promise.all([
    tab === "feed" && canSee ? fetchCommunityPosts(c.id, user?.uid) : [],
    tab === "members" && showMembersTab ? fetchMembers(c.id) : [],
    staff && c.privacy === "private" ? col().doc(c.id).collection("requests").count().get().then((s) => s.data().count) : 0,
  ]);
  const viewer = { uid: user?.uid, username: user?.username, role: v.role };
  const status = postingStatus(c, v);
  const state = stateLabel(v);

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="gc-wrap gc-profile" style={{ "--a": c.a, "--b": c.b }}>
        <header className="gc-head">
          <CommunityBanner community={c} className="tall" />
          <div className="gc-head-row">
            <span className="gc-head-avatar"><CommunityAvatar community={c} size={92} /></span>
            <div className="gc-head-id">
              <h1>{c.name}</h1>
              <div className="gc-head-sub">
                <HandlePlate slug={c.slug} />
                {c.privacy === "private" ? <span className="gc-pill private"><LockIcon /> Private</span> : <span className="gc-pill public">Public</span>}
                <span className="gc-topic"><CommunityIcon id={cat?.icon || c.icon} size={14} />{c.categoryLabel}</span>
              </div>
            </div>
            <div className="gc-head-actions">
              <JoinButton community={c} state={state} signedIn={!!user?.username} big />
              <CopyLink slug={c.slug} label="Share" />
              {isAdmin && <Link href={`/c/${c.slug}/manage`} className="gc-btn ghost">Manage</Link>}
              {staff && !isAdmin && c.privacy === "private" && c.permissions.modsCanApprove && <Link href={`/c/${c.slug}/manage?tab=requests`} className="gc-btn ghost">Requests</Link>}
            </div>
          </div>
          <p className="gc-head-tag">{c.tagline}</p>
          <dl className="gc-head-stats">
            <div><dt>Members</dt><dd>{formatCount(c.memberCount)}</dd></div>
            <div><dt>Posts</dt><dd>{formatCount(c.postCount)}</dd></div>
            <div><dt>Started</dt><dd>{when(c.createdMs)}</dd></div>
            {reqCount > 0 && <div className="alert"><dt>Waiting</dt><dd>{reqCount}</dd></div>}
          </dl>
          {c.permissions.whoCanPost !== "everyone" && (
            <p className="gc-banner-lock"><LockIcon /> Chat is locked. {c.permissions.whoCanPost === "mods" ? "Only admins and moderators can post." : "Only admins can post."}</p>
          )}
        </header>

        <nav className="gc-tabs" aria-label="Community sections">
          {tabs.map(([id, label]) => (
            <Link key={id} href={id === "feed" ? `/c/${c.slug}` : `/c/${c.slug}?tab=${id}`} className={tab === id ? "on" : ""} aria-current={tab === id ? "page" : undefined}>{label}</Link>
          ))}
        </nav>

        {tab === "feed" && (
          <div className="gc-cols">
            <section className="gc-col-main">
              {canSee ? (
                <CommunityFeed community={c} posts={posts} viewer={viewer} status={status} readOnly={!member} />
              ) : (
                <div className="gc-private-wall">
                  <span className="gc-wall-ico"><LockIcon /></span>
                  <h2>This community is private</h2>
                  <p>Only members can see posts and who’s in. Send a request and the admins will take a look{c.questions.length ? ` after you answer ${c.questions.length} quick question${c.questions.length === 1 ? "" : "s"}` : ""}.</p>
                  <JoinButton community={c} state={state} signedIn={!!user?.username} big />
                </div>
              )}
              {canSee && !member && c.privacy === "public" && (
                <div className="gc-join-nudge"><span>Join to post, like and get this community in your list.</span><JoinButton community={c} state={state} signedIn={!!user?.username} /></div>
              )}
            </section>
            <aside className="gc-col-side">
              <section className="gc-side-card"><h2>About</h2><p className="gc-about-text">{c.description}</p>
                {c.tags.length > 0 && <div className="gc-tags">{c.tags.map((t) => <Link key={t} href={`/communities?q=${encodeURIComponent(`#${t}`)}`}>#{t}</Link>)}</div>}</section>
              <section className="gc-side-card"><h2>What’s allowed here</h2><Allowed c={c} /></section>
              <section className="gc-side-card"><h2>Rules</h2><Rules c={c} /></section>
            </aside>
          </div>
        )}

        {tab === "about" && (
          <div className="gc-about">
            <section className="gc-side-card"><h2>About {c.name}</h2><p className="gc-about-text">{c.description}</p>
              <p className="gc-meta-line">Run by <Link href={`/u/${c.ownerName}`}>@{c.ownerName}</Link> · started {when(c.createdMs)}</p>
              {c.tags.length > 0 && <div className="gc-tags">{c.tags.map((t) => <Link key={t} href={`/communities?q=${encodeURIComponent(`#${t}`)}`}>#{t}</Link>)}</div>}</section>
            <section className="gc-side-card"><h2>Rules</h2><Rules c={c} /></section>
            <section className="gc-side-card"><h2>What’s allowed here</h2><Allowed c={c} /></section>
            {c.privacy === "private" && c.questions.length > 0 && (
              <section className="gc-side-card"><h2>Questions to join</h2>
                <ol className="gc-rule-list">{c.questions.map((q) => <li key={q.id}><b>{q.text}</b><small>{q.required ? "Required" : "Optional"}</small></li>)}</ol></section>
            )}
          </div>
        )}

        {tab === "members" && (
          <section className="gc-members">
            <h2 className="gc-h2">Members <em>{c.memberCount}</em></h2>
            <ul>
              {members.map((m) => (
                <li key={m.uid}>
                  <span className="gc-uav" style={{ background: `linear-gradient(135deg, ${m.a || c.a}, ${m.b || c.b})` }}>{m.username?.[0]?.toUpperCase()}</span>
                  <Link href={`/u/${m.username}`}>@{m.username}</Link>
                  {m.role !== "member" && <em className={`gc-role ${m.role}`}>{ROLE_LABEL[m.role]}</em>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
      <ScrollTopButton />
    </>
  );
}
