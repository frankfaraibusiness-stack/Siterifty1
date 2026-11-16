import { INFO_PAGES, LEGAL, siteUrl } from "@/lib/site";

// /sitemap.xml: lists the home page, communities and every info page from
// lib/site.js, so a new info page there shows up here automatically.
export default function sitemap() {
  const base = siteUrl();
  const updated = new Date(LEGAL.updatedISO);
  return [
    { url: `${base}/`, lastModified: updated, changeFrequency: "daily", priority: 1 },
    { url: `${base}/communities`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    { url: `${base}/world`, lastModified: updated, changeFrequency: "daily", priority: 0.8 },
    ...INFO_PAGES.map((p) => ({
      url: `${base}${p.href}`,
      lastModified: updated,
      changeFrequency: "monthly",
      priority: p.group === "help" ? 0.7 : 0.5,
    })),
  ];
}
