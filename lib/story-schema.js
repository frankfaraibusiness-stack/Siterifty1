// Shared by the story composer (browser) and the stories API (server).
export const STORY = {
  maxSeconds: 15, // video clips can be at most this long
  secondsTolerance: 0.35, // phone clips often report 15.02s; don't reject those
  imageSeconds: 5, // how long a photo stays on screen
  hours: 24, // how long a story stays up
  maxVideoMB: 60,
  caption: 80,
  maxActivePerUser: 10,
};

export const STORY_VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
