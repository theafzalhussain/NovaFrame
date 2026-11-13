/**
 * <Picture> — responsive, modern-format images.
 *
 * `scripts/images.mjs` re-encodes everything in `public/` as AVIF and WebP at a ladder of
 * widths and records them in `src/data/images.generated.json`. This component turns that
 * manifest into a <picture> element, so the browser downloads the smallest format it
 * supports at roughly the size the image will actually be displayed — rather than pulling a
 * 270 kB, 942x1670 screenshot to fill a 44px thumbnail.
 *
 * It also sets `width` and `height` from the manifest. The browser can then reserve the right
 * amount of space before the bytes arrive, which is what keeps Cumulative Layout Shift at zero.
 *
 * Anything the manifest doesn't know about — a CMS upload served from `/api/media/...`, or an
 * external URL — falls through to a plain <img>, so this is safe to use everywhere.
 */
import type { ImgHTMLAttributes } from "react";
import manifest from "../data/images.generated.json";
import { resolveMediaUrl } from "../lib/media";

type Variant = { width: number; height: number; base: string; widths: number[] };
const VARIANTS = manifest as Record<string, Variant>;

export type PictureProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet" | "width" | "height"> & {
  src?: string;
  alt: string;
  /**
   * How wide the image renders, in CSS terms — e.g. "44px" or "(min-width: 1024px) 40vw, 100vw".
   * Without this the browser assumes full viewport width and picks a file far larger than needed,
   * which defeats the point of the width ladder.
   */
  sizes?: string;
  /**
   * Set on the one image that is the page's largest contentful paint (a hero or cover shot).
   * It then loads eagerly at high priority instead of lazily.
   */
  priority?: boolean;
  /** Overrides the intrinsic dimensions from the manifest (rarely needed). */
  width?: number;
  height?: number;
};

export default function Picture({ src, alt, sizes, priority = false, width, height, ...rest }: PictureProps) {
  if (!src) return null;

  const loading = priority ? ("eager" as const) : ("lazy" as const);
  const common = {
    alt,
    loading,
    decoding: priority ? ("sync" as const) : ("async" as const),
    // `fetchPriority` moves the request ahead of the queue for the LCP image, and behind it
    // for everything else — the single most effective lever on perceived load speed.
    fetchPriority: priority ? ("high" as const) : ("auto" as const),
    sizes,
    ...rest,
  };

  const variant = VARIANTS[src];
  if (!variant) {
    // Not a build-time asset (CMS upload or remote URL): serve it as-is.
    return <img src={resolveMediaUrl(src)} width={width} height={height} {...common} />;
  }

  const srcSet = (format: "avif" | "webp") => variant.widths.map((w) => `${variant.base}-${w}.${format} ${w}w`).join(", ");

  return (
    // `display: contents` keeps <picture> from generating a box, so the <img> is laid out
    // exactly as it was before this wrapper existed (h-full, object-cover and so on all behave).
    <picture style={{ display: "contents" }}>
      <source type="image/avif" srcSet={srcSet("avif")} sizes={sizes} />
      <source type="image/webp" srcSet={srcSet("webp")} sizes={sizes} />
      <img src={src} width={width ?? variant.width} height={height ?? variant.height} {...common} />
    </picture>
  );
}

/** True when `src` has build-time AVIF/WebP variants. */
export const hasVariants = (src?: string) => Boolean(src && VARIANTS[src]);
