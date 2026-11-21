import Link from "next/link";
import { formatCount } from "@/lib/format-count";

// "Trending tags": a row of #tag chips from the posts on this page. Each one
// opens the search page for that tag. Renders nothing when there are no tags.
export default function TrendingTags({ tags }) {
  if (!tags?.length) return null;
  return (
    <section className="trg" aria-labelledby="trg-title">
      <h2 className="trg-h" id="trg-title">Trending tags</h2>
      <ul className="trg-list">
        {tags.map(({ tag, count }) => (
          <li key={tag}>
            <Link href={`/search?q=${encodeURIComponent(`#${tag}`)}`} className="trg-chip" prefetch={false}>
              <span>#{tag}</span>
              <em>{formatCount(count)}</em>
              <span className="sr-only"> {count === 1 ? "post" : "posts"}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
