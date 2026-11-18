// Browser-only. Re-encodes a picked video to a small H.264/MP4 before upload
// using WebCodecs (via mediabunny), so phones can upload big clips quickly and
// we stay under the storage file-size cap. Falls back to the original file
// when the browser can't do it.
import { AUDIO_BPS, DEFAULT_TARGET_MB, planCompression } from "@/lib/video-plan";

// Raw clips can be much bigger than the final upload because we shrink them
// on the device. This is only a sanity cap on what we agree to read.
export const SOURCE_MAX_MB = 1024;

export function canCompressVideo() {
  return (
    typeof window !== "undefined" &&
    typeof window.VideoEncoder === "function" &&
    typeof window.VideoDecoder === "function"
  );
}

// The largest raw file to accept: huge if we can shrink it, else the hard limit.
export function maxSourceMB(limitMB) {
  return canCompressVideo() ? SOURCE_MAX_MB : limitMB;
}

function probe(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    const done = (fn, val) => {
      URL.revokeObjectURL(url);
      fn(val);
    };
    v.onerror = () => done(reject, new Error("Couldn’t read that video. Try an MP4."));
    v.onloadedmetadata = () =>
      done(resolve, { width: v.videoWidth, height: v.videoHeight, duration: v.duration });
    v.src = url;
  });
}

// Resolves { file, original } where `file` is the smaller of (compressed,
// original). Resolves null if compression isn't possible for this clip.
// `handle.cancel()` stops it; the promise then rejects with "cancelled".
export function compressVideo(file, { maxMB = DEFAULT_TARGET_MB, onProgress } = {}) {
  let conversion = null;
  let cancelled = false;

  const promise = (async () => {
    if (!canCompressVideo()) return null;
    const meta = await probe(file);
    if (!meta.width || !meta.height || !Number.isFinite(meta.duration)) return null;

    const mb = await import("mediabunny");
    const { Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget, Mp4OutputFormat } = mb;
    const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });

    // Source frame rate (best effort): only used to cap 60fps clips to 30.
    let fps;
    try {
      const track = await input.getPrimaryVideoTrack();
      const stats = await track.computePacketStats(120);
      fps = stats?.averagePacketRate;
    } catch {
      /* keep the source rate */
    }

    const plan = planCompression({ ...meta, fps }, { maxBytes: maxMB * 1048576 });
    const output = new Output({
      format: new Mp4OutputFormat({ fastStart: "in-memory" }), // moov first: plays while loading
      target: new BufferTarget(),
    });

    conversion = await Conversion.init({
      input,
      output,
      video: {
        codec: "avc",
        width: plan.width,
        height: plan.height,
        fit: "fill",
        bitrate: plan.bitrate,
        ...(plan.frameRate && { frameRate: plan.frameRate }),
      },
      // No codec given: mediabunny picks one this browser can encode (AAC, else Opus).
      audio: { bitrate: AUDIO_BPS, forceTranscode: true },
    });
    if (!conversion.isValid) return null; // e.g. a codec this browser can't decode
    if (onProgress) conversion.onProgress = onProgress;
    if (cancelled) throw new Error("cancelled");

    try {
      await conversion.execute();
    } catch (e) {
      if (cancelled) throw new Error("cancelled");
      throw e;
    }

    const bytes = output.target.buffer;
    if (!bytes || !bytes.byteLength) return null;
    const out = new File([bytes], `${file.name.replace(/\.[^.]+$/, "") || "video"}.mp4`, {
      type: "video/mp4",
    });
    // Already tiny? Keep the original rather than re-encoding for nothing.
    return out.size < file.size * 0.95 || file.size > maxMB * 1048576
      ? { file: out, original: file }
      : { file, original: file };
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      conversion?.cancel?.();
    },
  };
}
