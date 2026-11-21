import { siteUrl } from "@/lib/site";

// /robots.txt: search engines may read the public site. The API, your own
// settings and the create screen are for logged-in members only.
export default function robots() {
  const base = siteUrl();
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/settings", "/create", "/profile", "/saved", "/messages", "/welcome", "/r/"] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
