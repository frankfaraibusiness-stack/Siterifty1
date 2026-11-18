import "server-only";
import { WATERMARK_LOGO_B64 } from "./watermark-logo";

// Post-image branding.
//
// brandImage(bytes, mime) -> { buffer, mime }   is a pure bytes-in / bytes-out step.
// It knows nothing about Firestore, so moving images to Cloud Storage, S3 or any
// other host only changes where the bytes are READ from, never this file.
//
//   Today:   routes read the image from Firestore -> brandImage -> browser.
//   Later:   if your own route still fetches the bytes (from anywhere) and calls
//            brandImage before responding, branding keeps working untouched.
//   If a third party ever serves images straight to browsers (bypassing your
//   routes), call brandImage in the upload API before saving instead.
export const WATERMARK = {
  position: "bottom-right",  // bottom-right | bottom-left | top-right | top-left
  widthRatio: 0.27,          // logo width as a share of the image width
  minWidth: 140,             // px, so it stays readable on small images
  maxWidth: 400,             // px, so it never dominates huge images
  maxShare: 0.5,             // never wider than this share of a tiny image
  margin: 0.025,             // gap from the edges, as a share of the image width
  opacity: 0.9,
  shadow: 0.6,               // soft dark halo so the mark reads on bright photos
  quality: 88,
};

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Logo as straight RGBA at the given width, with the fade applied to its alpha.
async function preparedLogo(sharp, width) {
  const { data, info } = await sharp(Buffer.from(WATERMARK_LOGO_B64, "base64"))
    .resize({ width, withoutEnlargement: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const faded = Buffer.from(data);
  for (let i = 3; i < faded.length; i += 4) faded[i] = Math.round(faded[i] * WATERMARK.opacity);
  return { data: faded, width: info.width, height: info.height };
}

export async function brandImage(buffer, mime) {
  try {
    const sharp = (await import("sharp")).default;
    const { width: W, height: H } = await sharp(buffer, { failOn: "none" }).metadata();
    if (!W || !H) return { buffer, mime };

    const logoW = Math.round(clamp(W * WATERMARK.widthRatio, WATERMARK.minWidth, WATERMARK.maxWidth));
    const target = Math.min(logoW, Math.round(W * WATERMARK.maxShare));
    const logo = await preparedLogo(sharp, target);

    // Pad so the shadow blur has room, then build mark + shadow from the same pixels.
    const pad = Math.max(6, Math.round(target * 0.06));
    const padded = { top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } };
    const raw = { raw: { width: logo.width, height: logo.height, channels: 4 } };
    const mark = await sharp(logo.data, raw).extend(padded).png().toBuffer();

    const shade = Buffer.from(logo.data);
    for (let i = 0; i < shade.length; i += 4) {
      shade[i] = shade[i + 1] = shade[i + 2] = 0;
      shade[i + 3] = Math.round(shade[i + 3] * WATERMARK.shadow);
    }
    const shadow = await sharp(shade, raw).extend(padded).blur(Math.max(1.5, target * 0.015)).png().toBuffer();

    const m = Math.round(W * WATERMARK.margin);
    const boxW = logo.width + pad * 2;
    const boxH = logo.height + pad * 2;
    const right = WATERMARK.position.endsWith("right");
    const bottom = WATERMARK.position.startsWith("bottom");
    const left = clamp(right ? W - boxW - m + pad : m - pad, 0, Math.max(0, W - boxW));
    const top = clamp(bottom ? H - boxH - m + pad : m - pad, 0, Math.max(0, H - boxH));
    const dy = Math.max(1, Math.round(target * 0.012));

    let out = sharp(buffer, { failOn: "none" }).composite([
      { input: shadow, left, top: clamp(top + dy, 0, Math.max(0, H - boxH)) },
      { input: mark, left, top },
    ]);
    if (mime === "image/png") out = out.png();
    else if (mime === "image/webp") out = out.webp({ quality: WATERMARK.quality });
    else out = out.jpeg({ quality: WATERMARK.quality });
    return { buffer: await out.toBuffer(), mime };
  } catch (err) {
    // Fail open: a broken stamp should never take images offline. Watch the logs for this line.
    console.error("brandImage failed, serving the original", err);
    return { buffer, mime };
  }
}
