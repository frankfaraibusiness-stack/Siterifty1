import Link from "next/link";
import VoiceSearchButton from "./VoiceSearchButton";
import { SearchIcon, XIcon } from "./icons";

// A plain HTML GET form: submitting it loads /search?q=... which the server
// renders. No client JavaScript is needed for searching itself.
export default function SearchBar({ defaultValue = "", type, autoFocus = false }) {
  return (
    <form className="sb" action="/search" method="get" role="search">
      <span className="sb-icon" aria-hidden="true">
        <SearchIcon />
      </span>
      <input
        className="sb-input"
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder="Search posts, people, #tags"
        maxLength={80}
        autoComplete="off"
        enterKeyHint="search"
        aria-label="Search GTA6FanBase"
        autoFocus={autoFocus}
      />
      {type && type !== "all" && <input type="hidden" name="type" value={type} />}
      {defaultValue && (
        <Link href="/search" className="sb-clear" aria-label="Clear search">
          <XIcon />
        </Link>
      )}
      <VoiceSearchButton />
      <button className="sb-submit" type="submit">
        Search
      </button>
    </form>
  );
}
