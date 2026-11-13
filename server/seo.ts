/**
 * Server-rendered SEO
 * -------------------
 * This is a client-rendered app, so the HTML it ships is an empty shell. Googlebot will
 * run the JavaScript eventually, but plenty of things that matter never do: Twitter,
 * LinkedIn, WhatsApp and Slack link previews, Bing and smaller crawlers, and AI crawlers.
 * They read the raw HTML once and move on.
 *
 * So before `index.html` goes out, the tags between the `<!-- seo:start -->` and
 * `<!-- seo:end -->` markers are swapped for ones resolved from the request path —
 * title, description, canonical, Open Graph, Twitter card and JSON-LD — using exactly the
 * same `resolveMeta()` the browser uses. A `<noscript>` summary with the page heading and
 * the main internal links is appended too, so a crawler that never runs JS still has text
 * to read and links to follow.
 *
 * `/sitemap.xml` and `/robots.txt` are generated from the live database, so a new case
 * study or article is listed the moment it is published.
 */
import fs from "node:fs";
import path from "node:path";
import { getSiteContent } from "./content.js";
import { canonicalPath, isIndexable, resolveMeta, sitemapEntries, type PageMeta } from "../src/lib/seo.js";

const MARKER_START = "<!-- seo:start -->";
const MARKER_END = "<!-- seo:end -->";

/** Escapes text going into an HTML attribute or a text node. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * `</script>` inside JSON-LD would close the script element early; escaping the slash
 * keeps the JSON valid while making it impossible to break out of the tag.
 */
function escJsonLd(json: string): string {
  return json.replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");
}

/* ------------------------------------------------------------------ */
/* Request origin                                                     */
/* ------------------------------------------------------------------ */
const CONFIGURED_ORIGIN = /^https?:\/\//i.test(process.env.SITE_URL ?? "")
  ? (process.env.SITE_URL as string).replace(/\/+$/, "")
  : "";

/**
 * The absolute origin to build canonical URLs from.
 *
 * `SITE_URL` wins when set, which is what you want in production: it pins every canonical
 * URL to one hostname, so requests arriving via a platform subdomain
 * (`*.onrender.com`) or a bare-vs-www mismatch can't create duplicate URLs for one page.
 * Falling back to the request's own host keeps local development and previews working.
 */
export function originFor(req: { headers: Record<string, unknown>; protocol?: string }): string {
  if (CONFIGURED_ORIGIN) return CONFIGURED_ORIGIN;
  const forwardedHost = String(req.headers["x-forwarded-host"] ?? "").split(",")[0].trim();
  const host = forwardedHost || String(req.headers.host ?? "").trim();
  if (!host) return "";
  const forwardedProto = String(req.headers["x-forwarded-proto"] ?? "").split(",")[0].trim();
  const proto = forwardedProto || req.protocol || (/^localhost(:|$)|^127\./.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/* ------------------------------------------------------------------ */
/* HTML template                                                      */
/* ------------------------------------------------------------------ */
type Template = { head: string; tail: string; whole: string; mtimeMs: number } | null;
let template: Template = null;

/**
 * Loads `dist/index.html` and splits it at the markers so each request only has to
 * concatenate three strings. Re-read when the file changes, so a rebuild is picked up
 * without restarting the server.
 */
function loadTemplate(indexPath: string): Template {
  let mtimeMs = 0;
  try {
    mtimeMs = fs.statSync(indexPath).mtimeMs;
  } catch {
    return null;
  }
  if (template && template.mtimeMs === mtimeMs) return template;

  let html: string;
  try {
    html = fs.readFileSync(indexPath, "utf8");
  } catch {
    return null;
  }
  const start = html.indexOf(MARKER_START);
  const end = html.indexOf(MARKER_END);
  if (start === -1 || end === -1 || end < start) {
    console.warn(`[seo] ${path.basename(indexPath)} has no ${MARKER_START} / ${MARKER_END} markers — serving it unchanged.`);
    template = { head: "", tail: "", whole: html, mtimeMs };
    return template;
  }
  template = {
    head: html.slice(0, start),
    tail: html.slice(end + MARKER_END.length),
    whole: html,
    mtimeMs,
  };
  return template;
}

/** The `<head>` tags for one page. */
export function metaTags(meta: PageMeta): string {
  const tags: string[] = [
    `<title>${esc(meta.title)}</title>`,
    `<meta name="description" content="${esc(meta.description)}" />`,
    `<link rel="canonical" href="${esc(meta.canonical)}" />`,
    `<meta name="robots" content="${esc(meta.robots)}" />`,
    `<meta property="og:site_name" content="WebXstudio" />`,
    `<meta property="og:title" content="${esc(meta.title)}" />`,
    `<meta property="og:description" content="${esc(meta.description)}" />`,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`,
    `<meta property="og:type" content="${meta.ogType}" />`,
    `<meta property="og:locale" content="en_IN" />`,
    `<meta name="twitter:card" content="${meta.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${esc(meta.title)}" />`,
    `<meta name="twitter:description" content="${esc(meta.description)}" />`,
  ];
  if (meta.image) {
    tags.push(`<meta property="og:image" content="${esc(meta.image)}" />`);
    tags.push(`<meta name="twitter:image" content="${esc(meta.image)}" />`);
    if (meta.imageAlt) {
      tags.push(`<meta property="og:image:alt" content="${esc(meta.imageAlt)}" />`);
      tags.push(`<meta name="twitter:image:alt" content="${esc(meta.imageAlt)}" />`);
    }
  }
  if (meta.ogType === "article" && meta.publishedTime) {
    tags.push(`<meta property="article:published_time" content="${esc(meta.publishedTime)}" />`);
  }
  tags.push(
    `<script type="application/ld+json" id="wx-jsonld">${escJsonLd(
      JSON.stringify({ "@context": "https://schema.org", "@graph": meta.jsonLd }),
    )}</script>`,
  );
  return tags.join("\n    ");
}

/**
 * A text-and-links summary for crawlers that never execute JavaScript. Inside `<noscript>`,
 * so a normal visitor never sees it and it cannot flash before React renders.
 */
function noscriptBlock(meta: PageMeta, links: { label: string; path: string }[]): string {
  const crumbs = meta.breadcrumbs.map((c) => `<a href="${esc(c.path)}">${esc(c.name)}</a>`).join(" / ");
  const nav = links.map((l) => `<li><a href="${esc(l.path)}">${esc(l.label)}</a></li>`).join("");
  return `<noscript><div><nav>${crumbs}</nav><h1>${esc(meta.heading)}</h1><p>${esc(
    meta.description,
  )}</p><nav><ul>${nav}</ul></nav></div></noscript>`;
}

/**
 * Builds the HTML for one request: the shell, with this page's SEO tags in the head and a
 * no-JavaScript summary in the body. Returns null when there is no build to serve.
 *
 * `status` is 404 for a path that matches no page or no content slug, so a crawler drops
 * the URL instead of indexing the "page not found" screen as a real page. The body is
 * still the full app, so a visitor who mistypes a URL gets the normal site, not a dead end.
 */
export async function renderHtml(
  indexPath: string,
  pathname: string,
  origin: string,
): Promise<{ html: string; status: number } | null> {
  const tpl = loadTemplate(indexPath);
  if (!tpl) return null;
  if (!tpl.head && !tpl.tail) return { html: tpl.whole, status: 200 };

  const { content } = await getSiteContent();
  const meta = resolveMeta({ path: pathname, content, origin });

  // The handful of links worth exposing to a crawler on every page.
  const links = [
    { label: "Services", path: "/services" },
    { label: "Work", path: "/work" },
    { label: "Pricing", path: "/pricing" },
    { label: "The Studio", path: "/studio" },
    { label: "Insights", path: "/insights" },
    { label: "Contact", path: "/contact" },
    ...content.collections.services.slice(0, 8).map((s) => ({ label: s.title, path: `/services/${s.id}` })),
    ...content.collections.projects.slice(0, 8).map((p) => ({ label: p.title, path: `/work/${p.id}` })),
  ];

  const body = tpl.tail.replace("</body>", `${noscriptBlock(meta, links)}</body>`);
  return { html: `${tpl.head}${metaTags(meta)}${body}`, status: meta.found ? 200 : 404 };
}

/* ------------------------------------------------------------------ */
/* sitemap.xml                                                        */
/* ------------------------------------------------------------------ */
/** `<lastmod>` must be a W3C date; the database stores "YYYY-MM-DD HH:MM:SS" in UTC. */
function w3cDate(value?: string): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value.includes("T") ? value : `${value.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export async function buildSitemap(origin: string): Promise<string> {
  const { content, version, updatedAt } = await getSiteContent();
  const fallback = w3cDate(version);
  const entries = sitemapEntries(content, origin, fallback);

  const urls = entries
    .map((entry) => {
      // Prefer the item's own timestamp over the site-wide one, so republishing one
      // article doesn't tell crawlers that every page changed.
      const slug = entry.loc.slice(origin.length);
      const [, collection, id] = slug.split("/");
      const map =
        collection === "work" ? updatedAt.projects : collection === "services" ? updatedAt.services : collection === "insights" ? updatedAt.insights : undefined;
      const lastmod = w3cDate(id && map ? map[id] : undefined) ?? entry.lastmod ?? fallback;
      return [
        "  <url>",
        `    <loc>${esc(entry.loc)}</loc>`,
        lastmod ? `    <lastmod>${lastmod}</lastmod>` : "",
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

/* ------------------------------------------------------------------ */
/* robots.txt                                                         */
/* ------------------------------------------------------------------ */
export function buildRobots(origin: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    // Private areas and anything that would waste crawl budget or create duplicates.
    "Disallow: /admin",
    "Disallow: /portal",
    "Disallow: /partner",
    "Disallow: /confirmation",
    "Disallow: /pay",
    "Disallow: /api/",
    "Disallow: /*?ref=",
    "",
    // Crawl-delay is ignored by Google but respected by several others.
    "User-agent: AhrefsBot",
    "Crawl-delay: 10",
    "",
    "User-agent: SemrushBot",
    "Crawl-delay: 10",
    "",
    origin ? `Sitemap: ${origin}/sitemap.xml` : "",
    "",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

export { canonicalPath, isIndexable };
