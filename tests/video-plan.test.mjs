import test from "node:test";
import assert from "node:assert/strict";
import { planCompression, TIERS } from "../lib/video-plan.js";

const MB = 1048576;

test("a short 1080p landscape clip drops to 720p at the top tier", () => {
  const p = planCompression({ width: 1920, height: 1080, duration: 20 });
  assert.equal(p.height, 720);
  assert.equal(p.width, 1280);
  assert.equal(p.bitrate, TIERS[0].bps);
  assert.ok(p.scaled);
});

test("portrait phone video is limited by its short side, not its height", () => {
  const p = planCompression({ width: 1080, height: 1920, duration: 15 });
  assert.equal(p.width, 720);
  assert.equal(p.height, 1280);
});

test("never upscales and lowers the bitrate for small sources", () => {
  const p = planCompression({ width: 640, height: 360, duration: 10 });
  assert.equal(p.width, 640);
  assert.equal(p.height, 360);
  assert.ok(!p.scaled);
  assert.ok(p.bitrate < TIERS[0].bps);
});

test("dimensions are always even (H.264 needs it)", () => {
  const p = planCompression({ width: 1081, height: 1919, duration: 10 });
  assert.equal(p.width % 2, 0);
  assert.equal(p.height % 2, 0);
});

test("longer clips start at a smaller tier", () => {
  const long = planCompression({ width: 1920, height: 1080, duration: 170 });
  const short = planCompression({ width: 1920, height: 1080, duration: 20 });
  assert.ok(long.height < short.height);
  assert.ok(long.bitrate < short.bitrate);
});

test("the result always fits the size budget", () => {
  for (const duration of [5, 15, 30, 60, 120, 180]) {
    const maxBytes = 40 * MB;
    const p = planCompression({ width: 3840, height: 2160, duration }, { maxBytes });
    const bytes = ((p.bitrate + 64_000) * duration) / 8;
    assert.ok(bytes <= maxBytes, `${duration}s -> ${(bytes / MB).toFixed(1)} MB`);
  }
});

test("a tight budget falls through to lower tiers", () => {
  const roomy = planCompression({ width: 1920, height: 1080, duration: 120 }, { maxBytes: 40 * MB });
  const tight = planCompression({ width: 1920, height: 1080, duration: 120 }, { maxBytes: 6 * MB });
  assert.ok(tight.height < roomy.height);
});

test("60fps sources are capped to 30fps; 30fps and below are left alone", () => {
  assert.equal(planCompression({ width: 1280, height: 720, duration: 10, fps: 60 }).frameRate, 30);
  assert.equal(planCompression({ width: 1280, height: 720, duration: 10, fps: 29.97 }).frameRate, undefined);
  assert.equal(planCompression({ width: 1280, height: 720, duration: 10 }).frameRate, undefined);
});
