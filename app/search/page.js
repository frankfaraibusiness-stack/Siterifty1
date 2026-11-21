import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import SearchBar from "@/components/SearchBar";
import SearchPostCard from "@/components/SearchPostCard";
import SearchPersonCard from "@/components/SearchPersonCard";
import ScrollTopButton from "@/components/ScrollTopButton";
import RecentSearches from "@/components/touches/RecentSearches";
import SearchTracker from "@/components/search/SearchTracker";
import { HashIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/current-user";
import { searchEverything, getDiscover } from "@/lib/search-data";
import { buildSearchTabs, postTypeOfTab, readSearchTab } from "@/lib/search-tabs";
import { feedTypeInfo } from "@/lib/feed-types";

// Every search is rendered on the server from fresh Firestore data.
export const dynamic = "force-dynamic";

const one = (v) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }) {
  const q = one((await searchParams).q);
  return { title: q ? `${q} · Search · GTAFanbase` : "Search · GTAFanbase" };
}

function tabHref(query, type) {
  const p = new URLSearchParams({ q: query });
  if (type !== "all") p.set("type", type);
  return `/search?${p.toString()}`;
}

function Discover({ discover }) {
  return (
    <>
      {discover.tags.length > 0 && (
        <section className="sr-section">
          <h2 className="sr-section-title">Trending in Leonida</h2>
          <div className="sr-chips">
            {discover.tags.map(({ tag, count }) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(`#${tag}`)}`}
                className="sr-chip"
              >
                <span className="pf-ico">
                  <HashIcon />
                </span>
                {tag}
                <em>{count}</em>
              </Link>
            ))}
          </div>
        </section>
      )}
      {discover.people.length > 0 && (
        <section className="sr-section">
          <h2 className="sr-section-title">New faces</h2>
          <div className="sr-people">
            {discover.people.map((p) => (
              <SearchPersonCard key={p.username} person={p} terms={[]} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default async function SearchPage({ searchParams }) {
  const sp = await searchParams;
  const rawQ = one(sp.q) ?? "";
  // all | people | one tab per post format (post, video, poll, theory, event)
  const type = readSearchTab(sp.type);

  const user = await getCurrentUser();
  const { query, terms, posts, people, postTotal, peopleTotal, typeCounts } =
    await searchEverything(rawQ, { currentUid: user?.uid, postType: postTypeOfTab(type) });

  const total = postTotal + peopleTotal;
  const hasQuery = terms.length > 0;
  const discover = !hasQuery || total === 0 ? await getDiscover() : null;

  const showPeople = (type === "all" || type === "people") && people.length > 0;
  const showPosts = type !== "people" && posts.length > 0;
  const tabs = buildSearchTabs({ peopleTotal, typeCounts, active: type });
  // The number shown for the tab you are on, and its name ("polls", "videos"...).
  const tabTotal = type === "all" ? total : type === "people" ? peopleTotal : typeCounts[type] || 0;
  const tabName = type === "people" ? "people" : feedTypeInfo(type).plural;
  const peopleShown = type === "all" ? people.slice(0, 4) : people;

  return (
    <>
      <SiteHeaderClient user={user} />

      <main className="page-content sr-wrap">
        <div className="sr-pad sr-top">
          <h1 className="sr-title">Search</h1>
          <SearchBar defaultValue={query} type={type} autoFocus={!hasQuery} />

          {hasQuery && total > 0 && (
            <>
              <nav className="sr-tabs" aria-label="Result type">
                {tabs.map(({ id, label, count }) => (
                  <Link
                    key={id}
                    href={tabHref(query, id)}
                    className={`sr-tab${type === id ? " active" : ""}`}
                    aria-current={type === id ? "page" : undefined}
                    prefetch={false}
                  >
                    {label}
                    <em>{count}</em>
                  </Link>
                ))}
              </nav>
              <p className="sr-summary">
                {tabTotal} {tabTotal === 1 ? "result" : "results"} for{" "}
                <strong>&ldquo;{query}&rdquo;</strong>
              </p>
            </>
          )}
        </div>

        {showPeople && (
          <section className={`sr-section sr-pad sr-people-sec${showPosts ? " sr-side" : " sr-full"}`}>
            {type === "all" && <h2 className="sr-section-title">People</h2>}
            <div className="sr-people">
              {peopleShown.map((p) => (
                <SearchPersonCard key={p.username} person={p} terms={terms} />
              ))}
            </div>
            {type === "all" && peopleTotal > peopleShown.length && (
              <Link href={tabHref(query, "people")} className="sr-more">
                See all {peopleTotal} people
              </Link>
            )}
          </section>
        )}

        {showPosts && (
          <section className="sr-section sr-posts-sec">
            {type === "all" && <h2 className="sr-section-title sr-pad">Posts</h2>}
            <div className="feed">
              {posts.map((post) => (
                <SearchPostCard key={post.id} post={post} terms={terms} />
              ))}
            </div>
          </section>
        )}

        {hasQuery && total > 0 && tabTotal === 0 && (
          <div className="sr-pad">
            <div className="sr-empty">
              <span className="sr-empty-icon">
                <SearchIcon />
              </span>
              <h2>
                No {tabName} match &ldquo;{query}&rdquo;
              </h2>
              <p>
                <Link href={tabHref(query, "all")} className="sr-link">
                  See all {total} results
                </Link>
              </p>
            </div>
          </div>
        )}

        {hasQuery && total === 0 && (
          <div className="sr-pad">
            <div className="sr-empty">
              <span className="sr-empty-icon">
                <SearchIcon />
              </span>
              <h2>Nothing found for &ldquo;{query}&rdquo;</h2>
              <p>
                Check the spelling, try fewer words, or search a #tag or a
                username.
              </p>
            </div>
          </div>
        )}

        {!hasQuery && (
          <div className="sr-pad">
            <RecentSearches />
          </div>
        )}

        {discover && (
          <div className="sr-pad">
            <Discover discover={discover} />
          </div>
        )}
      </main>

      {/* Search rank: a search that found something adds +1 to its keyword. */}
      {hasQuery && total > 0 && <SearchTracker q={query} />}

      <ScrollTopButton />
    </>
  );
}
