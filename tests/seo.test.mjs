import test from "node:test";
import assert from "node:assert/strict";
import { absoluteUrl, shareMeta, shareText } from "../lib/seo.js";
import { SITE } from "../lib/site.js";

const BASE = "https://gtafanbase.com";

test("a page with no picture of its own gets the default share image, absolute, on both cards", () => {
  const m = shareMeta({ title: "Events · GTAFanbase", description: "Meetups.", path: "/events" });
  const og = m.openGraph.images[0];
  assert.equal(og.url, `${BASE}${SITE.ogImage.path}`);
  assert.equal(og.width, 1200);
  assert.equal(og.height, 630);
  assert.equal(m.twitter.images[0].url, og.url);
  assert.equal(m.twitter.card, "summary_large_image");
});

test("the default image is never dropped, whatever else the page sets", () => {
  for (const args of [{}, { title: "x" }, { title: "x", description: "" }, { title: "x", image: null }, { title: "x", image: "" }]) {
    assert.ok(shareMeta(args).openGraph.images.length === 1);
    assert.ok(shareMeta(args).openGraph.images[0].url.endsWith("/og-default.jpg"));
  }
});

test("a page's own picture replaces the default, and relative paths become absolute", () => {
  const m = shareMeta({ title: "Post", path: "/p/abc", image: "/media/abc/0?v=2", imageAlt: "Alt" });
  assert.equal(m.openGraph.images[0].url, `${BASE}/media/abc/0?v=2`);
  assert.equal(m.openGraph.images[0].alt, "Alt");
  assert.equal(m.twitter.images[0].url, `${BASE}/media/abc/0?v=2`);
  assert.ok(!m.openGraph.images[0].url.includes("og-default"));
});

test("full URLs (a YouTube thumbnail) are left alone, with their size", () => {
  const m = shareMeta({ title: "Clip", image: "https://i.ytimg.com/vi/abc/hqdefault.jpg", width: 480, height: 360 });
  assert.equal(m.openGraph.images[0].url, "https://i.ytimg.com/vi/abc/hqdefault.jpg");
  assert.equal(m.openGraph.images[0].width, 480);
});

test("an avatar can ask for the small card; the default picture always gets the big one", () => {
  assert.equal(shareMeta({ title: "@a", image: "/avatar/a", card: "summary" }).twitter.card, "summary");
  assert.equal(shareMeta({ title: "@a", card: "summary" }).twitter.card, "summary_large_image");
});

test("title, description, canonical and og:url travel together", () => {
  const m = shareMeta({ title: "T", description: "  Line one\n\nline   two  ", path: "/c/vice" });
  assert.equal(m.title, "T");
  assert.equal(m.description, "Line one line two");
  assert.equal(m.openGraph.title, "T");
  assert.equal(m.twitter.title, "T");
  assert.equal(m.alternates.canonical, `${BASE}/c/vice`);
  assert.equal(m.openGraph.url, `${BASE}/c/vice`);
});

test("no path means no canonical; no description falls back to the site summary", () => {
  const m = shareMeta({ title: "GTAFanbase" });
  assert.equal(m.alternates, undefined);
  assert.equal(m.openGraph.url, undefined);
  assert.equal(m.description, SITE.summary);
});

test("extra og fields (a profile's username) are kept", () => {
  const m = shareMeta({ title: "@a", type: "profile", og: { username: "a" } });
  assert.equal(m.openGraph.type, "profile");
  assert.equal(m.openGraph.username, "a");
});

test("long text is cut on one line, with an ellipsis", () => {
  const t = shareText("word ".repeat(100), 50);
  assert.ok(t.length <= 50);
  assert.ok(t.endsWith("…"));
  assert.equal(shareText(""), "");
  assert.equal(shareText(null), "");
});

test("absoluteUrl handles paths, bare paths and full URLs", () => {
  assert.equal(absoluteUrl("/x"), `${BASE}/x`);
  assert.equal(absoluteUrl("x"), `${BASE}/x`);
  assert.equal(absoluteUrl("http://a.b/c"), "http://a.b/c");
});
