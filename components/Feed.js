import PostCard from "./PostCard";
import AdSlot from "./ads/AdSlot";
import { adGap } from "@/lib/ads";
import { issueTrk } from "@/lib/track-token";

// `adPlacement` (e.g. "feed") turns on sponsored cards: one after every 4 to 5
// posts, never after the last post. Each slot fetches its own single ad when it
// is about to scroll into view (components/ads/AdSlot.js).
//
// `track` ({ source, uid }) turns on post analytics: this server component signs one tracking
// token per post (never for the viewer's own posts), so views and clicks are counted by the
// server and can't be faked from the browser (lib/track-token.js).
export default function Feed({ posts, adPlacement, track }) {
  const out = [];
  let count = 0;
  let gap = adGap(posts[0]?.id);
  posts.forEach((post, i) => {
    out.push(<PostCard key={post.id} post={post} trk={track ? issueTrk(post, track.source, track.uid) : ""} />);
    count += 1;
    if (adPlacement && count >= gap && i < posts.length - 1) {
      out.push(<AdSlot key={`ad-${post.id}`} placement={adPlacement} />);
      count = 0;
      gap = adGap(post.id);
    }
  });
  return <section className="feed">{out}</section>;
}
