import Link from "next/link";
import SiteHeaderClient from "@/components/SiteHeaderClient";
import MainNav from "@/components/MainNav";
import ScrollTopButton from "@/components/ScrollTopButton";
import Feed from "@/components/Feed";
import { SearchIcon } from "@/components/icons";
import { getCurrentUser } from "@/lib/current-user";
import { fetchEvents } from "@/lib/event-data";
import { EVENT_WHEN, countByWhen, filterEvents, isWhen } from "@/lib/event-filters";
import { EVENT_CATEGORIES, EVENT_MODES } from "@/lib/post-schema";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Events · GTAFanbase",
  description: "Meetups, watch parties, game nights and car meets from the GTA 6 fanbase. Find one and RSVP.",
};

const one = (v) => (Array.isArray(v) ? v[0] : v) || "";

function href({ when, mode, cat, q }) {
  const p = new URLSearchParams();
  if (when && when !== "upcoming") p.set("when", when);
  if (mode) p.set("mode", mode);
  if (cat) p.set("cat", cat);
  if (q) p.set("q", q);
  const s = p.toString();
  return `/events${s ? `?${s}` : ""}`;
}

const EMPTY = {
  upcoming: ["Nothing on the calendar yet", "Be the first to put a night on the map. Pick a time, a place and who can join."],
  live: ["Nothing is live right now", "Events show up here while they’re happening. Check what’s coming up next."],
  week: ["A quiet week ahead", "No events start in the next 7 days. Host one and get the crew together."],
  going: ["You haven’t RSVPed to anything", "Join an event and it will be listed here so you never miss it."],
  hosting: ["You aren’t hosting anything", "Create an event and manage guests, the waitlist and +1s from its card."],
  past: ["No past events", "Events that have ended will be kept here."],
};

export default async function EventsPage({ searchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const signedIn = !!user?.username;
  const when = isWhen(one(sp.when)) ? one(sp.when) : "upcoming";
  const mode = EVENT_MODES.some((m) => m.value === one(sp.mode)) ? one(sp.mode) : "";
  const cat = EVENT_CATEGORIES.includes(one(sp.cat)) ? one(sp.cat) : "";
  const q = one(sp.q).slice(0, 80);

  const all = await fetchEvents({ currentUid: user?.uid });
  const now = Date.now();
  const events = filterEvents(all, { when, mode, category: cat, q, now });
  const counts = countByWhen(all, { mode, category: cat, q, now });
  const filtered = !!(mode || cat || q);
  const [emptyTitle, emptySub] = filtered
    ? ["No events match those filters", "Try another day range, or clear the filters to see everything."]
    : EMPTY[when];

  return (
    <>
      <SiteHeaderClient user={user} />
      <MainNav />
      <main className="ev-wrap">
        <section className="ev-hero">
          <div className="ev-hero-copy">
            <h1>Events in Leonida</h1>
            <p>Meetups, watch parties, game nights and car meets. Find one near your crew, RSVP, and add it to your calendar.</p>
            <div className="ev-hero-actions">
              {signedIn ? (
                <Link href="/create?type=event" className="ev-btn solid">Host an event</Link>
              ) : (
                <span className="ev-note">Log in from the top bar to join or host events.</span>
              )}
            </div>
          </div>
          <dl className="ev-hero-stats">
            <div><dt>Coming up</dt><dd>{counts.upcoming}</dd></div>
            <div><dt>Live now</dt><dd className={counts.live ? "hot" : ""}>{counts.live}</dd></div>
            <div><dt>This week</dt><dd>{counts.week}</dd></div>
          </dl>
        </section>

        <form className="ev-search" action="/events" role="search">
          <SearchIcon />
          <input name="q" defaultValue={q} placeholder="Search events, places or hosts" aria-label="Search events" maxLength={80} />
          {when !== "upcoming" && <input type="hidden" name="when" value={when} />}
          {mode && <input type="hidden" name="mode" value={mode} />}
          {cat && <input type="hidden" name="cat" value={cat} />}
          <button type="submit" className="ev-btn solid">Search</button>
        </form>

        <nav className="ev-tabs" aria-label="When">
          {EVENT_WHEN.filter(([id]) => signedIn || (id !== "going" && id !== "hosting")).map(([id, label]) => (
            <Link key={id} href={href({ when: id, mode, cat, q })} className={when === id ? "on" : ""} aria-current={when === id ? "page" : undefined} prefetch={false}>
              {label}
              {counts[id] > 0 && <em>{counts[id]}</em>}
            </Link>
          ))}
        </nav>

        <div className="ev-filters">
          <nav className="ev-chips" aria-label="Where">
            <Link href={href({ when, cat, q })} className={!mode ? "on" : ""} prefetch={false}>Any place</Link>
            {EVENT_MODES.map((m) => (
              <Link key={m.value} href={href({ when, mode: m.value, cat, q })} className={mode === m.value ? "on" : ""} title={m.hint} prefetch={false}>{m.label}</Link>
            ))}
          </nav>
          <nav className="ev-chips" aria-label="Kind of event">
            <Link href={href({ when, mode, q })} className={!cat ? "on" : ""} prefetch={false}>Every kind</Link>
            {EVENT_CATEGORIES.map((c) => (
              <Link key={c} href={href({ when, mode, cat: c, q })} className={cat === c ? "on" : ""} prefetch={false}>{c}</Link>
            ))}
          </nav>
        </div>

        {filtered && (
          <p className="ev-result-line">
            {events.length} {events.length === 1 ? "event" : "events"}
            {q ? <> for “{q}”</> : null}{" "}
            <Link href={href({ when })}>Clear filters</Link>
          </p>
        )}

        {events.length > 0 ? (
          <Feed posts={events} />
        ) : (
          <div className="empty-feed ev-empty">
            <h2 className="empty-feed-title">{emptyTitle}</h2>
            <p className="empty-feed-sub">{emptySub}</p>
            {signedIn && !filtered && (when === "upcoming" || when === "week" || when === "hosting") && (
              <Link href="/create?type=event" className="ev-btn solid">Host an event</Link>
            )}
          </div>
        )}
      </main>
      <ScrollTopButton />
    </>
  );
}
