// The tabs on /saved: your bookmarks, separated by what they are. Pure, so the page, the tab bar
// and the tests share it. (A relative import on purpose: plain Node runs the tests, and it can't
// resolve the app's "@/" alias.)
import { isReelVideo } from "./post-href.js";

// Uploaded clips are "Reels" (they open in the Videos player); a pasted YouTube link is "YouTube".
export const SAVED_TABS = [
  { id: "all", label: "All", singular: "post", plural: "posts", hint: "Tap the bookmark on a post, clip or event and it will wait for you here." },
  { id: "post", label: "Posts", singular: "post", plural: "posts", hint: "Bookmark a photo post and it will show up here." },
  { id: "reel", label: "Reels", singular: "reel", plural: "reels", hint: "Tap the bookmark on a clip in Videos and it will show up here." },
  { id: "youtube", label: "YouTube", singular: "YouTube video", plural: "YouTube videos", hint: "Bookmark a post that links a YouTube video and it will show up here." },
  { id: "poll", label: "Polls", singular: "poll", plural: "polls", hint: "Bookmark a poll to come back and check the results." },
  { id: "theory", label: "Theories", singular: "theory", plural: "theories", hint: "Bookmark a theory to see how the verdict turns out." },
  { id: "event", label: "Events", singular: "event", plural: "events", hint: "Bookmark an event so you don't lose the date and place." },
];

const IDS = new Set(SAVED_TABS.map((t) => t.id));

export const savedTabInfo = (id) => SAVED_TABS.find((t) => t.id === id) || SAVED_TABS[0];

// Anything from the URL -> a valid tab id ("all" when missing or unknown).
export function readSavedTab(raw) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  const id = String(v ?? "").toLowerCase();
  return IDS.has(id) ? id : "all";
}

// Which tab one saved post belongs to.
export function savedTabOf(post) {
  const type = post?.type || "post";
  if (type === "video") return isReelVideo(post?.media) ? "reel" : "youtube";
  return IDS.has(type) ? type : "post";
}

export const filterSaved = (posts, tab) => (tab === "all" ? posts : posts.filter((p) => savedTabOf(p) === tab));

// { all: 12, post: 4, reel: 3, youtube: 1, poll: 2, theory: 0, event: 2 }
export function countSaved(posts) {
  const counts = Object.fromEntries(SAVED_TABS.map((t) => [t.id, 0]));
  for (const p of posts) {
    counts.all += 1;
    counts[savedTabOf(p)] += 1;
  }
  return counts;
}

export const savedHref = (tab = "all") => (tab && tab !== "all" ? `/saved?tab=${tab}` : "/saved");
