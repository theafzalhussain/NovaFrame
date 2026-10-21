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
  const lowEnd = memory <= 4 || (navigator.hardwareConcurrency || 8) <= 4;
  // Phones and small tablets (and anything low-end) get the light version; desktops, laptops and
  // large tablets the full one.
  return lowEnd || window.innerWidth < 1024 ? "lite" : "full";
}

function StaticArmillary() {
  return (
    <svg viewBox="0 0 400 400" className="mx-auto h-full max-h-[520px] w-full opacity-80">
      <defs>
        <radialGradient id="hc-core" cx="40%" cy="35%" r="70%">
          <stop offset="0" stopColor="#2a241c" />
          <stop offset="1" stopColor="#080706" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="70" fill="url(#hc-core)" stroke="rgba(227,200,140,0.35)" />
      {[110, 128, 146].map((r, i) => (
        <ellipse
          key={r}
          cx="200"
          cy="200"
          rx={r}
          ry={r * (0.32 + i * 0.18)}
          fill="none"
          stroke="#d4ad66"
          strokeOpacity={0.6 - i * 0.12}
          transform={`rotate(${-20 + i * 35} 200 200)`}
        />
      ))}
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
    const QUIET_MS = 1200;
    const onInput = () => (lastInput = performance.now());
    const inputs = ["pointerdown", "keydown", "wheel", "touchstart", "scroll"] as const;
    inputs.forEach((t) => window.addEventListener(t, onInput, { passive: true, capture: true }));

    const begin = () => {
      if (started || cancelled || !visible) return;
      const quietFor = performance.now() - lastInput;
      if (quietFor < QUIET_MS) {
        window.clearTimeout(retry);
        retry = window.setTimeout(() => (cancelIdle = whenIdle(begin, { afterLoad: false })), QUIET_MS - quietFor);
        return;
      }
      started = true;
      inputs.forEach((t) => window.removeEventListener(t, onInput, { capture: true }));
      import("./heroScene")
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
        cancelIdle = whenIdle(begin);
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

  if (mode === "static") {
    return (
      <div className={className} aria-hidden>
        <StaticArmillary />
      </div>
    );
  }

  return (
    <div
      ref={mountRef}
      className={cn(className, "transition-opacity duration-1000 ease-out", mode === "ready" ? "" : "!opacity-0")}
      aria-hidden
    />
  );
}
