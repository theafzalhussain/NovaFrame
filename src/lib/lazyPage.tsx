import { lazy, useState, type ComponentType } from "react";

export type LazyPage<P> = ComponentType<P> & {
  /** Starts downloading the page's code (safe to call repeatedly). */
  preload: () => Promise<unknown>;
};

/**
 * A code-split page. Each page is its own small file that is fetched on first visit — or ahead of
 * time with `preload()` — so the first load only carries the home page. Once preloaded, the page
 * renders instantly with no loading state.
 */
export function lazyPage<P extends object>(load: () => Promise<{ default: ComponentType<P> }>): LazyPage<P> {
  let loaded: ComponentType<P> | null = null;
  let pending: Promise<{ default: ComponentType<P> }> | null = null;

  const preload = () =>
    (pending ??= load().then(
      (mod) => {
        loaded = mod.default;
        return mod;
      },
      (err: unknown) => {
        pending = null; // allow a later retry
        throw err;
      },
    ));

  const Lazy = lazy(preload);

  function Page(props: P) {
    // Decided once per mount, so a page never swaps implementations (and loses its state) mid-visit.
    const [Ready] = useState(() => loaded);
    return Ready ? <Ready {...props} /> : <Lazy {...props} />;
  }

  return Object.assign(Page, { preload });
}
