// Browser-only helpers: image compression, video poster capture and upload.

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

// Direct browser -> Firebase Storage upload using a short-lived signed URL.
// Returns { promise, abort } so the UI can show progress and cancel.
export function uploadVideo(file, { onProgress }) {
  let xhr;
  let aborted = false;
  const promise = (async () => {
    const res = await fetch("/api/uploads/video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: file.size, type: file.type }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(body.error || "Couldn’t start the upload.");
      err.code = res.status;
      throw err;
    }
    if (aborted) throw new Error("cancelled");
    await new Promise((resolve, reject) => {
      xhr = new XMLHttpRequest();
      xhr.open("PUT", body.uploadUrl);
      xhr.setRequestHeader("Content-Type", body.contentType);
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error("The upload was rejected. Check the bucket’s CORS settings."));
      xhr.onerror = () => reject(new Error("Network error while uploading."));
      xhr.onabort = () => reject(new Error("cancelled"));
      xhr.send(file);
    });
    return { storageId: body.postId };
  })();
  return {
    promise,
    abort: () => {
      aborted = true;
      xhr?.abort();
    },
  };
}
