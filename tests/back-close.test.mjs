import test from "node:test";
import assert from "node:assert/strict";
import { startBackClose } from "../lib/back-close.js";

// A tiny browser: window + history with a stack, Back that fires popstate later.
function fakeWindow() {
  const listeners = new Set();
  const stack = [{ state: { __NA: true }, url: "/p/1" }];
  let i = 0;
  const win = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (t) => clearTimeout(t),
    addEventListener: (type, fn) => type === "popstate" && listeners.add(fn),
    removeEventListener: (type, fn) => type === "popstate" && listeners.delete(fn),
    history: {
      get state() { return stack[i].state; },
      pushState(state) { stack.splice(i + 1); stack.push({ state }); i++; },
      back() { if (i === 0) return; queueMicrotask(() => { i--; [...listeners].forEach((fn) => fn({})); }); },
    },
    depth: () => i,
  };
  return win;
}
const tick = () => new Promise((r) => setTimeout(r, 5));

test("opening adds one entry that keeps Next's own state; closing removes it", async () => {
  const win = fakeWindow();
  let closed = 0;
  const ov = startBackClose(win, () => closed++);
  await tick();
  assert.equal(win.depth(), 1);
  assert.equal(win.history.state.__NA, true);
  ov.close();
  await tick();
  assert.equal(closed, 1);
  assert.equal(win.depth(), 0);
});

test("the phone's Back button closes the overlay and stays on the page", async () => {
  const win = fakeWindow();
  let closed = 0;
  startBackClose(win, () => closed++);
  await tick();
  win.history.back(); // the hardware Back button
  await tick();
  assert.equal(closed, 1);
  assert.equal(win.depth(), 0); // back on the post, not before it
});

test("Strict Mode (mount, unmount, mount) adds a single entry", async () => {
  const win = fakeWindow();
  let closed = 0;
  startBackClose(win, () => closed++).dispose();
  const ov = startBackClose(win, () => closed++);
  await tick();
  assert.equal(win.depth(), 1);
  ov.close();
  await tick();
  assert.equal(closed, 1);
  assert.equal(win.depth(), 0);
});

test("closing before the entry exists just closes", async () => {
  const win = fakeWindow();
  let closed = 0;
  const ov = startBackClose(win, () => closed++);
  ov.close();
  assert.equal(closed, 1);
  ov.dispose();
  await tick();
  assert.equal(win.depth(), 0);
});

test("overlays on top of each other: Back closes only the top one", async () => {
  const win = fakeWindow();
  const log = [];
  startBackClose(win, () => log.push("A"));
  await tick();
  startBackClose(win, () => log.push("B"));
  await tick();
  assert.equal(win.depth(), 2);
  win.history.back();
  await tick();
  assert.deepEqual(log, ["B"]);
  win.history.back();
  await tick();
  assert.deepEqual(log, ["B", "A"]);
});

test("a disposed overlay ignores Back", async () => {
  const win = fakeWindow();
  let closed = 0;
  const ov = startBackClose(win, () => closed++);
  await tick();
  ov.dispose();
  win.history.back();
  await tick();
  assert.equal(closed, 0);
});
