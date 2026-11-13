/**
 * Keeps <head> in step with the current route.
 *
 * The server already ships correct tags in the initial HTML (see server/seo.ts), so this
 * hook exists for everything that happens afterwards: in-app navigation, and content that
 * arrives from the API after first paint. Tags are updated in place rather than removed and
 * re-added, so there is no moment where the document has no title or no canonical URL.
 */
import { useEffect } from "react";
import { resolveMeta, type PageMeta } from "./seo";
import type { SiteContent } from "../data/types";

/** Marks the elements this module owns, so a stale tag is never left behind. */
const OWNED = "data-wx-seo";
const JSONLD_ID = "wx-jsonld";

function upsertMeta(key: "name" | "property", value: string, content: string) {
  const selector = `meta[${key}="${CSS.escape(value)}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(key, value);
    el.setAttribute(OWNED, "");
    document.head.appendChild(el);
  }
  if (el.content !== content) el.content = content;
}

function removeMeta(key: "name" | "property", value: string) {
  document.head.querySelector(`meta[${key}="${CSS.escape(value)}"][${OWNED}]`)?.remove();
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    el.setAttribute(OWNED, "");
    document.head.appendChild(el);
  }
  if (el.href !== href) el.href = href;
}

/** Writes one resolved page's metadata into the document head. */
export function applyMeta(meta: PageMeta) {
  if (document.title !== meta.title) document.title = meta.title;

  upsertMeta("name", "description", meta.description);
  upsertMeta("name", "robots", meta.robots);
  upsertLink("canonical", meta.canonical);

  upsertMeta("property", "og:title", meta.title);
  upsertMeta("property", "og:description", meta.description);
  upsertMeta("property", "og:url", meta.canonical);
  upsertMeta("property", "og:type", meta.ogType);
  upsertMeta("property", "og:locale", "en_IN");

  upsertMeta("name", "twitter:card", meta.image ? "summary_large_image" : "summary");
  upsertMeta("name", "twitter:title", meta.title);
  upsertMeta("name", "twitter:description", meta.description);

  if (meta.image) {
    upsertMeta("property", "og:image", meta.image);
    upsertMeta("name", "twitter:image", meta.image);
    if (meta.imageAlt) {
      upsertMeta("property", "og:image:alt", meta.imageAlt);
      upsertMeta("name", "twitter:image:alt", meta.imageAlt);
    }
  } else {
    removeMeta("property", "og:image");
    removeMeta("name", "twitter:image");
  }

  // Article timestamps only make sense on articles — drop them elsewhere.
  if (meta.ogType === "article" && meta.publishedTime) {
    upsertMeta("property", "article:published_time", meta.publishedTime);
  } else {
    removeMeta("property", "article:published_time");
  }

  // One JSON-LD graph per page, replaced wholesale. Parsers accept a @graph array,
  // so a single script tag is both valid and easier to keep clean than many.
  let script = document.getElementById(JSONLD_ID) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.id = JSONLD_ID;
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }
  const graph = JSON.stringify({ "@context": "https://schema.org", "@graph": meta.jsonLd });
  if (script.textContent !== graph) script.textContent = graph;
}

/**
 * Resolves metadata for `path` against the live content and applies it.
 * Re-runs when the route changes or when the CMS content is refreshed.
 */
export function useSeo(path: string, content: SiteContent) {
  useEffect(() => {
    // The server renders against the real origin; in the browser it is always the current one.
    const meta = resolveMeta({ path, content, origin: window.location.origin });
    applyMeta(meta);
  }, [path, content]);
}
