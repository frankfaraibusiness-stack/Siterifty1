// Browser-only helpers: image compression, video poster capture and upload.
import { compressVideo, canCompressVideo } from "@/lib/video-compress";
import { DEFAULT_TARGET_MB } from "@/lib/video-plan";
import { supabaseConfig } from "@/lib/supabase-config";

function loadImage(file) {
  const url = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn’t read that image."));
    };
    img.src = url;
  });
}

// Fits the image inside max x max and re-encodes as JPEG, lowering quality
// (then size) until it is small enough to live on a Firestore document.
export async function compressImage(file, { max = 1440, maxBytes = 560_000 } = {}) {
  if (!file.type.startsWith("image/")) throw new Error("That file isn’t an image.");
  const { img, url } = await loadImage(file);
  try {
    let scale = Math.min(1, max / Math.max(img.width, img.height));
    for (let round = 0; round < 5; round++) {
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#0d0b10";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      for (let q = 0.86; q >= 0.5; q -= 0.12) {
        const data = canvas.toDataURL("image/jpeg", q);
        if (data.length * 0.75 <= maxBytes) return { data, width: w, height: h };
      }
      scale *= 0.82;
    }
    throw new Error("That image is too detailed to compress. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Reads the duration and grabs a poster frame from a local video file.
export function inspectVideo(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const fail = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Couldn’t read that video. Try an MP4."));
    };
    video.onerror = fail;
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 3);
    };
    video.onseeked = () => {
      try {
        const scale = Math.min(1, 960 / video.videoWidth);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(video.videoWidth * scale);
        canvas.height = Math.round(video.videoHeight * scale);
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve({
          duration: video.duration,
          poster: canvas.toDataURL("image/jpeg", 0.8),
          previewUrl: url,
        });
      } catch {
        fail();
      }
    };
    video.src = url;
  });
}

// Compresses the video on-device (when the browser can), then uploads it
// straight to storage (Supabase or Firebase) with a short-lived signed URL.
// Returns { promise, abort } so the UI can show progress and cancel.
//   onProgress(0..1) covers both steps: compressing is the first ~75% of the
//   bar, uploading the rest. onPhase("compress" | "upload") says which.
const COMPRESS_SHARE = 0.75;

export function uploadVideo(
  file,
  { onProgress, onPhase, endpoint = "/api/uploads/video", extra = {}, maxMB = DEFAULT_TARGET_MB }
) {
  let xhr;
  let compressor;
  let aborted = false;
  const check = () => {
    if (aborted) throw new Error("cancelled");
  };
  const promise = (async () => {
    // 1. Shrink it. If this browser can't (or the clip is unsupported), upload as is.
    let toSend = file;
    if (canCompressVideo()) {
      onPhase?.("compress");
      onProgress?.(0);
      compressor = compressVideo(file, { maxMB, onProgress: (p) => onProgress?.(p * COMPRESS_SHARE) });
      try {
        const r = await compressor.promise;
        if (r) toSend = r.file;
      } catch (e) {
        if (e.message === "cancelled" || aborted) throw new Error("cancelled");
        // Any other failure: fall back to the original file below.
      }
    }
    check();
    if (toSend.size > maxMB * 1048576) {
      throw new Error(
        canCompressVideo()
          ? `Even after compressing, this video is ${(toSend.size / 1048576).toFixed(0)} MB (max ${maxMB} MB). Try a shorter clip.`
          : `This browser can’t shrink videos and the file is over ${maxMB} MB. Try Chrome or Safari, or a shorter clip.`
      );
    }

    // 2. Ask the server for an upload slot for the final file.
    onPhase?.("upload");
    onProgress?.(canCompressVideo() ? COMPRESS_SHARE : 0);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: toSend.size, type: toSend.type, ...extra }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || "Couldn’t start the upload.");
      err.code = res.status;
      throw err;
    }
    check();

    // 3. Send the bytes.
    const base = canCompressVideo() ? COMPRESS_SHARE : 0;
    const isSupabase = /\/storage\/v1\/object\/upload\/sign\//.test(body.uploadUrl);
    await new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open("PUT", body.uploadUrl);
      let payload = toSend;
      if (isSupabase) {
        // Same request supabase-js makes for a signed upload (the browser sets the multipart type).
        const key = supabaseConfig.publishableKey;
        if (key) {
          xhr.setRequestHeader("apikey", key);
          xhr.setRequestHeader("Authorization", `Bearer ${key}`);
        }
        xhr.setRequestHeader("x-upsert", "false");
        payload = new FormData();
        payload.append("cacheControl", "3600");
        payload.append("", toSend);
      } else {
        xhr.setRequestHeader("Content-Type", body.contentType);
      }
      xhr.upload.onprogress = (e) =>
        e.lengthComputable && onProgress?.(base + (e.loaded / e.total) * (1 - base));
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(
              new Error(
                isSupabase
                  ? `The upload was rejected (${xhr.status}). Check the Supabase keys and bucket.`
                  : "The upload was rejected. Check the bucket’s CORS settings."
              )
            );
      xhr.onerror = () => reject(new Error("Network error while uploading."));
      xhr.onabort = () => reject(new Error("cancelled"));
      xhr.send(payload);
    });
    onProgress?.(1);
    return {
      storageId: body.storyId || body.postId,
      size: toSend.size,
      originalSize: file.size,
    };
  })();
  return {
    promise,
    abort: () => {
      aborted = true;
      compressor?.cancel();
      xhr?.abort();
    },
  };
}
