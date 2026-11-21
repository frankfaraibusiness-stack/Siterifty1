import test from "node:test";
import assert from "node:assert/strict";

// A minimal browser: a localStorage and the window events the module uses.
const store = new Map();
let fired = 0;
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
  },
  dispatchEvent: () => {
    fired += 1;
    return true;
  },
};
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const { clearRecent, parseRecent, readRecentRaw, removeRecent, saveRecent } = await import("../lib/recent-searches.js");
const read = () => parseRecent(readRecentRaw());

test("starts empty", () => {
  assert.deepEqual(read(), []);
});

test("newest first, no duplicates (case-insensitive), moves a repeat to the front", () => {
  saveRecent("franklin");
  saveRecent("#theory");
  saveRecent("Franklin");
  assert.deepEqual(read(), ["Franklin", "#theory"]);
});

test("ignores empty and one-letter searches, trims, and caps length", () => {
  saveRecent("   ");
  saveRecent("a");
  saveRecent(`  ${"x".repeat(200)}  `);
  assert.equal(read()[0].length, 80);
  assert.ok(!read().includes("a"));
});

test("keeps at most 8", () => {
  for (let i = 0; i < 12; i += 1) saveRecent(`query ${i}`);
  assert.equal(read().length, 8);
  assert.equal(read()[0], "query 11");
});

test("remove, clear, and a change event each time", () => {
  const before = fired;
  removeRecent("query 11");
  assert.ok(!read().includes("query 11"));
  clearRecent();
  assert.deepEqual(read(), []);
  assert.equal(fired, before + 2);
});

test("junk in storage never throws", () => {
  assert.deepEqual(parseRecent("not json"), []);
  assert.deepEqual(parseRecent('{"a":1}'), []);
  assert.deepEqual(parseRecent('[1,"ok",null,"  "]'), ["ok"]);
});
