import { useCallback } from "react";

/*
 * Looping decorative animations (marquees, live-status pulses, gold shimmer, the animated card
 * border) keep the browser producing frames even when they are scrolled out of sight — on a phone
 * that alone kept the main thread busy full-time. One shared observer marks such elements with
 * `data-offscreen`, and the stylesheet pauses every animation inside them while it is set.
 */
let observer: IntersectionObserver | null = null;

function getObserver() {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) entry.target.toggleAttribute("data-offscreen", !entry.isIntersecting);
    },
    { rootMargin: "80px 0px" },
  );
  return observer;
}

/** Callback ref: `<section ref={usePauseOffscreen()}>` pauses the section's animations while off screen. */
export function usePauseOffscreen<T extends Element = HTMLElement>() {
  return useCallback((el: T | null) => {
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = getObserver();
    io.observe(el);
    return () => {
      io.unobserve(el);
      el.removeAttribute("data-offscreen");
    };
  }, []);
}
