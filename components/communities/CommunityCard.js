import Link from "next/link";
import { CommunityAvatar, CommunityBanner, CommunityIcon, HandlePlate } from "./CommunityArt";
import { LockIcon } from "@/components/icons";
import { formatCount } from "@/lib/format-count";

// `action` is the join button slot; `preview` renders a non-clickable card.
export default function CommunityCard({ community: c, action, preview, bannerSrc, avatarSrc, compact }) {
  const Wrap = preview ? "div" : Link;
  const wrapProps = preview ? {} : { href: `/c/${c.slug}`, "aria-label": `Open ${c.name}` };
  return (
    <article className={`gc-card${compact ? " compact" : ""}`} style={{ "--a": c.a, "--b": c.b }}>
      <Wrap {...wrapProps} className="gc-card-hit">
        <CommunityBanner community={c} bannerSrc={bannerSrc} />
        <span className="gc-card-avatar"><CommunityAvatar community={c} avatarSrc={avatarSrc} size={compact ? 52 : 62} /></span>
      </Wrap>
      <div className="gc-card-body">
        <div className="gc-card-top">
          <h3 className="gc-card-name">
            {preview ? c.name || "Your community name" : <Link href={`/c/${c.slug}`}>{c.name}</Link>}
          </h3>
          {c.privacy === "private" && <span className="gc-pill private" title="Members are approved by admins"><LockIcon /> Private</span>}
        </div>
        <HandlePlate slug={c.slug} />
        <p className="gc-card-tag">{c.tagline || "A short line that says what your community is about."}</p>
        <div className="gc-card-meta">
          <span className="gc-topic"><CommunityIcon id={c.icon} size={14} />{c.categoryLabel || "GTA 6"}</span>
          <span><b>{formatCount(c.memberCount ?? 1)}</b> {(c.memberCount ?? 1) === 1 ? "member" : "members"}</span>
          {c.postCount > 0 && <span><b>{formatCount(c.postCount)}</b> posts</span>}
        </div>
        {action && <div className="gc-card-action">{action}</div>}
      </div>
    </article>
  );
}
