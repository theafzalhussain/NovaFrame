/**
 * Writes static `dist/robots.txt` and `dist/sitemap.xml` after a build.
 * -------------------------------------------------------------------
 * The Node server generates both on demand from the live database (see server/seo.ts), and
 * those dynamic routes take priority when it is serving. These files exist for the other
 * case: deploying `dist/` to a static or PHP host, where there is no Node process to ask.
 *
 * Content comes from the database when one is reachable, and from the shipped defaults when
 * it is not — so the build works on a machine with no database configured.
 *
 * Needs SITE_URL, because a sitemap has to contain absolute URLs and guessing the hostname
 * at build time would publish the wrong ones. Without it this exits quietly: nothing is
 * written, and the Node server still serves both routes correctly.
 */
import "./env.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultContent } from "../src/data/defaults.js";
import { sitemapEntries } from "../src/lib/seo.js";
import { buildRobots } from "./seo.js";
import type { SiteContent } from "../src/data/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");

const origin = /^https?:\/\//i.test(process.env.SITE_URL ?? "") ? (process.env.SITE_URL as string).replace(/\/+$/, "") : "";

if (!origin) {
  console.log(
    "\n[seo] SITE_URL is not set, so no static sitemap.xml/robots.txt were written.\n" +
      "[seo] The Node server generates both from the live database at runtime, so this only\n" +
      "[seo] matters if you deploy dist/ to a static or PHP host. Set SITE_URL to emit them.\n",
  );
  process.exit(0);
}

if (!fs.existsSync(distDir)) {
  console.warn(`[seo] No dist/ directory at ${distDir} — run \`npm run build\` first.`);
  process.exit(0);
}

/** Live content if a database answers, otherwise the shipped defaults. */
async function loadContent(): Promise<{ content: SiteContent; version?: string; source: string }> {
  try {
    const { getSiteContent } = await import("./content.js");
    const snapshot = await getSiteContent();
    // A database that exists but has never been seeded would yield empty collections.
    if (snapshot.content.collections.projects.length || snapshot.content.collections.services.length) {
      return { content: snapshot.content, version: snapshot.version, source: "database" };
    }
  } catch (err) {
    console.warn(`[seo] Could not read the database (${(err as Error).message.split("\n")[0]}).`);
  }
  return { content: defaultContent, source: "shipped defaults" };
}

const { content, version, source } = await loadContent();

const lastmod = (() => {
  if (!version) return new Date().toISOString();
  const parsed = new Date(version.includes("T") ? version : `${version.replace(" ", "T")}Z`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
})();

const entries = sitemapEntries(content, origin, lastmod);
const xml =
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  entries
    .map((e) =>
      [
        "  <url>",
        `    <loc>${e.loc}</loc>`,
        e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : "",
        `    <changefreq>${e.changefreq}</changefreq>`,
        `    <priority>${e.priority}</priority>`,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    )
    .join("\n") +
  `\n</urlset>\n`;

fs.writeFileSync(path.join(distDir, "sitemap.xml"), xml);
fs.writeFileSync(path.join(distDir, "robots.txt"), buildRobots(origin));

console.log(`\n[seo] dist/sitemap.xml  ${entries.length} URLs from ${source}, origin ${origin}`);
console.log(`[seo] dist/robots.txt   sitemap advertised at ${origin}/sitemap.xml\n`);

// Close the database handle rather than letting the process be torn down around it:
// libsql holds a native handle, and exiting on top of it trips an assertion in libuv
// on Windows ("UV_HANDLE_CLOSING"), which would look like a failed build.
try {
  const { db } = await import("./db.js");
  db.close();
} catch {
  /* no client was ever created */
}
