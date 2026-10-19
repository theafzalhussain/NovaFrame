export type LanguageRow = {
  name: string;
  layer: "Frontend" | "Backend" | "Database";
  role: string;
  where: string;
  accent: string;
};

/** Aapke structure ke mutabik: saari languages jis layer mein use hoti hain */
export const languages: LanguageRow[] = [
  { name: "HTML5", layer: "Frontend", role: "Semantic, accessible markup", where: "Every page, SEO-structured headings and landmarks", accent: "#e34f26" },
  { name: "CSS3 / Tailwind", layer: "Frontend", role: "Design tokens, layout, animation", where: "Utility classes plus a private token system", accent: "#06b6d4" },
  { name: "JavaScript", layer: "Frontend", role: "Interactivity and canvas work", where: "WebGL scene, marquee, counters, form logic", accent: "#f7df1e" },
  { name: "TypeScript", layer: "Frontend", role: "Type safety across components", where: "All components, data models and API contracts", accent: "#3178c6" },
  { name: "React", layer: "Frontend", role: "Component architecture", where: "Page composition, hooks, reusable primitives", accent: "#61dafb" },
  { name: "Three.js", layer: "Frontend", role: "Real WebGL 3D scene", where: "Hero icosahedron, particle field, parallax", accent: "#ffffff" },
  { name: "Node.js", layer: "Backend", role: "Runtime for the API server", where: "server/index.ts — Express REST API", accent: "#5fa04e" },
  { name: "Express", layer: "Backend", role: "Routing and middleware", where: "Validation, auth guard, error handler", accent: "#878787" },
  { name: "PHP 8", layer: "Backend", role: "Alternative API runtime", where: "server/php/api.php — PDO + MySQL edition", accent: "#777bb3" },
  { name: "SQL", layer: "Database", role: "Schema, queries, indexes", where: "server/db.ts (SQLite) and server/php/schema.sql (MySQL)", accent: "#4479a1" },
];

export type Insight = {
  slug: string;
  title: string;
  excerpt: string;
  category: "Engineering" | "Design" | "Growth" | "Studio";
  date: string;
  readTime: string;
  author: string;
  body: { heading?: string; paragraphs: string[]; list?: string[] }[];
};

export const insights: Insight[] = [
  {
    slug: "why-we-build-on-nextjs-typescript",
    title: "Why we build every client project on Next.js and TypeScript",
    excerpt:
      "Framework choice is a ten-year decision, not a trend. Here is the reasoning we walk every client through before a single line of code is written.",
    category: "Engineering",
    date: "2026-01-14",
    readTime: "7 min read",
    author: "Aarav Mehta",
    body: [
      {
        paragraphs: [
          "When a client asks us what we would build with, the answer is never a list of fashionable tools. It is a decision about who maintains the product in year three, who can be hired to work on it, and how expensive it becomes to change direction.",
          "Next.js and TypeScript win on both, and the reasoning is worth documenting publicly so our clients know exactly what they are buying into.",
        ],
      },
      {
        heading: "Rendering strategy is a business decision",
        paragraphs: [
          "Most agencies pick client-side rendering because it is faster to develop. Then the marketing team discovers their pages rank poorly and the checkout feels slow on mid-range phones.",
          "Next.js lets us choose per route: static generation for marketing pages, incremental static regeneration for catalogues, server rendering for dashboards. That single capability removes the single most common cause of expensive rewrites we see.",
        ],
        list: [
          "Marketing pages ship as static HTML — instantly cacheable at the edge",
          "Catalogue pages revalidate on demand when inventory changes",
          "Authenticated dashboards render server-side, so private data never leaks into a public bundle",
        ],
      },
      {
        heading: "TypeScript is a maintenance budget",
        paragraphs: [
          "A typed codebase means an editor can prove that a refactor is safe. On a six-month engagement that is a convenience. On a three-year product it is the difference between a two-day change and a two-week regression hunt.",
          "We extend this discipline into the data layer with typed ORM queries, so a schema change surfaces as a compile error rather than a production incident.",
        ],
      },
      {
        heading: "What we tell clients who already have a stack",
        paragraphs: [
          "If you are on Laravel, Django, Rails or a legacy monolith, we do not push a rewrite. We audit first. More often than not the right move is an incremental migration that keeps revenue flowing while the architecture improves underneath it.",
        ],
      },
    ],
  },
  {
    slug: "core-web-vitals-are-a-conversion-lever",
    title: "Core Web Vitals are a conversion lever, not an SEO checkbox",
    excerpt:
      "On a 4,000-SKU storefront we moved LCP from 2.4s to 0.9s. Conversion rose 2.1x. Here is the exact sequence we work through.",
    category: "Growth",
    date: "2026-01-06",
    readTime: "6 min read",
    author: "Rohan Iyer",
    body: [
      {
        paragraphs: [
          "Performance work is usually sold as an SEO task. In practice the bigger return shows up in conversion, because every 100ms of delay is a moment a shopper can change their mind.",
          "When we rebuild a storefront we work in a strict order, because doing these out of sequence wastes effort.",
        ],
      },
      {
        heading: "The order that works",
        paragraphs: ["This is the sequence we applied on the Kaarva rebuild."],
        list: [
          "Measure real device performance first, never a fast laptop on office wifi",
          "Fix the image pipeline — responsive sizes, modern formats, explicit dimensions",
          "Move heavy catalogue routes to incremental static regeneration at the edge",
          "Split the bundle so below-the-fold interaction code never blocks first paint",
          "Set a Lighthouse CI budget so the build fails if a score regresses",
        ],
      },
      {
        heading: "What actually moved the number",
        paragraphs: [
          "The single largest lift came from making checkout guest-first. We removed a mandatory account step that had been justified by a marketing goal nobody had questioned in two years.",
          "Speed opened the door; the funnel change converted it into revenue. Both were needed.",
        ],
      },
    ],
  },
  {
    slug: "design-systems-that-survive-handoff",
    title: "Design systems that actually survive the developer handoff",
    excerpt:
      "Most Figma kits look perfect and fall apart in code. The difference is tokens, states and documentation written for engineers.",
    category: "Design",
    date: "2025-12-19",
    readTime: "5 min read",
    author: "Sanya Kapoor",
    body: [
      {
        paragraphs: [
          "A design system is not a component library. It is an agreement about decisions, and if the agreement does not survive translation into code it has failed regardless of how polished the Figma file looks.",
        ],
      },
      {
        heading: "Three things most kits are missing",
        paragraphs: ["We audit handoffs against these three gaps."],
        list: [
          "Named tokens instead of hard-coded values, so a brand change is a config edit",
          "Every interactive state — hover, focus, disabled, loading, error, empty",
          "Written rules for spacing and typography scale, not just examples of good usage",
        ],
      },
      {
        heading: "Why we pair designers with engineers from day one",
        paragraphs: [
          "Our designers and developers work in the same repository. When a component is built, it is reviewed against the prototype in the same sitting. Handoff stops being an event and becomes a continuous conversation, which is why nothing is lost in translation.",
        ],
      },
    ],
  },
  {
    slug: "what-production-ready-actually-means",
    title: "What 'production-ready' actually means when we say it",
    excerpt:
      "Monitoring, error budgets, rollbacks and documentation. A checklist of everything that must exist before we call a project done.",
    category: "Studio",
    date: "2025-12-02",
    readTime: "8 min read",
    author: "Aarav Mehta",
    body: [
      {
        paragraphs: [
          "Every studio claims to deliver production-ready work. Very few define it. This is the checklist we hold ourselves to before handover, published so clients can hold us to it.",
        ],
      },
      {
        heading: "The pre-handover checklist",
        paragraphs: ["Nothing on this list is optional, and none of it is billed separately."],
        list: [
          "Automated end-to-end regression suite passing on the release candidate",
          "Error tracking with release tagging, wired to a real alerting channel",
          "APM dashboards for p95 latency on every critical endpoint",
          "Documented rollback path that can be executed in under five minutes",
          "Performance budget enforced in continuous integration",
          "Written runbook covering deploys, secrets, and common failure modes",
        ],
      },
      {
        heading: "Why this matters more for a small team",
        paragraphs: [
          "A compact studio cannot rely on a large operations department to catch what engineering missed. Discipline has to live inside the build process itself, which is exactly why we automate it.",
        ],
      },
    ],
  },
];

export const legal = {
  privacy: {
    updated: "12 January 2026",
    intro:
      "This policy explains what information Novaframe Studio collects through this website, why we collect it, and the control you retain over it. We collect the minimum required to respond to a business enquiry.",
    sections: [
      {
        heading: "Information we collect",
        list: [
          "Enquiry details you submit: name, company, email, phone, service interest, budget range, timeline and project description",
          "Technical data: IP address, browser user agent and pages visited, used for security and aggregate analytics",
          "Communication records if you email or call us directly",
        ],
      },
      {
        heading: "How we use it",
        list: [
          "To respond to your enquiry and prepare a proposal",
          "To deliver contracted services and project communication",
          "To improve site performance and understand which content is useful",
        ],
      },
      {
        heading: "What we never do",
        list: [
          "We do not sell, rent or trade your personal information",
          "We do not add you to a marketing list without explicit consent",
          "We do not share project details with third parties without a signed NDA",
        ],
      },
      {
        heading: "Retention and security",
        paragraphs: [
          "Enquiry records are retained for 24 months from last contact, then deleted. Data is stored on access-controlled infrastructure with encryption at rest. You may request access, correction or deletion at any time by emailing us.",
        ],
      },
    ],
  },
  terms: {
    updated: "12 January 2026",
    intro:
      "These terms govern the use of this website. Client engagements are governed separately by a signed statement of work, which takes precedence over anything stated here.",
    sections: [
      {
        heading: "Scope of engagement",
        list: [
          "Deliverables, timelines and pricing are defined in a written proposal",
          "Work begins on countersigned approval and receipt of the first milestone payment",
          "Revisions are limited to the rounds stated in the proposal",
        ],
      },
      {
        heading: "Intellectual property",
        paragraphs: [
          "On receipt of final payment, all custom code, design files and documentation created for your project transfer to you. We retain the right to reuse general-purpose internal tooling and to reference the work in our portfolio unless an NDA states otherwise.",
        ],
      },
      {
        heading: "Payment terms",
        list: [
          "Milestone billing as defined in the proposal, typically 40/40/20",
          "Invoices due within 15 days of issue",
          "Late payments may pause active work after written notice",
        ],
      },
      {
        heading: "Warranty and liability",
        paragraphs: [
          "We provide 30 days of free bug support following launch. We are not liable for indirect or consequential losses, and total liability is limited to the fees paid for the affected engagement.",
        ],
      },
    ],
  },
};
