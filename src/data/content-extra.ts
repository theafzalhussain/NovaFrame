import type { Insight } from "./types";

/* ------------------------------------------------------------------ */
/* How this website itself is built (shown on /tech-stack)            */
/* ------------------------------------------------------------------ */
export type LanguageRow = {
  name: string;
  layer: "Frontend" | "Backend" | "Database";
  role: string;
  where: string;
};

export const languages: LanguageRow[] = [
  { name: "HTML5", layer: "Frontend", role: "Semantic, accessible markup", where: "Every page — landmarks, headings and form semantics" },
  { name: "CSS3 / Tailwind v4", layer: "Frontend", role: "Design tokens, layout, motion", where: "src/index.css — the Noir & Champagne design system" },
  { name: "TypeScript", layer: "Frontend", role: "Type safety end to end", where: "One shared content model for site, API and admin" },
  { name: "React 19", layer: "Frontend", role: "Component architecture", where: "Pages, admin console and CMS-driven sections" },
  { name: "Three.js", layer: "Frontend", role: "Real-time WebGL", where: "The gold armillary sphere in the hero" },
  { name: "Node.js + Express", layer: "Backend", role: "REST API server", where: "server/index.ts — content, leads, bookings, auth" },
  { name: "PHP 8", layer: "Backend", role: "Shared-hosting API edition", where: "server/php/api.php — PDO + MySQL" },
  { name: "SQL (SQLite / MySQL)", layer: "Database", role: "Schema, indexes, prepared statements", where: "server/db.ts and server/php/schema.sql" },
];

/* ------------------------------------------------------------------ */
/* Insights — engineering notes drawn from real, shipped products     */
/* ------------------------------------------------------------------ */
export const insights: Insight[] = [
  {
    id: "a-cache-that-is-allowed-to-fail",
    title: "How we cut repeat database reads by ~60% — with a cache that's allowed to fail",
    excerpt:
      "Caching is easy to add and easy to get wrong. The eShopper cache is designed around one rule: if Redis disappears, customers should never notice.",
    category: "Engineering",
    date: "2026-09-22",
    readTime: "6 min read",
    author: "Afzal Hussain",
    body: [
      {
        paragraphs: [
          "When eShopper's catalogue and dashboard queries started to dominate database load, the obvious fix was Redis. The less obvious problem: managed Redis plans have quotas, and a cache that takes the whole API down when it runs out is worse than no cache at all.",
          "So the cache was built around a single rule — it is allowed to fail, but the store is not.",
        ],
      },
      {
        heading: "Degrade, don't collapse",
        paragraphs: [
          "Every cache read and write goes through one small module. If Redis is unreachable or over quota, that module quietly switches to an in-process Map with the same TTL semantics. Requests get slightly slower; nobody sees an error page.",
        ],
        list: [
          "Hot catalogue and dashboard reads are cached with short, explicit TTLs",
          "Writes invalidate precisely — product updates clear their own keys, not the world",
          "Background queues fall back to local processing when Redis is unavailable",
          "A slow-query profiler flags anything the cache still can't save",
        ],
      },
      {
        heading: "The result",
        paragraphs: [
          "Repeat reads against MongoDB dropped by roughly 60%, and — more importantly — the API kept serving through quota exhaustion. That's the standard we hold client builds to: performance work should never add a new way to fail.",
        ],
      },
    ],
  },
  {
    id: "pwa-that-survives-its-api",
    title: "Your PWA should keep working when your API doesn't",
    excerpt:
      "MovieZone never calls TMDB from the browser. A proxy with coalescing, retries and a 24-hour stale cache keeps the app useful even when the upstream is struggling.",
    category: "Engineering",
    date: "2026-08-30",
    readTime: "7 min read",
    author: "Afzal Hussain",
    body: [
      {
        paragraphs: [
          "Third-party APIs fail in creative ways: slow responses, intermittent 403s, connection resets. A discovery app that shows an error page every time that happens doesn't feel like a product — it feels like a demo.",
        ],
      },
      {
        heading: "Put a proxy between the browser and the world",
        paragraphs: ["In MovieZone, every upstream call passes through our own server, which adds the reliability layer the upstream doesn't promise."],
        list: [
          "In-memory caching with a fresh window and a long-lived stale window",
          "Request coalescing, so a hundred visitors asking for the same page cost one upstream call",
          "Bounded retries with backoff — never a retry storm",
          "Dual-hostname failover with periodic health probes",
          "A 24-hour stale fallback that answers instead of returning a 503",
        ],
      },
      {
        heading: "Then make the client just as patient",
        paragraphs: [
          "The service worker precaches the app shell and keeps a separate, capped image cache, so a shell upgrade never throws away hundreds of posters. On a flaky connection the app opens instantly and fills in as data arrives.",
          "The lesson carries to every client app we build: resilience is a feature your users feel, even if they never see it.",
        ],
      },
    ],
  },
  {
    id: "a-news-feed-that-never-goes-blank",
    title: "Building a bilingual news feed that never goes blank",
    excerpt:
      "Free news APIs have tight quotas. The Chronicle merges multiple sources, deduplicates them and serves stale-but-valid content when everything upstream fails.",
    category: "Product",
    date: "2026-07-18",
    readTime: "5 min read",
    author: "Afzal Hussain",
    body: [
      {
        paragraphs: [
          "An empty feed is the fastest way to lose a reader. With free-tier news APIs, it's also the default outcome the moment a quota runs out — so The Chronicle was designed so that it can't happen.",
        ],
      },
      {
        heading: "Many sources, one shape",
        paragraphs: [
          "A single server route fetches GNews as the primary source and falls back to Bing News and Google News RSS. Every article is normalised into one shape, deduplicated by URL and paginated on the server, so the client never has to care where a story came from.",
        ],
      },
      {
        heading: "Built for India's bilingual web",
        paragraphs: ["Language isn't a translation layer bolted on at the end — it changes the upstream queries too."],
        list: [
          "Every string, category, empty state and error is translated into Hindi",
          "Dates are formatted with the reader's locale",
          "Dedicated Devanagari typography keeps Hindi as polished as English",
        ],
      },
      {
        heading: "Fewer calls, fresher feed",
        paragraphs: [
          "Three tiers of caching and careful SWR tuning cut outbound API calls by about half — which is what keeps a free-tier product online all month long.",
        ],
      },
    ],
  },
  {
    id: "what-production-ready-actually-means",
    title: "What 'production-ready' actually means when we say it",
    excerpt:
      "Validation, monitoring, graceful fallbacks and a handover you can run without us. The checklist every Novaframe project must pass before we call it done.",
    category: "Studio",
    date: "2026-10-06",
    readTime: "5 min read",
    author: "Afzal Hussain",
    body: [
      {
        paragraphs: [
          "Every studio claims to deliver production-ready work. Very few define it. This is the checklist we hold ourselves to before handover — published so clients can hold us to it.",
        ],
      },
      {
        heading: "The pre-handover checklist",
        paragraphs: ["Nothing on this list is optional, and none of it is billed separately."],
        list: [
          "Server-side validation on every input, with honest error messages",
          "Error tracking wired to a real alerting channel",
          "Caching and third-party calls that degrade gracefully instead of failing loudly",
          "Rate limiting and honeypots on every public form",
          "A Lighthouse audit on a real mid-range phone, not a fast laptop",
          "An admin panel and written runbook, so you can operate the product without us",
        ],
      },
      {
        heading: "Why it matters more for a small team",
        paragraphs: [
          "A founder-led studio can't rely on a large operations department to catch what engineering missed. Discipline has to live inside the build itself — which is exactly why we automate it.",
        ],
      },
    ],
  },
];
