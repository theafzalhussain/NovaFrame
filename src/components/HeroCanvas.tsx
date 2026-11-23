import { useEffect, useRef, useState } from "react";
import { prefersLowData, whenIdle } from "../lib/idle";
import { cn } from "../utils/cn";
import type { HeroQuality } from "./heroScene";

type Nav = Navigator & { deviceMemory?: number };

/** Which version of the scene this device should get; null = static artwork, no WebGL. */
function pickQuality(): HeroQuality | null {
  if (prefersLowData()) return null; // Data Saver / 2G: skip the 3D engine download entirely
  const memory = (navigator as Nav).deviceMemory ?? 8;
  if (memory <= 2) return null;
  // Phones and small tablets get the static artwork. There the scene sits at 45% opacity behind the
  // headline, yet building and running it cost a mid-range phone about 1.5 s of blocked main thread
  // (Lighthouse mobile: Total Blocking Time ~2 s with it, ~0.5 s without).
  if (window.innerWidth < 1024) return null;
  const lowEnd = memory <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  // Low-end laptops and large tablets get the light version; everything else the full one.
  return lowEnd ? "lite" : "full";
}

function StaticArmillary() {
  // Instant, dependency-free stand-in for the WebGL scene: painted on the first frame and gently
  // animated, so the hero is never empty while three.js loads. It cross-fades into the live scene.
  const rings = [
    { rx: 118, ry: 38, rot: -22, dur: 46, o: 0.7 },
    { rx: 138, ry: 74, rot: 18, dur: 62, o: 0.5 },
    { rx: 156, ry: 112, rot: 62, dur: 80, o: 0.36 },
  ];
  return (
    <svg viewBox="0 0 400 400" className="mx-auto h-full max-h-[760px] w-full">
      <defs>
        <radialGradient id="hc-core" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#4a4034" />
          <stop offset="0.35" stopColor="#1a1612" />
          <stop offset="1" stopColor="#060504" />
        </radialGradient>
        <radialGradient id="hc-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#e8c88c" stopOpacity="0.32" />
          <stop offset="1" stopColor="#d4ad66" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hc-atmo" cx="50%" cy="50%" r="50%">
          <stop offset="0.78" stopColor="#e8c88c" stopOpacity="0" />
          <stop offset="0.82" stopColor="#e8c88c" stopOpacity="0.34" />
          <stop offset="1" stopColor="#e8c88c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hc-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f2d697" />
          <stop offset="0.5" stopColor="#c99a52" />
          <stop offset="1" stopColor="#7a5628" />
        </linearGradient>
      </defs>
      <circle cx="200" cy="200" r="190" fill="url(#hc-halo)" />
      {rings.map((r, i) => (
        <g key={i} transform={`rotate(${r.rot} 200 200)`}>
          <ellipse cx="200" cy="200" rx={r.rx} ry={r.ry} fill="none" stroke="url(#hc-gold)" strokeWidth={2.2 - i * 0.5} strokeOpacity={r.o}>
            <animateTransform attributeName="transform" type="rotate" from="0 200 200" to={i % 2 ? "-360 200 200" : "360 200 200"} dur={`${r.dur}s`} repeatCount="indefinite" />
          </ellipse>
        </g>
      ))}
      <circle cx="200" cy="200" r="86" fill="url(#hc-atmo)" />
      <circle cx="200" cy="200" r="68" fill="url(#hc-core)" stroke="rgba(227,200,140,0.4)" strokeWidth="1" />
      <ellipse cx="180" cy="172" rx="16" ry="9" fill="#fff" opacity="0.16" transform="rotate(-30 180 172)" />
    </svg>
  );
}
/**
 * "The Armillary" hero centrepiece. three.js and the scene are loaded on demand once the page is
 * idle, then the canvas fades in. Devices with Data Saver or very little memory get static art.
 */
export default function HeroCanvas({ className }: { className?: string }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "static">("loading");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const quality = pickQuality();
    if (!quality) {
      setMode("static");
      return;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cleanup: (() => void) | undefined;
    let cancelled = false;
    let started = false;
    let visible = false;
    let lastInput = 0;
    let cancelIdle = () => {};
    let retry = 0;

    // Building the scene costs a moment of main-thread time (on Windows the first-ever shader compile
    // can take a second or two), so it only starts when the hero is on screen, the page has loaded and
    // gone idle, and the visitor hasn't tapped, clicked, typed or scrolled for a little while.
    const QUIET_MS = 150;
    // On top of that, give the page a few seconds after `load`: the scene compiles shaders and
    // builds geometry in long main-thread tasks, and on a mid-range phone starting it straight
    // after load froze the first taps and pushed Total Blocking Time to several seconds.
    const SETTLE_MS = quality === "lite" ? 600 : 0;
    // Fetch the 3D chunk right away (in parallel with the page) so it is ready when the scene starts.
    const scenePromise = import("./heroScene");
    scenePromise
      .then((m) => {
        if (quality === "full") void m.prewarmEnvironment();
      })
      .catch(() => {});
    const onInput = () => (lastInput = performance.now());
    const inputs = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    inputs.forEach((t) => window.addEventListener(t, onInput, { passive: true, capture: true }));

    const begin = () => {
      if (started || cancelled || !visible) return;
      const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      const now = performance.now();
      const wait = Math.max(QUIET_MS - (now - lastInput), (nav?.loadEventEnd || now) + SETTLE_MS - now);
      if (wait > 0) {
        window.clearTimeout(retry);
        retry = window.setTimeout(() => (cancelIdle = whenIdle(begin, { afterLoad: false, timeout: 300 })), wait);
        return;
      }
      started = true;
      inputs.forEach((t) => window.removeEventListener(t, onInput, { capture: true }));
      scenePromise
        .then(({ createHeroScene }) => {
          if (cancelled) return;
          cleanup = createHeroScene(mount, {
            quality,
            reduced,
            onReady: () => !cancelled && setMode("ready"),
            onFail: () => !cancelled && setMode("static"),
          });
        })
        .catch(() => !cancelled && setMode("static"));
    };

    const io = new IntersectionObserver((entries) => {
      visible = Boolean(entries[0]?.isIntersecting);
      if (visible && !started) {
        cancelIdle();
        cancelIdle = whenIdle(begin, { afterLoad: false, timeout: 300 });
      }
    });
    io.observe(mount);

    return () => {
      cancelled = true;
      io.disconnect();
      cancelIdle();
      window.clearTimeout(retry);
      inputs.forEach((t) => window.removeEventListener(t, onInput, { capture: true }));
      cleanup?.();
    };
  }, []);

  return (
    <div className={cn(className, "relative")} aria-hidden>
      <div className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-out", mode === "ready" ? "opacity-0" : "opacity-100")}>
        <StaticArmillary />
      </div>
      <div ref={mountRef} className={cn("absolute inset-0 transition-opacity duration-[1400ms] ease-out", mode === "ready" ? "opacity-100" : "opacity-0")} />
    </div>
  );
}
