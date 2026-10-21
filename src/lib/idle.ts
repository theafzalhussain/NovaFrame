type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
  cancelIdleCallback?: (id: number) => void;
};

/**
 * Runs `fn` once the page has finished loading and the main thread is idle, so optional
 * work (3D scene, prefetching other pages) never competes with first paint or first taps.
 * Returns a cancel function.
 */
export function whenIdle(fn: () => void, { timeout = 1500, afterLoad = true }: { timeout?: number; afterLoad?: boolean } = {}) {
  const w = window as IdleWindow;
  let cancel = () => {};
  const schedule = () => {
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(fn, { timeout });
      cancel = () => w.cancelIdleCallback?.(id);
    } else {
      const id = window.setTimeout(fn, 300);
      cancel = () => window.clearTimeout(id);
    }
  };
  if (!afterLoad || document.readyState === "complete") schedule();
  else {
    window.addEventListener("load", schedule, { once: true });
    cancel = () => window.removeEventListener("load", schedule);
  }
  return () => cancel();
}

type NetInfo = { saveData?: boolean; effectiveType?: string };

/** True when the visitor asked to save data or is on a very slow connection. */
export function prefersLowData() {
  const connection = (navigator as Navigator & { connection?: NetInfo }).connection;
  return Boolean(connection?.saveData) || /(^|-)2g$/.test(connection?.effectiveType ?? "");
}
