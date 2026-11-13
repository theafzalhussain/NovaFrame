/**
 * SEO self-check
 * --------------
 * Crawls every route against a running server and reports anything that would hurt the site
 * in search: a missing or duplicate title, a description outside the length Google renders,
 * a canonical URL pointing at the wrong address, invalid JSON-LD, or a dead URL listed in
 * the sitemap.
 *
 * Run it after changing routes, page copy or content:
 *
 *   npm run build && npm run start:prod      # in one terminal
 *   npm run seo:check                        # in another
 *
 * Point it elsewhere with an argument or SEO_CHECK_URL:
 *   npm run seo:check -- https://webxstudio.me
 *
 * Exits non-zero when something is wrong, so it can gate a deploy.
 */
const BASE = (process.argv[2] || process.env.SEO_CHECK_URL || "http://localhost:4000").replace(/\/+$/, "");

/** Google renders roughly this much of a title and description. */
const TITLE_SOFT = 62;
const DESC_MIN = 70;
const DESC_SOFT = 158;
const DESC_HARD = 168;

const pick = (html, re) => html.match(re)?.[1] ?? null;
const decode = (s) =>
  (s ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

const errors = [];
const warnings = [];
const fail = (route, message) => errors.push(`${route}: ${message}`);
const warn = (route, message) => warnings.push(`${route}: ${message}`);

let content;
try {
  const res = await fetch(`${BASE}/api/content`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  content = (await res.json()).data;
} catch (err) {
  console.error(`\nCould not reach ${BASE}/api/content — is the server running?\n  ${err.message}\n`);
  process.exit(1);
}

const routes = [
  "/",
  "/services",
  "/work",
  "/pricing",
  "/studio",
  "/tech-stack",
  "/insights",
  "/contact",
  "/book",
  "/earn",
  "/privacy",
  "/terms",
  "/sitemap",
  ...content.collections.services.map((s) => `/services/${s.id}`),
  ...content.collections.projects.map((p) => `/work/${p.id}`),
  ...content.collections.insights.map((a) => `/insights/${a.id}`),
];
const privateRoutes = ["/admin", "/portal", "/partner", "/pay", "/confirmation"];
const shouldBe404 = ["/no-such-page", "/work/no-such-project", "/a/b/c"];

const seenTitle = new Map();
const seenDesc = new Map();
const rows = [];

async function inspect(route) {
  const res = await fetch(`${BASE}${route}`);
  const html = await res.text();
  const title = decode(pick(html, /<title>([^<]*)<\/title>/));
  const desc = decode(pick(html, /<meta name="description" content="([^"]*)"/));
  const canonical = decode(pick(html, /<link rel="canonical" href="([^"]*)"/));
  const robots = decode(pick(html, /<meta name="robots" content="([^"]*)"/));
  const ogTitle = decode(pick(html, /<meta property="og:title" content="([^"]*)"/));
  const ogImage = decode(pick(html, /<meta property="og:image" content="([^"]*)"/));
  const jsonld = pick(html, /<script type="application\/ld\+json" id="wx-jsonld">([\s\S]*?)<\/script>/);

  let graph = [];
  try {
    graph = JSON.parse(jsonld ?? "null")?.["@graph"] ?? [];
  } catch {
    fail(route, "JSON-LD is not valid JSON");
  }

  return { route, status: res.status, title, desc, canonical, robots, ogTitle, ogImage, graph, html };
}

console.log(`\nChecking ${BASE} — ${routes.length} public routes\n`);

for (const route of routes) {
  const page = await inspect(route);
  const { title, desc, canonical, robots, graph } = page;

  if (page.status !== 200) fail(route, `expected HTTP 200, got ${page.status}`);
  if (!title) fail(route, "no <title>");
  if (!desc) fail(route, "no meta description");
  if (!canonical) fail(route, "no canonical link");
  if (!robots?.startsWith("index")) fail(route, `should be indexable but robots is "${robots}"`);
  if (!graph.length) fail(route, "no JSON-LD");
  if (!page.ogTitle) fail(route, "no og:title");
  if (!page.ogImage) warn(route, "no og:image — link previews will have no picture");
  if (!/<noscript>/.test(page.html)) warn(route, "no <noscript> fallback for crawlers without JS");

  if (canonical && canonical !== `${BASE}${route}` && !(route === "/" && canonical === `${BASE}/`)) {
    fail(route, `canonical points at ${canonical}`);
  }
  if (title && title.length > TITLE_SOFT + 24) warn(route, `title is ${title.length} chars (long)`);
  if (desc && desc.length > DESC_HARD) fail(route, `description is ${desc.length} chars (over ${DESC_HARD})`);
  else if (desc && desc.length > DESC_SOFT) warn(route, `description is ${desc.length} chars (Google clips near ${DESC_SOFT})`);
  if (desc && desc.length < DESC_MIN) warn(route, `description is only ${desc.length} chars (under-using the snippet)`);
  if (desc && /…$/.test(desc)) warn(route, "description was cut off mid-sentence");
  if (title && /undefined|NaN|\[object/.test(title)) fail(route, `title contains a placeholder: "${title}"`);
  if (desc && /undefined|NaN|\[object/.test(desc)) fail(route, "description contains a placeholder");

  if (seenTitle.has(title)) fail(route, `duplicate title, same as ${seenTitle.get(title)}`);
  else seenTitle.set(title, route);
  if (seenDesc.has(desc)) fail(route, `duplicate description, same as ${seenDesc.get(desc)}`);
  else seenDesc.set(desc, route);

  rows.push(page);
}

console.log("Private routes must not be indexable:");
for (const route of privateRoutes) {
  const { robots } = await inspect(route);
  const ok = robots?.includes("noindex");
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${route.padEnd(16)} robots: ${robots}`);
  if (!ok) fail(route, `must be noindex, got "${robots}"`);
}

console.log("\nUnknown paths must return 404:");
for (const route of shouldBe404) {
  const { status, robots } = await inspect(route);
  const ok = status === 404 && robots?.includes("noindex");
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${route.padEnd(26)} HTTP ${status}, robots: ${robots}`);
  if (!ok) fail(route, `expected 404 + noindex, got ${status} / "${robots}"`);
}

console.log("\nrobots.txt and sitemap.xml:");
const robotsTxt = await (await fetch(`${BASE}/robots.txt`)).text();
if (!/^User-agent:/m.test(robotsTxt)) fail("/robots.txt", "missing a User-agent line");
if (!robotsTxt.includes("Sitemap:")) fail("/robots.txt", "does not advertise the sitemap");
for (const dir of ["/admin", "/api/"]) {
  if (!robotsTxt.includes(`Disallow: ${dir}`)) warn("/robots.txt", `does not disallow ${dir}`);
}
console.log(`  ok    /robots.txt (${robotsTxt.split("\n").length} lines)`);

const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
const sitemap = await sitemapRes.text();
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (sitemapRes.status !== 200) fail("/sitemap.xml", `HTTP ${sitemapRes.status}`);
if (!locs.length) fail("/sitemap.xml", "contains no URLs");
if (!/^<\?xml/.test(sitemap.trim())) fail("/sitemap.xml", "missing the XML declaration");
console.log(`  ok    /sitemap.xml (${locs.length} URLs)`);

// Every sitemap URL must exist, be indexable, and claim itself as canonical.
const missing = [];
for (const loc of locs) {
  const route = loc.replace(BASE, "") || "/";
  const page = rows.find((r) => r.route === route) ?? (await inspect(route));
  if (page.status !== 200) missing.push(`${route} -> HTTP ${page.status}`);
  else if (!page.robots?.startsWith("index")) missing.push(`${route} -> noindex`);
  else if (page.canonical !== loc) missing.push(`${route} -> canonical is ${page.canonical}`);
}
if (missing.length) for (const m of missing) fail("/sitemap.xml", `lists a bad URL: ${m}`);
else console.log(`  ok    every sitemap URL returns 200, is indexable and is self-canonical`);

// Routes the sitemap forgot.
const listed = new Set(locs.map((l) => l.replace(BASE, "") || "/"));
const unlisted = routes.filter((r) => !listed.has(r));
if (unlisted.length) warn("/sitemap.xml", `indexable routes not listed: ${unlisted.join(", ")}`);

console.log(`\n${"-".repeat(70)}`);
if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ! ${w}`);
}
if (errors.length) {
  console.log(`\n${errors.length} error(s):`);
  for (const e of errors) console.log(`  x ${e}`);
  console.log(`\nFAILED — ${routes.length} routes checked, ${errors.length} error(s), ${warnings.length} warning(s).\n`);
  process.exit(1);
}
console.log(`\nPASSED — ${routes.length} public routes, ${locs.length} sitemap URLs, 0 errors, ${warnings.length} warning(s).\n`);
