// Link previews and search snippets, built the same way for every page.
//
// Why this exists: Next.js does not merge `openGraph` / `twitter` between the layout and a page. A page
// that sets only `title` inherits the layout's generic card, and a page that sets its own `openGraph`
// without `images` loses the picture altogether (the preview then falls back to the tiny favicon).
// shareMeta() always returns a complete card, so a page with no image of its own gets the default one.
//
// Plain data + string work only (no database, no "@/" imports), so the tests can run it.
import { SITE, siteUrl } from "./site.js";

// Absolute address for anything a crawler will fetch (previews must not use relative links).
export function absoluteUrl(pathOrUrl) {
  const s = String(pathOrUrl || "");
  if (/^https?:\/\//i.test(s)) return s;
  return `${siteUrl()}${s.startsWith("/") ? "" : "/"}${s}`;
}

// One tidy line of text for a description: no line breaks, no runaway length.
export function shareText(text, max = 200) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// The whole metadata block for one page.
//   title, description   what the preview and the browser tab say
//   path                 the page's own address (canonical + og:url); leave out where there is none
//   image                the page's own picture (path or full URL). Missing -> the default image
//   imageAlt, width, height   optional, for the picture
//   card                 "summary_large_image" (wide picture) or "summary" (small square, e.g. an avatar)
//   type                 og:type: "website" (default), "profile", "article" ...
//   og                   extra og fields for that type (e.g. { username })
export function shareMeta({ title, description, path, image, imageAlt, width, height, card, type = "website", og } = {}) {
  const desc = shareText(description) || SITE.summary;
  const own = !!image;
  const pic = own
    ? { url: absoluteUrl(image), ...(width && height ? { width, height } : {}), alt: imageAlt || title }
    : { url: absoluteUrl(SITE.ogImage.path), width: SITE.ogImage.width, height: SITE.ogImage.height, alt: SITE.ogImage.alt };
  const url = path ? absoluteUrl(path) : undefined;
  return {
    title,
    description: desc,
    ...(url && { alternates: { canonical: url } }),
    openGraph: {
      type,
      siteName: SITE.name,
      title,
      description: desc,
      ...(url && { url }),
      images: [pic],
      ...(og || {}),
    },
    twitter: {
      // The default picture is wide, so it always gets the big card.
      card: own ? card || "summary_large_image" : "summary_large_image",
      title,
      description: desc,
      images: [{ url: pic.url, alt: pic.alt }],
    },
  };
}
