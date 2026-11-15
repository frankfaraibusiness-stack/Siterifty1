import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ScrollTopButton from "@/components/ScrollTopButton";
import CommunityCard from "@/components/communities/CommunityCard";
import JoinButton from "@/components/communities/JoinButton";
import { CommunityIcon } from "@/components/communities/CommunityArt";
import { SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/current-user";
import { fetchDiscover } from "@/lib/community-data";
import { CATEGORIES, getCategory } from "@/lib/community-schema";
import { formatCount } from "@/lib/format-count";

export const dynamic = "force-dynamic";
export const metadata = { title: "Communities · GTA6FanBase" };

const one = (v) => (Array.isArray(v) ? v[0] : v) || "";
const SORTS = [
  ["trending", "Trending"], ["newest", "New"], ["biggest", "Biggest"], ["active", "Most active"],
];

function href({ q, cat, sort }) {
  const p = new URLSearchParams();
  if (q) p.set("q", q);
  if (cat) p.set("cat", cat);
  if (sort && sort !== "trending") p.set("sort", sort);
  const s = p.toString();
  return `/communities${s ? `?${s}` : ""}`;
}

export default async function CommunitiesPage({ searchParams }) {
  const sp = await searchParams;
  const q = one(sp.q).slice(0, 80);
  const cat = getCategory(one(sp.cat)) ? one(sp.cat) : "";
  const sort = SORTS.some(([id]) => id === one(sp.sort)) ? one(sp.sort) : "trending";
  const user = await getCurrentUser();
  const { list, featured, mine, total, categoryCounts } = await fetchDiscover({ q, category: cat, sort, uid: user?.uid });
  const filtered = !!(q || cat);
  const totalMembers = list.reduce((n, c) => n + c.memberCount, 0);
  const card = (c, opts = {}) => (
    <CommunityCard key={c.id} community={c} {...opts}
      action={<JoinButton community={c} state={c.viewerState} signedIn={!!user?.username} />} />
  );
  const showFeatured = !filtered && featured.length > 0 && list.length > featured.length;
  const rest = showFeatured ? list.filter((c) => !featured.some((f) => f.id === c.id)) : list;

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="gc-wrap">
        <section className="gc-hero">
          <div className="gc-hero-copy">
            <h1>Find your crew in Leonida</h1>
            <p>Communities for every corner of GTA 6: trailer breakdowns, map hunters, theory boards, crews and more. Join one or start your own.</p>
            <div className="gc-hero-actions">
              {user?.username ? (
                <Link href="/communities/new" className="gc-btn solid big">Create a community</Link>
              ) : (
                <span className="gc-state-note">Log in from the top bar to join or create communities.</span>
              )}
            </div>
          </div>
          <dl className="gc-hero-stats">
            <div><dt>Communities</dt><dd>{formatCount(total)}</dd></div>
            <div><dt>Topics</dt><dd>{CATEGORIES.length}</dd></div>
            <div><dt>{filtered ? "Members in results" : "Your communities"}</dt><dd>{formatCount(filtered ? totalMembers : mine.length)}</dd></div>
          </dl>
        </section>

        <form className="gc-search" action="/communities" role="search">
          <SearchIcon />
          <input name="q" defaultValue={q} placeholder="Search communities, topics or #tags" aria-label="Search communities" maxLength={80} />
          {cat && <input type="hidden" name="cat" value={cat} />}
          {sort !== "trending" && <input type="hidden" name="sort" value={sort} />}
          <button type="submit" className="gc-btn solid">Search</button>
        </form>

        <nav className="gc-topics" aria-label="Topics">
          <Link href={href({ q, sort })} className={!cat ? "on" : ""}>All topics</Link>
          {CATEGORIES.map((c) => (
            <Link key={c.id} href={href({ q, cat: c.id, sort })} className={cat === c.id ? "on" : ""} style={{ "--a": c.a, "--b": c.b }}>
              <CommunityIcon id={c.icon} size={15} />{c.label}{categoryCounts[c.id] ? <em>{categoryCounts[c.id]}</em> : null}
            </Link>
          ))}
        </nav>

        {mine.length > 0 && !filtered && (
          <section className="gc-section">
            <h2 className="gc-h2">Your communities</h2>
            <div className="gc-rail">
              {mine.map((c) => (
                <Link key={c.id} href={`/c/${c.slug}`} className="gc-mini" style={{ "--a": c.a, "--b": c.b }}>
                  <CommunityIcon id={c.icon} size={18} />
                  <span><b>{c.name}</b><small>{c.ownerUid === user?.uid ? "You run this" : `${formatCount(c.memberCount)} members`}</small></span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {showFeatured && (
          <section className="gc-section">
            <h2 className="gc-h2">Trending right now</h2>
            <div className="gc-grid featured">{featured.map((c) => card(c))}</div>
          </section>
        )}

        <section className="gc-section">
          <div className="gc-list-head">
            <h2 className="gc-h2">
              {q ? `Results for “${q}”` : cat ? getCategory(cat).label : showFeatured ? "More communities" : "All communities"}
              <em>{rest.length}</em>
            </h2>
            <div className="gc-sorts" role="tablist" aria-label="Sort">
              {SORTS.map(([id, label]) => (
                <Link key={id} href={href({ q, cat, sort: id })} role="tab" aria-selected={sort === id} className={sort === id ? "on" : ""}>{label}</Link>
              ))}
            </div>
          </div>
          {rest.length > 0 ? (
            <div className="gc-grid">{rest.map((c) => card(c))}</div>
          ) : (
            <div className="empty-feed gc-empty">
              <div className="empty-feed-icon"><CommunityIcon id="pin" size={26} /></div>
              <h2 className="empty-feed-title">{filtered ? "No communities match that" : "No communities yet"}</h2>
              <p className="empty-feed-sub">
                {filtered ? "Try another topic or a broader search. Or start the one that’s missing." : "Be the first to build a home for your corner of GTA 6."}
              </p>
              {user?.username && <Link href="/communities/new" className="gc-btn solid">Create a community</Link>}
              {filtered && <Link href="/communities" className="cmp-link" style={{ "--a": "var(--accent-cyan)" }}>Clear filters</Link>}
            </div>
          )}
        </section>
      </main>
      <ScrollTopButton />
    </>
  );
}
