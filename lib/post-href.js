// Where a post opens. Uploaded video clips open in the Videos page (the
// full-screen, swipe-through player) starting on that clip; everything else
// opens on its own post page. Sharing always uses /p/{id}, which stays the one
// canonical address for a post (link previews, search engines).
export const isReelVideo = (media) => media?.type === "video" && media?.kind === "storage";

export const reelHref = (id) => `/videos?v=${encodeURIComponent(id)}`;

export const postHrefFor = (post) => (isReelVideo(post?.media) ? reelHref(post.id) : `/p/${post.id}`);
