import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import SearchBar from "@/components/SearchBar";
import SearchPostCard from "@/components/SearchPostCard";
import SearchPersonCard from "@/components/SearchPersonCard";
import ScrollTopButton from "@/components/ScrollTopButton";
import { HashIcon, SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/current-user";
import { searchEverything, getDiscover } from "@/lib/search-data";

// Every search is rendered on the server from fresh Firestore data.
export const dynamic = "force-dynamic";

const one = (v) => (Array.isArray(v) ? v[0] : v);

export async function generateMetadata({ searchParams }) {
  const q = one((await searchParams).q);
  return { title: q ? `${q} · Search · GTA6FanBase` : "Search · GTA6FanBase" };
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
  const requested = one(sp.type);
  const type = requested === "posts" || requested === "people" ? requested : "all";

  const user = await getCurrentUser();
  const { query, terms, posts, people, postTotal, peopleTotal } =
    await searchEverything(rawQ, { currentUid: user?.uid });

  const total = postTotal + peopleTotal;
  const hasQuery = terms.length > 0;
  const discover = !hasQuery || total === 0 ? await getDiscover() : null;

  const showPeople = type !== "posts" && people.length > 0;
  const showPosts = type !== "people" && posts.length > 0;
  const peopleShown = type === "all" ? people.slice(0, 4) : people;

  return (
    <>
      <SiteHeaderClient user={user} />

      <main className="page-content">
        <div className="sr-pad">
          <h1 className="sr-title">Search</h1>
          <SearchBar defaultValue={query} type={type} autoFocus={!hasQuery} />

          {hasQuery && total > 0 && (
            <>
              <nav className="sr-tabs" aria-label="Result type">
                {[
                  ["all", "All", total],
                  ["posts", "Posts", postTotal],
                  ["people", "People", peopleTotal],
                ].map(([id, label, count]) => (
                  <Link
                    key={id}
                    href={tabHref(query, id)}
                    className={`sr-tab${type === id ? " active" : ""}`}
                  >
                    {label}
                    <em>{count}</em>
                  </Link>
                ))}
              </nav>
              <p className="sr-summary">
                {total} {total === 1 ? "result" : "results"} for{" "}
                <strong>&ldquo;{query}&rdquo;</strong>
              </p>
            </>
          )}
        </div>

        {showPeople && (
          <section className="sr-section sr-pad">
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
          <section className="sr-section">
            {type === "all" && <h2 className="sr-section-title sr-pad">Posts</h2>}
            <div className="feed">
              {posts.map((post) => (
                <SearchPostCard key={post.id} post={post} terms={terms} />
              ))}
            </div>
          </section>
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

        {discover && (
          <div className="sr-pad">
            <Discover discover={discover} />
          </div>
        )}
      </main>

      <ScrollTopButton />
    </>
  );
}
