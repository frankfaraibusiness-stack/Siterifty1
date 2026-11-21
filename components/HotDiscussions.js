import Link from "next/link";
import { CommunityBanner, CommunityAvatar } from "./communities/CommunityArt";
import { formatCount } from "@/lib/format-count";
import { agoLong } from "@/lib/time-ago";

const icon = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

// "Hot Discussions": the 3 communities with the most people in. Each row shows how many
// people are in and how long ago it was created ("10 days ago"). Post counts are left out
// on purpose. "See More" opens the Communities tab; a row opens that community.
export default function HotDiscussions({ communities }) {
  if (!communities?.length) return null;

  return (
    <section className="lp-card lp-hot" aria-labelledby="lp-hot-title">
      <header className="lp-card-head lp-hot-head">
        <span className="lp-flame" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 22c4 0 7-2.8 7-7 0-3-2-5.2-3.5-7-.3 1.8-1.3 3-2.5 3 0-3-1.5-5.8-4-8 .2 3.5-3.5 5.8-3.5 11.5C5.5 19 8 22 12 22z" />
          </svg>
        </span>
        <h2 className="lp-h" id="lp-hot-title">Hot Discussions</h2>
        <Link href="/communities" className="lp-more">
          See More <span aria-hidden="true">→</span>
        </Link>
      </header>

      <ul className="lp-hot-list">
        {communities.map((c) => {
          const href = `/c/${c.slug}`;
          const created = agoLong(c.createdMs);
          return (
            <li key={c.id} className="lp-hot-row" style={{ "--a": c.a, "--b": c.b }}>
              <Link href={href} className="lp-hot-thumb" tabIndex={-1} aria-hidden="true">
                <CommunityBanner community={c} />
              </Link>

              <div className="lp-hot-main">
                <div className="lp-hot-by">
                  <span className="lp-hot-av"><CommunityAvatar community={c} size={22} /></span>
                  <span className="lp-hot-handle">c/{c.slug}</span>
                  <span className="lp-trending">Trending</span>
                </div>
                <h3 className="lp-hot-title"><Link href={href}>{c.name}</Link></h3>

                <ul className="lp-stats">
                  <li>
                    <svg viewBox="0 0 24 24" width="15" height="15" {...icon} aria-hidden="true">
                      <circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" /><circle cx="17.4" cy="9.4" r="2.4" /><path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
                    </svg>
                    {formatCount(c.memberCount)} {c.memberCount === 1 ? "person" : "people"} in
                  </li>
                  {created && (
                    <li>
                      <svg viewBox="0 0 24 24" width="15" height="15" {...icon} aria-hidden="true">
                        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
                      </svg>
                      {created}
                    </li>
                  )}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
