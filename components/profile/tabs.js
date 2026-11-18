// The profile's tabs. One tab per kind of post, plus About (opened from the bio).
// Plain data, shared by the page (which reads ?tab=) and the tab bar.
import { TYPES } from "@/lib/post-schema";

export const ABOUT_TAB = "about";

// Order matters: Posts first, then the other formats.
export const CONTENT_TABS = [
  { id: "post", label: "Posts", empty: "No posts yet" },
  { id: "video", label: "Videos", empty: "No videos yet" },
  { id: "poll", label: "Polls", empty: "No polls yet" },
  { id: "theory", label: "Theories", empty: "No theories yet" },
  { id: "event", label: "Events", empty: "No events yet" },
];

export const TAB_IDS = [...CONTENT_TABS.map((t) => t.id), ABOUT_TAB];

// Anything unknown (or a missing ?tab=) falls back to Posts.
export const cleanTab = (value) => (TAB_IDS.includes(value) ? value : "post");

// Old posts with no type, or a type we no longer know, count as plain posts.
export const typeOf = (post) => (TYPES[post.type] ? post.type : "post");
