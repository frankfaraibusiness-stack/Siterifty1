// URLs for post images. Bump WATERMARK_VERSION whenever the watermark (logo,
// size or position) changes: it is part of the URL, so browsers and CDNs fetch
// fresh branded copies instead of serving year-old cached ones.
export const WATERMARK_VERSION = 2;

export const postImageUrl = (postId, index) => `/media/${postId}/${index}?v=${WATERMARK_VERSION}`;
export const communityPostImageUrl = (communityId, postId, index) =>
  `/cmedia/${communityId}/p/${postId}/${index}?v=${WATERMARK_VERSION}`;
