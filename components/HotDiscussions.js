import Link from "next/link";
import { CommunityBanner, CommunityAvatar } from "./communities/CommunityArt";
import { formatCount } from "@/lib/format-count";

const icon = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

// "Hot Discussions": one promoted community. "See More" opens the Communities
// tab; the button goes straight to that community.
export default function HotDiscussions({ promo }) {
  if (!promo) return null;
  const { community: c, state } = promo;
  const href = `/c/${c.slug}`;
  const label = state === "member" || state === "owner" ? "Open" : state === "pending" ? "Requested" : "Join Discussion";

  return (
    <section className="lp-card lp-hot" aria-labelledby="lp-hot-title" style={{ "--a": c.a, "--b": c.b }}>
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

      <div className="lp-hot-body">
        <Link href={href} className="lp-hot-thumb" tabIndex={-1} aria-hidden="true">
          <CommunityBanner community={c} />
        </Link>

        <div className="lp-hot-main">
          <div className="lp-hot-by">
            <span className="lp-hot-av"><CommunityAvatar community={c} size={22} /></span>
            <span className="lp-hot-handle">c/{c.slug}</span>
            <span className="lp-promoted">Promoted</span>
          </div>
          <h3 className="lp-hot-title"><Link href={href}>{c.name}</Link></h3>
          {c.tagline && <p className="lp-hot-tag">{c.tagline}</p>}

          <div className="lp-hot-foot">
            <ul className="lp-stats">
              <li title="Members">
                <svg viewBox="0 0 24 24" width="15" height="15" {...icon} aria-hidden="true">
                  <circle cx="9" cy="8.5" r="3.2" /><path d="M2.8 20c.4-3.6 3-5.6 6.2-5.6s5.8 2 6.2 5.6" /><circle cx="17.4" cy="9.4" r="2.4" /><path d="M17.6 14.6c2.3.2 3.9 1.9 4.2 4.6" />
                </svg>
                <span className="sr-only">Members </span>{formatCount(c.memberCount)}
              </li>
              <li title="Posts">
                <svg viewBox="0 0 24 24" width="15" height="15" {...icon} aria-hidden="true">
                  <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.1A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
                </svg>
                <span className="sr-only">Posts </span>{formatCount(c.postCount)}
              </li>
            </ul>
            <Link href={href} className="lp-join">
              {label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
