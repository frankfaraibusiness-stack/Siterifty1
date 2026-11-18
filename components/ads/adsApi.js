// Browser helper for /api/ads: one endpoint, many actions. Throws Error(message).
export async function adsApi(action, payload = {}) {
  const res = await fetch("/api/ads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || "Something went wrong. Try again.");
    err.fields = body.fields;
    err.status = res.status;
    throw err;
  }
  return body;
}

// A neutral sample ad (inline SVG, no network) for previews and the guide.
const sampleSvg = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff3d7f"/><stop offset=".55" stop-color="#7b2ff7"/><stop offset="1" stop-color="#2de2c5"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="960" cy="150" r="110" fill="#ffd36b" opacity=".9"/><path d="M0 560 L240 420 L420 520 L660 340 L900 500 L1200 380 V675 H0Z" fill="#1b1925" opacity=".55"/><text x="70" y="330" font-family="Arial,Helvetica,sans-serif" font-size="92" font-weight="900" fill="#fff">YOUR BRAND</text><text x="74" y="410" font-family="Arial,Helvetica,sans-serif" font-size="40" fill="#fff" opacity=".9">in front of GTA 6 fans</text></svg>`
);
export const SAMPLE_AD = {
  id: "sample",
  type: "image",
  title: "Your headline goes here",
  description: "A short line that tells fans why they should tap. Keep it clear and friendly.",
  cta: "Learn more",
  link: "https://yourwebsite.com",
  media: { kind: "image", src: `data:image/svg+xml;charset=utf-8,${sampleSvg}`, w: 1200, h: 675 },
};

// Reads the pixel size of an image data URL / URL.
export function imageSize(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve({ w: 0, h: 0 });
    img.src = src;
  });
}
