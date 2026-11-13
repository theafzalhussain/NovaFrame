/**
 * Per-page SEO metadata — one source of truth for the browser and the server.
 * ---------------------------------------------------------------------------
 * `resolveMeta()` turns a URL path plus the live site content into everything a
 * page needs to be found and to look right when shared: title, description,
 * canonical URL, Open Graph / Twitter cards, robots directives and JSON-LD.
 *
 * The same function runs in two places, which is the point:
 *   - in the browser, `useSeo()` applies the result to <head> on every route change;
 *   - on the server, `server/seo.ts` injects the result into the HTML before it is
 *     sent, so crawlers and social-media scrapers (which never run our JavaScript)
 *     read real per-page tags instead of one generic set.
 *
 * Deliberately free of browser and Node APIs so both callers can share it.
 *
 * Copy guidance used throughout: titles lead with the service a buyer searches for
 * (not with the brand), stay near 60 characters so Google shows them whole, and
 * descriptions land in 140–160 characters with a concrete reason to click.
 */
import type { Insight, Project, Service, SiteContent, SiteSettings } from "../data/types";

export type JsonLd = Record<string, unknown>;

export type PageMeta = {
  /** Canonical path this page should be indexed under, e.g. "/work/eshopper". */
  path: string;
  title: string;
  description: string;
  /** Absolute canonical URL. */
  canonical: string;
  robots: string;
  ogType: "website" | "article" | "profile";
  /** Absolute URL of the share image, when the page has a meaningful one. */
  image?: string;
  imageAlt?: string;
  /** Heading and intro mirrored into a <noscript> block for crawlers without JS. */
  heading: string;
  /**
   * False when the path matches no page or no content slug. The server turns this into a
   * real 404 status, so a crawler discards the URL instead of indexing the error screen.
   */
  found: boolean;
  /** ISO date for articles. */
  publishedTime?: string;
  breadcrumbs: { name: string; path: string }[];
  jsonLd: JsonLd[];
};

/* ------------------------------------------------------------------ */
/* Paths                                                              */
/* ------------------------------------------------------------------ */

/**
 * Pages that must never reach an index: private dashboards, and transactional
 * pages that would otherwise compete with the pages we actually want ranked.
 */
const NOINDEX_PREFIXES = ["/admin", "/portal", "/partner", "/confirmation", "/pay"];

/**
 * Historic duplicate paths. Both still render, but they point their canonical tag at
 * one address so the ranking signals of `/portfolio/x` and `/work/x` are never split.
 */
const ALIASES: Record<string, string> = {
  "/capabilities": "/services",
  "/portfolio": "/work",
  "/about": "/studio",
};

/** The address a given path should be indexed under. */
export function canonicalPath(path: string): string {
  const [first, ...rest] = path.split("/").filter(Boolean);
  if (!first) return "/";
  const base = ALIASES[`/${first}`] ?? `/${first}`;
  return rest.length ? `${base}/${rest.join("/")}` : base;
}

export function isIndexable(path: string): boolean {
  const canonical = canonicalPath(path);
  return !NOINDEX_PREFIXES.some((p) => canonical === p || canonical.startsWith(`${p}/`));
}

/* ------------------------------------------------------------------ */
/* Text helpers                                                       */
/* ------------------------------------------------------------------ */

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

/** Trims to a length on a word boundary — descriptions are cut off by Google, not wrapped. */
function clamp(text: string, max: number): string {
  const clean = squash(text);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–—]$/, "")}…`;
}

const TITLE_MAX = 62;
/** Target description length — roughly what Google renders before clipping. */
const DESC_MAX = 158;
/**
 * Upper bound for text we keep whole. Google indexes the entire description and only clips
 * the display, so letting editorial copy run slightly long beats mangling a sentence.
 */
const DESC_HARD = 168;

/**
 * "<page> | <brand>". The keyword phrase comes first so it survives Google's ~60-character
 * display cut; the brand sits after it, where being truncated costs nothing.
 */
const brandSuffix = (title: string, brand: string) => `${title} | ${brand}`;

/**
 * Joins sentences in priority order, skipping any that would overflow the limit.
 * Keeps descriptions made of whole sentences instead of trailing off mid-clause.
 */
function fit(max: number, ...parts: string[]): string {
  let out = "";
  for (const part of parts) {
    const piece = squash(part);
    if (!piece) continue;
    const next = out ? `${out} ${piece}` : piece;
    if (next.length > max) continue;
    out = next;
  }
  return out;
}

/**
 * Greedily joins clauses with `sep` while the result — plus its closing full stop — fits
 * `max`. Returns "" when not even the first clause fits.
 */
function joinWhileFits(head: string, parts: string[], sep: string, max: number): string {
  let out = "";
  for (const raw of head ? [head, ...parts] : parts) {
    const piece = squash(raw).replace(/[.,;]+$/, "");
    if (!piece) continue;
    const next = out ? `${out}${sep}${piece}` : piece;
    if (next.length + 1 > max) break; // +1 leaves room for the full stop
    out = next;
  }
  return out ? `${out}.` : "";
}

/**
 * Builds a description that reads like finished prose.
 *
 * CMS copy is written for the page, not for a 158-character slot, so this works in stages:
 * use it whole when it fits (topping up with `extras` if there is room); keep it whole when
 * it is only slightly over; otherwise rebuild it from complete clauses — splitting on
 * em-dashes and full stops first, then on commas — so the sentence still closes properly.
 * Cutting mid-word is the last resort, not the first.
 */
function describe(lead: string, body: string, ...extras: string[]): string {
  const head = squash(lead).replace(/[.,;—]+$/, "");
  const text = squash(body);
  const full = head ? `${head}. ${text}` : text;

  if (full.length <= DESC_MAX) return fit(DESC_MAX, full, ...extras);
  if (full.length <= DESC_HARD) return full;

  const trimmed =
    joinWhileFits(head, text.split(/\s+—\s+|(?<=[.;])\s+/), ". ", DESC_MAX) ||
    joinWhileFits(head, text.split(/,\s+/), ", ", DESC_MAX);
  if (!trimmed) return clamp(full, DESC_MAX);
  return fit(DESC_MAX, trimmed, ...extras);
}

/** "React, Node.js and MySQL" — an Oxford-comma-free list for prose. */
function proseList(items: string[], limit = 3): string {
  const picked = items.slice(0, limit).filter(Boolean);
  if (picked.length <= 1) return picked[0] ?? "";
  return `${picked.slice(0, -1).join(", ")} and ${picked[picked.length - 1]}`;
}

/** `settings.country` holds an ISO code; prose needs the name. */
const COUNTRY_NAMES: Record<string, string> = {
  IN: "India",
  US: "the United States",
  GB: "the United Kingdom",
  AE: "the UAE",
  AU: "Australia",
  CA: "Canada",
  SG: "Singapore",
};
const countryName = (code: string) => COUNTRY_NAMES[code.trim().toUpperCase()] ?? code;

/**
 * `settings.responseTime` is edited as a sentence ("We reply within 12 business hours"),
 * but descriptions need just the window ("12 business hours").
 */
function responseWindow(s: SiteSettings): string {
  const match = s.responseTime.match(/within\s+(.+?)[.!]?$/i);
  return (match?.[1] ?? s.responseTime).trim();
}

/* ------------------------------------------------------------------ */
/* Static pages                                                       */
/* ------------------------------------------------------------------ */
type StaticMeta = { title: string; description: string; heading: string };

/**
 * Commercial-intent copy for the fixed pages. Titles lead with the phrase a buyer actually
 * searches for; descriptions name the proof or the offer that earns the click, and are
 * written to land inside Google's ~158-character cut so none of them trails off.
 */
function staticPages(s: SiteSettings): Record<string, StaticMeta> {
  const city = s.city;
  const country = countryName(s.country);
  const replyIn = responseWindow(s);
  return {
    "/": {
      title: `Web Development Company in ${city}`,
      description: `Founder-led web development studio in ${city}. Fast websites, web apps, online stores and PWAs on React and Node.js. Free quote in ${replyIn}.`,
      heading: `Web development studio in ${city}`,
    },
    "/services": {
      title: "Web Development Services — Websites, Web Apps & Stores",
      description: `Websites, web apps, backend APIs, UI/UX, SEO and video — delivered end to end by the engineer who builds them. Fixed scope, fixed price, no retainers.`,
      heading: "Web development services",
    },
    "/work": {
      title: "Our Work — Web Development Projects & Case Studies",
      description: `Open every product we have shipped: e-commerce, dashboards, PWAs and content platforms on React, Next.js and Node.js. Real URLs, real code, real results.`,
      heading: "Live products and case studies",
    },
    "/pricing": {
      title: "Web Development Pricing — Packages & Live Estimator",
      description: `See what a website, web app or online store costs before you talk to anyone. Transparent packages, a live estimator, no hidden retainers or surprise bills.`,
      heading: "Transparent web development pricing",
    },
    "/studio": {
      title: "About the Studio — Founder, Process & Standards",
      description: `A founder-led digital studio in ${city}, ${country}. Meet the engineer behind the work, the standards every build is held to and the process that ships on time.`,
      heading: "The studio",
    },
    "/tech-stack": {
      title: "Tech Stack — React, Next.js & Node.js in Production",
      description: `Every framework, database and tool we build on, and the live product each one has shipped in. No résumé padding, only technology proven in production.`,
      heading: "Tech stack",
    },
    "/insights": {
      title: "Insights — Web Performance & Engineering Notes",
      description: `Practical notes on web performance, Core Web Vitals, SEO architecture and shipping React and Node.js products — written from real builds, not recycled theory.`,
      heading: "Engineering insights",
    },
    "/contact": {
      title: `Contact — Start a Web Development Project in ${city}`,
      description: `Tell us about your website, web app or online store and get a clear scope, timeline and price. The founder reads every brief and replies in ${replyIn}.`,
      heading: "Start a project",
    },
    "/book": {
      title: "Book a Free 30-Minute Web Strategy Call",
      description: `Pick a time and talk to the engineer who would build your project. Thirty minutes, honest advice on scope and budget, no sales script and no obligation.`,
      heading: "Book a free strategy call",
    },
    "/earn": {
      title: "Earn With Us — Student Partner & Ambassador Program",
      description: `Refer businesses that need a website and earn commission on every project that goes live. Free to join for students in ${country}, paid per verified payment.`,
      heading: "Earn with us",
    },
    "/pay": {
      title: "Pay Securely Online",
      description: `Settle a ${s.short} invoice securely by UPI, card, net banking or wallet.`,
      heading: "Pay securely online",
    },
    "/partner": {
      title: "Partner Dashboard",
      description: `Sign in to track referrals, commission and payouts.`,
      heading: "Partner dashboard",
    },
    "/confirmation": {
      title: "Confirmation",
      description: `Your request has been received.`,
      heading: "Confirmation",
    },
    "/privacy": {
      title: "Privacy Policy",
      description: `How ${s.name} collects, uses and protects the information you share through this website.`,
      heading: "Privacy policy",
    },
    "/terms": {
      title: "Terms of Service",
      description: `The terms that apply when you commission design, development or related work from ${s.name}.`,
      heading: "Terms of service",
    },
    "/sitemap": {
      title: "Sitemap — Every Page on This Site",
      description: `A complete index of ${s.name}: services, case studies, pricing, articles and policies, all in one place.`,
      heading: "Sitemap",
    },
    "/admin": { title: "Admin Console", description: "Private.", heading: "Admin console" },
  };
}

/* ------------------------------------------------------------------ */
/* Structured data                                                    */
/* ------------------------------------------------------------------ */

const absolute = (origin: string, pathOrUrl?: string): string | undefined => {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${origin}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
};

const ORG_ID = "#studio";

/** The studio itself — referenced by `@id` from every other node instead of repeated. */
function organizationNode(s: SiteSettings, origin: string, founderPhoto?: string): JsonLd {
  return {
    "@type": ["ProfessionalService", "Organization"],
    "@id": `${origin}/${ORG_ID}`,
    name: s.name,
    legalName: s.legal,
    alternateName: s.short,
    url: `${origin}/`,
    description: squash(s.description),
    email: s.email,
    telephone: s.phone,
    foundingDate: s.founded,
    image: absolute(origin, founderPhoto ?? "/brand/logo.png"),
    logo: absolute(origin, "/brand/logo.png"),
    priceRange: "₹₹",
    address: { "@type": "PostalAddress", addressLocality: s.city, addressCountry: s.country },
    areaServed: [{ "@type": "Country", name: s.country }, { "@type": "Place", name: "Worldwide" }],
    knowsAbout: [
      "Web development",
      "React",
      "Next.js",
      "Node.js",
      "Progressive Web Apps",
      "E-commerce development",
      "UI/UX design",
      "Search engine optimisation",
    ],
    sameAs: s.socials.map((l) => l.href).filter((h) => /^https?:\/\//i.test(h)),
  };
}

function breadcrumbNode(origin: string, trail: { name: string; path: string }[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: `${origin}${crumb.path === "/" ? "/" : crumb.path}`,
    })),
  };
}

/** Service pages carry an Offer so the starting price can show in results. */
function serviceNode(service: Service, s: SiteSettings, origin: string): JsonLd {
  const amount = Number(String(service.startingAt).replace(/[^\d]/g, "")) || undefined;
  return {
    "@type": "Service",
    "@id": `${origin}/services/${service.id}#service`,
    name: `${service.title} — ${s.name}`,
    serviceType: service.title,
    description: squash(service.short || service.tagline),
    provider: { "@id": `${origin}/${ORG_ID}` },
    areaServed: [{ "@type": "Country", name: s.country }, { "@type": "Place", name: "Worldwide" }],
    url: `${origin}/services/${service.id}`,
    ...(amount
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: amount,
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: amount,
              priceCurrency: "INR",
              valueAddedTaxIncluded: false,
            },
            availability: "https://schema.org/InStock",
            url: `${origin}/services/${service.id}`,
          },
        }
      : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `${service.title} deliverables`,
      itemListElement: service.items.slice(0, 12).map((item) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name: item.title, description: squash(item.desc) },
      })),
    },
  };
}

function projectNode(project: Project, _s: SiteSettings, origin: string): JsonLd {
  return {
    "@type": "CreativeWork",
    "@id": `${origin}/work/${project.id}#project`,
    name: project.title,
    headline: `${project.title} — ${project.subtitle}`,
    description: squash(project.summary),
    about: project.category,
    genre: project.category,
    dateCreated: project.year,
    creator: { "@id": `${origin}/${ORG_ID}` },
    publisher: { "@id": `${origin}/${ORG_ID}` },
    url: `${origin}/work/${project.id}`,
    ...(project.cover ? { image: absolute(origin, project.cover) } : {}),
    ...(project.liveUrl ? { sameAs: project.liveUrl } : {}),
    ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
    keywords: project.stack.join(", "),
    inLanguage: "en",
    ...(project.metrics.length
      ? {
          mainEntity: {
            "@type": "ItemList",
            name: `${project.title} results`,
            itemListElement: project.metrics.map((m, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: m.label,
              description: m.value,
            })),
          },
        }
      : {}),
  };
}

/** ISO date for schema; falls back to the raw string when it is not parseable. */
function isoDate(value: string): string | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function insightNode(article: Insight, s: SiteSettings, origin: string, authorPhoto?: string): JsonLd {
  const words = article.body.reduce((n, block) => n + block.paragraphs.join(" ").split(/\s+/).length, 0);
  const published = isoDate(article.date);
  return {
    "@type": "BlogPosting",
    "@id": `${origin}/insights/${article.id}#article`,
    headline: clamp(article.title, 110),
    description: squash(article.excerpt),
    articleSection: article.category,
    wordCount: words,
    inLanguage: "en",
    ...(published ? { datePublished: published, dateModified: published } : {}),
    author: { "@type": "Person", name: article.author, image: absolute(origin, authorPhoto) },
    publisher: { "@id": `${origin}/${ORG_ID}` },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${origin}/insights/${article.id}` },
    url: `${origin}/insights/${article.id}`,
    image: absolute(origin, "/brand/logo.png"),
    keywords: [article.category, "web development", s.short].join(", "),
  };
}

/** Questions and answers are eligible for rich results, so the FAQ page ships them. */
function faqNode(content: SiteContent, limit = 12): JsonLd | null {
  const faqs = content.collections.faqs.slice(0, limit);
  if (!faqs.length) return null;
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: squash(f.q),
      acceptedAnswer: { "@type": "Answer", text: squash(f.a) },
    })),
  };
}

/* ------------------------------------------------------------------ */
/* Resolver                                                           */
/* ------------------------------------------------------------------ */

export type ResolveInput = {
  /** Path as it appears in the address bar, e.g. "/work/eshopper". */
  path: string;
  content: SiteContent;
  /** Scheme + host with no trailing slash, e.g. "https://webxstudio.me". */
  origin: string;
};

export function resolveMeta({ path, content, origin }: ResolveInput): PageMeta {
  const s = content.settings;
  const canonical = canonicalPath(path);
  const [first, second, ...rest] = canonical.split("/").filter(Boolean);
  const founder = content.collections.team[0];
  const org = organizationNode(s, origin, founder?.photo);
  const url = (p: string) => `${origin}${p === "/" ? "/" : p}`;

  const base = (over: Partial<PageMeta> & { title: string; description: string; heading: string }): PageMeta => ({
    path: canonical,
    canonical: url(canonical),
    robots: isIndexable(canonical)
      ? "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"
      : "noindex, follow",
    ogType: "website",
    image: absolute(origin, "/brand/logo.png"),
    imageAlt: `${s.name} — ${s.tagline}`,
    found: true,
    breadcrumbs: [{ name: "Home", path: "/" }],
    jsonLd: [],
    ...over,
    title: clamp(over.title, TITLE_MAX + 24),
    // DESC_HARD, not DESC_MAX: `describe()` has already shaped the text, and re-cutting it
    // here at the display width would undo that work.
    description: clamp(over.description, DESC_HARD),
  });

  /** A path that matches no page or no content slug. */
  const notFound = () =>
    base({
      title: brandSuffix("Page not found", s.short),
      description: `That page doesn't exist. Browse the services, work and pricing instead.`,
      heading: "Page not found",
      robots: "noindex, follow",
      found: false,
      jsonLd: [org],
    });

  /* ---- Detail pages ---- */
  if (second && !rest.length) {
    if (first === "work") {
      const project = content.collections.projects.find((p) => p.id === second);
      if (project) {
        const trail = [
          { name: "Home", path: "/" },
          { name: "Work", path: "/work" },
          { name: project.title, path: canonical },
        ];
        return base({
          title: brandSuffix(`${project.title} — ${project.category} Case Study`, s.short),
          description: describe(
            "",
            project.summary,
            project.stack.length ? `Built with ${proseList(project.stack)}.` : "",
            project.liveUrl ? "See the live build." : "",
          ),
          heading: `${project.title} — ${project.subtitle}`,
          ogType: "article",
          image: absolute(origin, project.cover) ?? absolute(origin, "/brand/logo.png"),
          imageAlt: `${project.title} — ${project.subtitle || project.category}`,
          breadcrumbs: trail,
          jsonLd: [org, projectNode(project, s, origin), breadcrumbNode(origin, trail)],
        });
      }
    }
    if (first === "services") {
      const service = content.collections.services.find((x) => x.id === second);
      if (service) {
        const trail = [
          { name: "Home", path: "/" },
          { name: "Services", path: "/services" },
          { name: service.title, path: canonical },
        ];
        return base({
          // The starting price in the title is a strong click signal for commercial searches.
          title: brandSuffix(`${service.title} in ${s.city} — From ${service.startingAt}`, s.short),
          description: describe("", service.short, `From ${service.startingAt}, typically ${service.timeline}.`),
          heading: `${service.title} — ${service.tagline}`,
          breadcrumbs: trail,
          jsonLd: [org, serviceNode(service, s, origin), breadcrumbNode(origin, trail)],
        });
      }
    }
    if (first === "insights") {
      const article = content.collections.insights.find((a) => a.id === second);
      if (article) {
        const trail = [
          { name: "Home", path: "/" },
          { name: "Insights", path: "/insights" },
          { name: article.title, path: canonical },
        ];
        const author = content.collections.team.find((m) => m.name === article.author) ?? founder;
        return base({
          title: brandSuffix(article.title, s.short),
          description: describe("", article.excerpt),
          heading: article.title,
          ogType: "article",
          publishedTime: isoDate(article.date),
          breadcrumbs: trail,
          jsonLd: [org, insightNode(article, s, origin, author?.photo), breadcrumbNode(origin, trail)],
        });
      }
    }
    // A slug that does not exist — tell crawlers not to keep it.
    return notFound();
  }

  if (rest.length) return notFound();

  /* ---- Fixed pages ---- */
  const page = staticPages(s)[canonical];
  if (!page) return notFound();

  const trail =
    canonical === "/"
      ? [{ name: "Home", path: "/" }]
      : [
          { name: "Home", path: "/" },
          { name: page.heading, path: canonical },
        ];

  const jsonLd: JsonLd[] = [org];

  if (canonical === "/") {
    jsonLd.push({
      "@type": "WebSite",
      "@id": `${origin}/#website`,
      url: `${origin}/`,
      name: s.name,
      description: squash(s.description),
      inLanguage: "en",
      publisher: { "@id": `${origin}/${ORG_ID}` },
    });
    const faq = faqNode(content, 6);
    if (faq) jsonLd.push(faq);
  } else {
    jsonLd.push(breadcrumbNode(origin, trail));
  }

  // The pricing page answers buying questions, so it carries the full FAQ block.
  if (canonical === "/pricing") {
    const faq = faqNode(content);
    if (faq) jsonLd.push(faq);
    jsonLd.push({
      "@type": "OfferCatalog",
      name: `${s.name} packages`,
      url: url("/pricing"),
      itemListElement: content.collections.packages.map((pkg) => ({
        "@type": "Offer",
        name: pkg.name,
        description: squash(pkg.desc),
        price: Number(String(pkg.price).replace(/[^\d]/g, "")) || undefined,
        priceCurrency: "INR",
        url: url("/pricing"),
      })),
    });
  }

  if (canonical === "/work") {
    jsonLd.push({
      "@type": "CollectionPage",
      name: page.title,
      url: url("/work"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: content.collections.projects.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.title,
          url: url(`/work/${p.id}`),
        })),
      },
    });
  }

  if (canonical === "/services") {
    jsonLd.push({
      "@type": "CollectionPage",
      name: page.title,
      url: url("/services"),
      mainEntity: {
        "@type": "ItemList",
        itemListElement: content.collections.services.map((x, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: x.title,
          url: url(`/services/${x.id}`),
        })),
      },
    });
  }

  if (canonical === "/insights") {
    jsonLd.push({
      "@type": "Blog",
      name: page.title,
      url: url("/insights"),
      publisher: { "@id": `${origin}/${ORG_ID}` },
      blogPost: content.collections.insights.map((a) => ({
        "@type": "BlogPosting",
        headline: clamp(a.title, 110),
        url: url(`/insights/${a.id}`),
        datePublished: isoDate(a.date),
        author: { "@type": "Person", name: a.author },
      })),
    });
  }

  if (canonical === "/contact" || canonical === "/book") {
    jsonLd.push({
      "@type": "ContactPage",
      name: page.title,
      url: url(canonical),
      mainEntity: { "@id": `${origin}/${ORG_ID}` },
    });
  }

  return base({ ...page, title: brandSuffix(page.title, s.short), breadcrumbs: trail, jsonLd });
}

/* ------------------------------------------------------------------ */
/* Sitemap                                                            */
/* ------------------------------------------------------------------ */
export type SitemapEntry = { loc: string; changefreq: string; priority: string; lastmod?: string };

/**
 * Every indexable URL, in the order of how much we want it crawled.
 * `priority` is a hint about relative importance within this site only.
 */
export function sitemapEntries(content: SiteContent, origin: string, lastmod?: string): SitemapEntry[] {
  const seen = new Set<string>();
  const entries: SitemapEntry[] = [];
  const add = (path: string, changefreq: string, priority: string, mod = lastmod) => {
    const canonical = canonicalPath(path);
    if (seen.has(canonical) || !isIndexable(canonical)) return;
    seen.add(canonical);
    entries.push({ loc: `${origin}${canonical === "/" ? "/" : canonical}`, changefreq, priority, lastmod: mod });
  };

  add("/", "weekly", "1.0");
  add("/services", "weekly", "0.9");
  add("/work", "weekly", "0.9");
  add("/pricing", "weekly", "0.9");
  add("/contact", "monthly", "0.8");
  add("/book", "monthly", "0.8");
  add("/studio", "monthly", "0.7");
  add("/tech-stack", "monthly", "0.6");
  add("/insights", "weekly", "0.7");
  add("/earn", "monthly", "0.6");

  for (const service of content.collections.services) add(`/services/${service.id}`, "monthly", "0.8");
  for (const project of content.collections.projects) add(`/work/${project.id}`, "monthly", "0.8");
  for (const article of content.collections.insights) {
    add(`/insights/${article.id}`, "yearly", "0.6", isoDate(article.date) ?? lastmod);
  }

  add("/sitemap", "monthly", "0.3");
  add("/privacy", "yearly", "0.2");
  add("/terms", "yearly", "0.2");
  return entries;
}
