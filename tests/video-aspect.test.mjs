import test from "node:test";
import assert from "node:assert/strict";
import { aspectOf, aspectLabel, ASPECTS } from "../lib/video-aspect.js";

test("phone portrait, 16:9 landscape and square clips are told apart", () => {
  assert.equal(aspectOf(1080, 1920), "portrait");
  assert.equal(aspectOf(1920, 1080), "landscape");
  assert.equal(aspectOf(1080, 1080), "square");
  assert.ok(ASPECTS.includes(aspectOf(720, 1280)));
});

test("near-square clips count as square, not as a tiny portrait or landscape", () => {
  assert.equal(aspectOf(1000, 1030), "square");
  assert.equal(aspectOf(1030, 1000), "square");
  assert.equal(aspectOf(1000, 1100), "portrait");
  assert.equal(aspectOf(1100, 1000), "landscape");
});

test("an unreadable size gives no orientation instead of a wrong one", () => {
  assert.equal(aspectOf(0, 0), null);
  assert.equal(aspectOf(undefined, 1080), null);
  assert.equal(aspectOf("abc", "def"), null);
  assert.equal(aspectOf(-1920, 1080), null);
});

test("labels name the orientation and the common ratio when there is one", () => {
  assert.equal(aspectLabel(1920, 1080), "Landscape · 16:9");
  assert.equal(aspectLabel(1080, 1920), "Portrait · 9:16");
  assert.equal(aspectLabel(1080, 1080), "Square · 1:1");
  assert.equal(aspectLabel(1080, 1350), "Portrait · 4:5");
  assert.equal(aspectLabel(2000, 900), "Landscape");
  assert.equal(aspectLabel(0, 0), "");
});
