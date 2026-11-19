import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  GAMES,
  CATEGORIES,
  GIFTS,
  GIFT_ART,
  FEATURED,
  giftArtUrl,
  cleanContext,
  contextFromParams,
  contextQuery,
  filterGifts,
  formatMills,
  getGift,
  giftFxProps,
  giftMessage,
  giftQuote,
  groupPostGifts,
  HOVER_FX,
  IDLE_FX,
  rarityOf,
} from "../lib/gifts.js";

test("fees: fixed $0.10 + 5% of the gift price, in whole mills", () => {
  const q = giftQuote({ price: 1 });
  assert.deepEqual(q, { price: 1000, flat: 100, percent: 50, fee: 150, total: 1150 });
  const odd = giftQuote({ price: 0.99 }); // 5% of 990 = 49.5 -> 50
  assert.equal(odd.percent, 50);
  assert.equal(odd.total, 990 + 100 + 50);
  const big = giftQuote({ price: 99.99 });
  assert.equal(big.total, 99990 + 100 + Math.round(99990 * 0.05));
});

test("wallet and receipt amounts always show three decimals", () => {
  assert.equal(formatMills(0), "$0.000");
  assert.equal(formatMills(1150), "$1.150");
  assert.equal(formatMills(1234567), "$1,234.567");
  assert.equal(formatMills(-50), "-$0.050");
});

test("catalog: unique url-safe ids, valid games and categories, sane prices", () => {
  const ids = new Set();
  const games = new Set(GAMES.map((g) => g.id));
  const cats = new Set(CATEGORIES.map((c) => c.id));
  for (const g of GIFTS) {
    assert.match(g.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(g.id), `duplicate id ${g.id}`);
    ids.add(g.id);
    assert.ok(games.has(g.game), `${g.id}: unknown game`);
    assert.ok(cats.has(g.category), `${g.id}: unknown category`);
    assert.ok(g.price > 0 && g.price <= 100, `${g.id}: price`);
    assert.equal(Math.round(g.price * 100) / 100, g.price, `${g.id}: price has more than cents`);
    assert.ok(g.emoji && g.name && g.blurb);
  }
  assert.ok(GIFTS.length >= 100);
  for (const id of FEATURED) assert.ok(getGift(id), `featured ${id} missing`);
  // every game from GTA 1 to GTA VI has gifts
  for (const g of GAMES) assert.ok(GIFTS.some((x) => x.game === g.id), `no gifts for ${g.id}`);
});

test("rarity follows price", () => {
  assert.equal(rarityOf(0.5).id, "common");
  assert.equal(rarityOf(2.99).id, "rare");
  assert.equal(rarityOf(9.99).id, "epic");
  assert.equal(rarityOf(29.99).id, "legendary");
  assert.equal(rarityOf(30).id, "mythic");
});

test("search and filters", () => {
  assert.ok(filterGifts(GIFTS, { q: "infernus" }).some((g) => g.id === "vc-infernus"));
  const vc = filterGifts(GIFTS, { game: "vc" });
  assert.ok(vc.length > 5 && vc.every((g) => g.game === "vc"));
  const cheap = filterGifts(GIFTS, { sort: "low" });
  assert.equal(cheap[0].price, Math.min(...GIFTS.map((g) => g.price)));
  assert.equal(filterGifts(GIFTS, { q: "zzzzzz" }).length, 0);
  assert.equal(filterGifts(GIFTS, { sort: "new" })[0].game, "gta6");
  assert.equal(filterGifts(GIFTS)[0].id, FEATURED[0]);
});

test("gift destination is cleaned and survives the URL round trip", () => {
  const ctx = cleanContext({ type: "comment", to: "@lucia.ray", postId: "p1", commentId: "c1" });
  assert.deepEqual(ctx, { type: "comment", postId: "p1", commentId: "c1", to: "lucia.ray" });
  const q = contextQuery(ctx);
  const params = Object.fromEntries(new URLSearchParams(q));
  assert.deepEqual(contextFromParams(params), ctx);
  // incomplete or hostile input falls back to the plain shop
  assert.equal(cleanContext({ type: "comment", postId: "p1" }).type, "shop");
  assert.equal(cleanContext({ type: "profile", to: "a/b" }).type, "shop");
  assert.equal(cleanContext({ type: "post", postId: "../x" }).type, "shop");
  assert.equal(contextQuery({}), "");
});

test("comment gifts: split into post gifts and per-comment gifts", () => {
  const g = (id, commentId) => ({ id, commentId });
  const { post, byComment } = groupPostGifts([g("a", null), g("b", "c1"), g("c", "c1"), g("d", "c2")]);
  assert.deepEqual(post.map((x) => x.id), ["a"]);
  assert.deepEqual(byComment.get("c1").map((x) => x.id), ["b", "c"]);
  assert.equal(byComment.get("c2").length, 1);
  assert.equal(groupPostGifts(undefined).post.length, 0);
});

test("animations: every gift has its own idle + hover pair, themed where it can be", () => {
  const seen = new Map();
  for (const g of GIFTS) {
    assert.ok(IDLE_FX.includes(g.fx.idle) && HOVER_FX.includes(g.fx.hover), `${g.id}: unknown fx`);
    const key = `${g.fx.idle}|${g.fx.hover}`;
    assert.ok(!seen.has(key), `${g.id} shares its animation with ${seen.get(key)}`);
    seen.set(key, g.id);
    assert.ok(g.fx.dur >= 2.4 && g.fx.dur <= 4.8);
  }
  assert.equal(getGift("vc-infernus").fx.idle, "slide"); // a sports car slides
  assert.equal(getGift("g6-gator").fx.idle, "hop");
  assert.equal(getGift("fan-fire").fx.idle, "flicker");
  const p = giftFxProps("vc-infernus");
  assert.match(p.className, /^gf-fx fx-i-slide fx-h-/);
  assert.match(p.style["--fd"], /s$/);
  assert.ok(giftFxProps("nope").className.includes("fx-i-bob")); // unknown id still safe
});

test("default message: used only when the sender wrote nothing, and is stable", () => {
  const own = giftMessage("vc-infernus", "  Happy birthday!  ", "r1");
  assert.deepEqual(own, { text: "Happy birthday!", auto: false });
  const a = giftMessage("vc-infernus", "", "r1");
  assert.equal(a.auto, true);
  assert.ok(a.text.length > 5);
  assert.deepEqual(giftMessage("vc-infernus", "   ", "r1"), a); // same gift + receipt, same line
  assert.ok(giftMessage("not-a-gift", "", "x").text); // never empty
});

test("gift artwork: every entry points at a real gift and a real file", () => {
  for (const [id, url] of Object.entries(GIFT_ART)) {
    assert.ok(getGift(id), `GIFT_ART has an unknown gift id: ${id}`);
    assert.match(url, /^\/gifts\/art\/[a-z0-9-]+\.(webp|png|svg)$/, `${id}: art path`);
    const file = fileURLToPath(new URL(`../public${url}`, import.meta.url));
    assert.ok(existsSync(file), `${id}: missing file public${url}`);
    assert.equal(getGift(id).art, url);
    assert.equal(giftArtUrl(id), url);
  }
  // gifts without artwork fall back to their emoji
  for (const g of GIFTS) if (!GIFT_ART[g.id]) assert.equal(g.art, null);
  assert.equal(giftArtUrl("nope"), null);
});
