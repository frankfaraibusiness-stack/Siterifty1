// Browser-only helpers for the Story Maker's video step: read a clip's size and
// length, draw the trimmer's filmstrip, and grab the poster frame.

export function clock(seconds) {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const r = s - m * 60;
  return `${m}:${r.toFixed(1).padStart(4, "0")}`;
}

// Whole-second version for labels like 0:15.
export function clockWhole(seconds) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

// Loads just the metadata. The returned `url` stays alive for the preview and
// must be released with URL.revokeObjectURL by the caller.
export function readVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.playsInline = true;
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn’t read that video. Try an MP4."));
    };
    v.onerror = fail;
    v.onloadedmetadata = () => {
      if (!Number.isFinite(v.duration) || !v.videoWidth) return fail();
      resolve({ url, duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    };
    v.src = url;
  });
}

function seek(video, time) {
  return new Promise((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    setTimeout(done, 3500); // some files never report; move on rather than hang
    video.currentTime = time;
  });
}

function frameFrom(video, maxW, quality) {
  const scale = Math.min(1, maxW / video.videoWidth);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(2, Math.round(video.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(video.videoHeight * scale));
  canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

function hiddenVideo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "auto";
    v.muted = true;
    v.playsInline = true;
    v.onerror = () => reject(new Error("Couldn’t read that video. Try an MP4."));
    v.onloadeddata = () => resolve(v);
    v.src = url;
  });
}

// `count` small frames spread across the clip, for the trimmer's strip.
// `cancelled()` lets the caller stop early (new clip picked, popup closed).
export async function makeFilmstrip(url, duration, count, cancelled = () => false) {
  const v = await hiddenVideo(url);
  const frames = [];
  for (let i = 0; i < count; i++) {
    if (cancelled()) break;
    await seek(v, Math.min(duration - 0.05, ((i + 0.5) / count) * duration));
    try {
      frames.push(frameFrom(v, 110, 0.6));
    } catch {
      frames.push(null);
    }
  }
  v.removeAttribute("src");
  v.load();
  return frames;
}

// One full-size frame at `time`, as a JPEG data URL (the story's poster).
export async function grabFrame(url, time) {
  const v = await hiddenVideo(url);
  try {
    await seek(v, Math.max(0, time));
    return frameFrom(v, 960, 0.8);
  } finally {
    v.removeAttribute("src");
    v.load();
  }
}
