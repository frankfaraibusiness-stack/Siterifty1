// Makes the phone's Back button (or the browser's) CLOSE an overlay instead of
// leaving the page. Pure (the window is passed in), so it can be tested; the
// React hook around it is lib/use-back-close.js.
//
// Opening adds one history entry marked with this overlay's id. Back pops it,
// which fires "popstate", which closes the overlay. Closing by the screen's own
// button / Escape / tapping outside steps back out of that entry the same way,
// so the history never keeps a stale step.
//
// Details that matter:
//  - The entry is added one tick later, so React Strict Mode's mount/unmount/
//    mount in development adds one entry, not two.
//  - Next.js keeps its own data on the current history entry, so we copy it
//    instead of replacing it (otherwise going Back/Forward would reload the page).
//  - With overlays on top of each other, Back only closes the top one: an
//    overlay stays open while its own entry is still the current one.

const KEY = "ov";
let counter = 0;

export function startBackClose(win, onClose) {
  const h = win.history;
  const id = ++counter;
  let live = true;
  let marked = false;

  const timer = win.setTimeout(() => {
    try {
      h.pushState({ ...(h.state || {}), [KEY]: id }, "");
      marked = true;
    } catch {
      // No history access: Back just leaves the page, as it always did.
    }
  }, 0);

  const onPop = () => {
    if (!marked || h.state?.[KEY] === id) return; // somebody else's step, or ours is still here
    marked = false;
    if (live) onClose();
  };
  win.addEventListener("popstate", onPop);

  return {
    close() {
      if (marked && h.state?.[KEY] === id) h.back(); // popstate then closes it
      else onClose();
    },
    dispose() {
      live = false;
      win.clearTimeout(timer);
      win.removeEventListener("popstate", onPop);
    },
  };
}
