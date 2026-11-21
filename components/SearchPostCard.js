import Link from "next/link";
import PostMedia from "./PostMedia";
import Highlight from "./Highlight";
import PlanBadges from "./PlanBadges";
import { FlairBadge, FlairName, haloClass } from "./Flair";
import { formatCount } from "@/lib/format-count";

// Server-rendered result card (reuses the feed's .post styling).
export default function SearchPostCard({ post, terms }) {
  const tag = post.tag ? `#${post.tag.replace(/^#/, "")}` : null;

  return (
    <article className="post">
      <div className="post-head">
        <div
          className={`post-avatar${haloClass(post.flair)}`}
          style={{ "--a": post.avatarA, "--b": post.avatarB }}
        >
          {post.initial}
          {post.hasAvatar && (
            <span
              className="post-avatar-img"
              style={{
                backgroundImage: `url("/avatar/${encodeURIComponent(post.user)}?v=${post.avatarV}")`,
              }}
            />
          )}
        </div>
        <div className="post-meta">
          <div className="post-user">
            <Link href={`/u/${post.user}`} className="sr-link">
              <FlairName flair={post.flair} a={post.avatarA} b={post.avatarB}>
                <Highlight text={post.user} terms={terms} />
              </FlairName>
            </Link>
            <PlanBadges plan={post.plan} />
            <FlairBadge flair={post.flair} />
          </div>
          <div className="post-sub">
            {post.location && (
              <>
                <Highlight text={post.location} terms={terms} /> &middot;{" "}
              </>
            )}
            {post.timeAgo}
          </div>
        </div>
      </div>

      {post.title && (
        <h3 className="post-title">
          <Highlight text={post.title} terms={terms} />
        </h3>
      )}

      <p className="post-text">
        <Highlight text={post.text} terms={terms} />
        {tag && (
          <>
            {" "}
            <Link href={`/search?q=${encodeURIComponent(tag)}`} className="tag sr-link">
              <Highlight text={tag} terms={terms} />
            </Link>
          </>
        )}
      </p>

      {post.media && !post.settings.spoiler && (
        <div className="post-media">
          <PostMedia media={post.media} postId={post.id} />
        </div>
      )}
      {post.media && post.settings.spoiler && (
        <p className="post-text">
          <Link href={`/p/${post.id}`} className="sr-link">Spoiler media hidden. Open the post</Link>
        </p>
      )}

      <div className="post-stats">
        <span className="like-count">{formatCount(post.likesCount)} likes</span>
        <span>
          {post.comments} comments &middot; {post.shares} shares
        </span>
      </div>
    </article>
  );
}
