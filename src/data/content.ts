/* ================================================================
   Novaframe Studio — central content source
   Replace names, phone numbers and links with your live details.
   ================================================================ */

export const company = {
  name: "Novaframe Studio",
  legal: "Novaframe Studio LLP",
  short: "Novaframe",
  tagline: "Digital products, engineered to perform.",
  email: "hello@novaframe.studio",
  phone: "+91 98765 43210",
  phoneHref: "tel:+919876543210",
  booking: "#/book",
  location: "Bengaluru, India · Remote-first worldwide",
  hours: "Mon – Sat, 10:00 – 19:00 IST",
  responseTime: "We reply within 12 business hours",
  founded: "2023",
  socials: [
    { label: "LinkedIn", href: "https://linkedin.com", icon: "in" },
    { label: "GitHub", href: "https://github.com", icon: "gh" },
    { label: "Dribbble", href: "https://dribbble.com", icon: "dr" },
    { label: "Instagram", href: "https://instagram.com", icon: "ig" },
  ],
};

export const navLinks = [
  { label: "Home", to: "/" },
  { label: "Services", to: "/services" },
  { label: "Work", to: "/portfolio" },
  { label: "Studio", to: "/about" },
  { label: "Tech Stack", to: "/tech-stack" },
  { label: "Contact", to: "/contact" },
];

export const heroStats = [
  { value: 40, suffix: "+", label: "Products shipped" },
  { value: 98, suffix: "", label: "Avg. Lighthouse score" },
  { value: 1.2, suffix: "s", label: "Median load time", decimals: 1 },
  { value: 3, suffix: "×", label: "Average lead growth" },
];

/* --------------------------- Trust signals --------------------------- */
export const clientLogos = [
  "FINSTACK",
  "KAARVA",
  "PULSE",
  "ATLAS ROBOTICS",
  "CLIMBLY",
  "ORBIT",
  "NORTHVANE",
  "HELIO PAY",
];

export const credentials = [
  { title: "100% code ownership", desc: "Repository, design files and credentials transferred to you at handover." },
  { title: "NDA-ready engagements", desc: "Mutual NDA signed before any sensitive brief is discussed." },
  { title: "Fixed-scope contracts", desc: "Written deliverables, milestone billing and zero scope creep." },
  { title: "GDPR-conscious builds", desc: "Consent-first analytics, encrypted data at rest, audit trails." },
  { title: "Senior-only team", desc: "No juniors learning on your budget. You work with the principals." },
  { title: "30-day post-launch cover", desc: "Free bug fixes and monitoring for the first month, always." },
];

/* ------------------------------- Services ------------------------------- */
export type ServiceItem = { title: string; desc: string };
export type Service = {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  short: string;
  deliverable: string;
  items: ServiceItem[];
  stack: string[];
};

export const services: Service[] = [
  {
    id: "web",
    icon: "code",
    title: "Web Development",
    tagline: "Blazing-fast, SEO-first websites and web applications",
    short:
      "Marketing sites, headless commerce and full-scale platforms built on Next.js and TypeScript — engineered against Core Web Vitals, not just design mockups.",
    deliverable: "Live deployment + repository + documentation",
    items: [
      { title: "Custom Websites", desc: "Pixel-accurate, component-driven business websites with a private design system." },
      { title: "E-commerce Solutions", desc: "Headless storefronts, optimised checkout, payment gateways and inventory sync." },
      { title: "Web Applications", desc: "Authentication, roles, dashboards and real-time data for full product builds." },
      { title: "API & Backend Engineering", desc: "REST and GraphQL services on Node.js with modelled SQL/NoSQL data layers." },
      { title: "CMS Integration", desc: "Sanity, Strapi or headless WordPress so your team publishes without developers." },
      { title: "Care & Maintenance", desc: "Monitoring, security patches, uptime SLA and monthly performance reporting." },
    ],
    stack: ["Next.js", "TypeScript", "Tailwind CSS", "Node.js", "PostgreSQL"],
  },
  {
    id: "app",
    icon: "phone",
    title: "App Development",
    tagline: "One codebase, every platform, native-quality feel",
    short:
      "iOS and Android applications with cross-platform architecture, offline-first storage and full store-release management handled end to end.",
    deliverable: "Store-ready builds for iOS and Android",
    items: [
      { title: "iOS & Android Apps", desc: "Store-ready releases with native modules wherever performance demands it." },
      { title: "Cross-Platform Development", desc: "React Native and Expo — one codebase, roughly 40% lower build cost." },
      { title: "Progressive Web Apps", desc: "Installable, offline-capable web apps that behave like native software." },
      { title: "Push & Deep Linking", desc: "Notification systems, dynamic links and attribution-ready analytics events." },
      { title: "App Store Launch", desc: "Store assets, screenshots, review handling and phased rollout strategy." },
      { title: "Post-launch Iteration", desc: "Crash triage via Sentry, feature flags and release-train delivery." },
    ],
    stack: ["React Native", "Expo", "TypeScript", "Firebase", "Fastlane"],
  },
  {
    id: "design",
    icon: "layers",
    title: "UI/UX Design",
    tagline: "Interfaces engineered to convert, not just impress",
    short:
      "Research-led product design from discovery through design-system handoff — every screen validated against user flow and a business objective.",
    deliverable: "Figma files, prototype and documented design system",
    items: [
      { title: "Responsive Web Design", desc: "Mobile-first layouts verified from 320px through ultrawide breakpoints." },
      { title: "Mobile App Design", desc: "Native gesture patterns, thumb-zone placement and complete dark-mode systems." },
      { title: "User Research", desc: "Interviews, personas and journey mapping before a single pixel is drawn." },
      { title: "Wireframes & Prototypes", desc: "Clickable Figma prototypes for fast, low-cost stakeholder validation." },
      { title: "Design Systems", desc: "Tokens, components and documentation your engineers can actually implement." },
      { title: "UX Audit", desc: "Heuristic and analytics review delivered as a prioritised fix list." },
    ],
    stack: ["Figma", "Framer", "Maze", "LottieFiles", "Storybook"],
  },
  {
    id: "seo",
    icon: "search",
    title: "SEO & Growth",
    tagline: "Technical SEO built into the architecture",
    short:
      "Beyond keywords: schema, Core Web Vitals, crawl-budget control and content architecture. Growth is reported monthly, with numbers you can audit.",
    deliverable: "Technical audit, implementation and monthly growth report",
    items: [
      { title: "On-Page SEO", desc: "Titles, metadata, internal linking, schema markup and content hierarchy." },
      { title: "Technical SEO", desc: "Sitemaps, canonical logic, SSR/ISR configuration, crawl and index debugging." },
      { title: "Content Optimization", desc: "Topic clusters, brief creation and refresh cycles driven by Search Console data." },
      { title: "Core Web Vitals", desc: "Image pipeline, font strategy, code-splitting and edge caching." },
      { title: "Local SEO", desc: "Business profile optimisation, NAP consistency and location landing pages." },
      { title: "Analytics & Reporting", desc: "GA4 and Search Console dashboards with monthly growth reviews." },
    ],
    stack: ["Next.js ISR", "Schema.org", "GA4", "GSC", "Ahrefs"],
  },
  {
    id: "video",
    icon: "play",
    title: "Video & Motion",
    tagline: "Motion design that sells the product story",
    short:
      "Launch films, performance ad creatives and corporate videos — scripting, edit, motion graphics and sound design handled by one team.",
    deliverable: "Master files + platform-specific exports",
    items: [
      { title: "Promotional Videos", desc: "Product launch films with hook-first scripting and a brand motion kit." },
      { title: "Social Media Content", desc: "Reels, shorts and vertical cuts engineered for retention curves." },
      { title: "Corporate Videos", desc: "Founder stories, culture films and investor-facing explainers." },
      { title: "Motion Graphics", desc: "Kinetic typography, logo stings, UI walkthroughs and data animation." },
      { title: "Product Demos", desc: "Screen-recorded flows polished with zooms, captions and voice-over." },
      { title: "Ad Creative Testing", desc: "Three to five hook variants per concept for paid campaign iteration." },
    ],
    stack: ["After Effects", "Premiere Pro", "DaVinci Resolve", "Blender", "CapCut"],
  },
];

/* ------------------------------- Process ------------------------------- */
export const processSteps = [
  { step: "01", title: "Discovery call", desc: "We map goals, users and scope, then lock deliverables and timeline in writing.", duration: "Day 1–2" },
  { step: "02", title: "UX & architecture", desc: "Sitemap, wireframes, data model and API contract — approved before design begins.", duration: "Week 1" },
  { step: "03", title: "Design & build", desc: "High-fidelity design alongside development sprints, with a working demo every week.", duration: "Week 2–5" },
  { step: "04", title: "QA & hardening", desc: "Cross-device testing, Lighthouse audit, accessibility pass and error monitoring setup.", duration: "Week 6" },
  { step: "05", title: "Launch & support", desc: "CI/CD deployment, analytics, SEO indexing, then a monthly care plan.", duration: "Ongoing" },
];

/* ------------------------------ Why choose us --------------------------- */
export const whyChooseUs = [
  { title: "Production-ready from day one", desc: "TypeScript, error boundaries, monitoring and CI/CD are defaults — we never ship prototype code.", icon: "shield" },
  { title: "Performance obsessed", desc: "Every project targets a 95+ Lighthouse score. Speed compounds into ranking and conversion.", icon: "bolt" },
  { title: "Fixed scope, zero surprises", desc: "Written deliverables, milestone payments and a shared project board. Budgets never leak.", icon: "doc" },
  { title: "Founder-level attention", desc: "You speak directly with the engineers building your product — no account-manager relay.", icon: "chat" },
  { title: "Design and engineering, one team", desc: "Designers and developers work in the same room, so nothing is lost in handoff.", icon: "layers" },
  { title: "Built to scale", desc: "Caching, queues and CDN architecture are planned upfront, so traffic spikes never break you.", icon: "scale" },
];

/* ------------------------------ Testimonials ---------------------------- */
export const testimonials = [
  {
    quote:
      "They rebuilt our storefront and page speed went from 2.4s to 0.9s. Checkout conversion grew 31% in the first month alone.",
    name: "Ritika Malhotra",
    role: "Founder, Kaarva Lifestyle",
    avatar: "https://images.pexels.com/photos/7717254/pexels-photo-7717254.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280",
  },
  {
    quote:
      "One team delivered both design and code, so the launch had zero back-and-forth. The most professional studio we have worked with.",
    name: "Daniel Fernandes",
    role: "COO, Finstack Labs",
    avatar: "https://images.pexels.com/photos/14950779/pexels-photo-14950779.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280",
  },
  {
    quote:
      "Technical SEO was baked into their engineering. Organic traffic tripled in four months — and reports always arrive on time.",
    name: "Meera Raghavan",
    role: "Head of Marketing, Climbly",
    avatar: "https://images.pexels.com/photos/31868049/pexels-photo-31868049.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=200&w=280",
  },
];

/* --------------------------------- FAQs --------------------------------- */
export const faqs = [
  { q: "How soon can a project start?", a: "Kick-off usually happens 3–5 business days after the discovery call. Urgent builds can be fast-tracked with a priority slot (20% rush fee)." },
  { q: "Is pricing hourly or fixed?", a: "We use fixed-scope milestone pricing so you get predictability. After the discovery call you receive a written proposal with deliverables, timeline and payment split." },
  { q: "Can you work on our existing website or app?", a: "Yes. We handle both audits and rebuilds. Legacy systems start with a technical audit, followed by an incremental migration plan so business downtime stays at zero." },
  { q: "Who owns the code and design files?", a: "You do — 100%. On final payment, the repository, Figma files, credentials and documentation are all transferred to you." },
  { q: "Do you provide support after launch?", a: "Yes. 30 days of free bug support is included. After that, a monthly care plan covers monitoring, updates, small changes and a performance report." },
  { q: "Is SEO included or charged separately?", a: "Technical SEO (schema, metadata, sitemap, Core Web Vitals) is included in every website build. Content strategy and ongoing link acquisition sit under a separate growth retainer." },
];

/* -------------------------------- Pricing ------------------------------- */
export const packages = [
  {
    name: "Launch",
    price: "₹45,000",
    usd: "~$540",
    suffix: "starting price",
    best: false,
    desc: "A credibility website for new businesses that needs to be fast, clear and search-ready.",
    features: [
      "Up to 6 responsive pages",
      "Custom UI design in Figma",
      "Next.js + Tailwind build",
      "Technical SEO + analytics",
      "Contact form and CMS basics",
      "2 revision rounds · 3 weeks",
    ],
  },
  {
    name: "Growth",
    price: "₹1,20,000",
    usd: "~$1,440",
    suffix: "starting price",
    best: true,
    desc: "For scaling brands that need a web app, e-commerce experience or full product website.",
    features: [
      "Unlimited CMS-driven pages",
      "E-commerce or auth + dashboard",
      "Custom API + SQL data modelling",
      "Design system and component library",
      "SEO content architecture",
      "30 days support · 6–8 weeks",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    usd: "Monthly retainer",
    suffix: "dedicated squad",
    best: false,
    desc: "An ongoing product team covering design, engineering, SEO and video in one retainer.",
    features: [
      "Dedicated squad capacity",
      "App, web and video pipeline",
      "Monitoring, CI/CD and DevOps",
      "Monthly growth experiments",
      "Quarterly roadmap planning",
      "Priority Slack channel",
    ],
  },
];

/* -------------------------------- Portfolio ----------------------------- */
export type Project = {
  id: string;
  title: string;
  category: "Web" | "App" | "Design" | "Video";
  year: string;
  client: string;
  accent: string;
  summary: string;
  problem: string;
  solution: string;
  role: string;
  stack: string[];
  features: string[];
  challenges: string[];
  metrics: { value: string; label: string }[];
};

export const projects: Project[] = [
  {
    id: "kaas-dev-console",
    title: "KaaS Developer Console",
    category: "Web",
    year: "2025",
    client: "Finstack Labs",
    accent: "from-indigo-500/30 to-cyan-500/20",
    summary:
      "A multi-tenant SaaS console unifying real-time infrastructure metrics, role-based access and usage billing in a single dashboard.",
    problem:
      "The client's internal tool was a six-year-old jQuery monolith. With 40,000+ users the dashboard took 12 seconds to load and any new feature took three weeks to ship.",
    solution:
      "A modular rebuild on the Next.js App Router with TypeScript. Server components cut the initial payload by 68%, while Redis caching and BullMQ queues moved heavy analytics into background jobs.",
    role: "Design system, full-stack build, DevOps and monitoring",
    stack: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "Redis", "BullMQ", "Cloudinary", "Tailwind CSS"],
    features: [
      "Role-based access control with a full audit log",
      "Live infrastructure charts over WebSocket streams",
      "Usage-based billing engine with invoicing",
      "Command palette with saved custom views",
    ],
    challenges: [
      "Datadog and Sentry instrumentation exposed the p95 latency path, taking it from 12s to 1.1s",
      "An N+1 query storm was resolved with query batching and materialised views",
      "Zero-downtime migration achieved using dual writes behind feature flags",
    ],
    metrics: [
      { value: "1.1s", label: "p95 load" },
      { value: "-68%", label: "JS payload" },
      { value: "40k+", label: "Users served" },
    ],
  },
  {
    id: "kaarva-storefront",
    title: "Kaarva Headless Storefront",
    category: "Web",
    year: "2025",
    client: "Kaarva Lifestyle",
    accent: "from-fuchsia-500/25 to-indigo-500/20",
    summary:
      "A headless commerce experience with one-click checkout, live inventory sync and an image-heavy catalogue that still loads instantly.",
    problem:
      "Mobile conversion sat at 0.8% on a stock theme. The catalogue held 4,000+ SKUs and unoptimised product imagery was crushing page weight.",
    solution:
      "A headless storefront with ISR and edge caching, a Cloudinary transformation pipeline for imagery, and a guest-first checkout flow rebuilt around funnel analytics.",
    role: "UX research, storefront build, performance and SEO migration",
    stack: ["Next.js", "Shopify Storefront API", "Cloudinary", "Redis", "Vercel Edge", "Razorpay"],
    features: [
      "Faceted search with instant filtering",
      "Guest-first one-click checkout",
      "Wishlist and back-in-stock alerts",
      "Structured data for product rich results",
    ],
    challenges: [
      "A 4,000-SKU catalogue handled through edge-cached ISR with on-demand revalidation",
      "Cart abandonment rebuilt as a three-step flow after funnel analysis",
      "A complete 301 map preserved legacy URLs with zero organic traffic loss",
    ],
    metrics: [
      { value: "2.1×", label: "Conversion" },
      { value: "0.9s", label: "LCP" },
      { value: "3×", label: "Organic traffic" },
    ],
  },
  {
    id: "pulse-fitness-app",
    title: "Pulse Fitness App",
    category: "App",
    year: "2024",
    client: "Pulse Health",
    accent: "from-emerald-500/25 to-cyan-500/20",
    summary:
      "A cross-platform fitness companion with offline workout logging, wearable sync and a coach-side analytics dashboard.",
    problem:
      "The client ran separate iOS and Android web-wrappers, both stuck at a 3.2-star rating with a 4% crash rate.",
    solution:
      "A single React Native and Expo codebase with SQLite offline-first storage and a background sync queue. Sentry instrumentation lifted crash-free sessions to 99.6%.",
    role: "Product design, app architecture, build and store release",
    stack: ["React Native", "Expo", "TypeScript", "SQLite", "Node.js", "Sentry", "Firebase"],
    features: [
      "Offline-first workout logging",
      "HealthKit and Google Fit sync",
      "Coach dashboard with streak analytics",
      "Push notification habit loops",
    ],
    challenges: [
      "Background sync conflicts resolved with last-write-wins plus vector clocks",
      "Cold start reduced from 4.1s to 1.3s via Hermes and dependency pruning",
      "Store review cycles tightened to two days with Fastlane automation",
    ],
    metrics: [
      { value: "4.8★", label: "Store rating" },
      { value: "99.6%", label: "Crash-free" },
      { value: "1.3s", label: "Cold start" },
    ],
  },
  {
    id: "atlas-3d-brand",
    title: "Atlas Immersive Brand Site",
    category: "Design",
    year: "2025",
    client: "Atlas Robotics",
    accent: "from-sky-500/25 to-violet-500/20",
    summary:
      "A Three.js product-reveal site where scroll drives the WebGL scene, while accessibility and SEO scores stay above 90.",
    problem:
      "A hardware startup needed investors to physically feel the product on the web, on a tight budget and timeline.",
    solution:
      "A Next.js and Three.js (R3F) scene with progressive loading, a reduced-motion fallback and SSR-rendered content for search. Motion and sound design delivered in-house.",
    role: "Art direction, 3D scene, frontend build, motion design",
    stack: ["Three.js", "React Three Fiber", "Next.js", "GSAP", "Blender", "TypeScript"],
    features: [
      "Scroll-driven camera choreography",
      "Progressive GLTF with Draco compression",
      "Reduced-motion static fallback",
      "Interactive hotspots for specification detail",
    ],
    challenges: [
      "Scene weight reduced from 18MB to 1.9MB using Draco and texture atlases",
      "Mobile GPU throttling handled with adaptive device pixel ratio",
      "WebGL content made indexable through a pre-rendered HTML layer",
    ],
    metrics: [
      { value: "92", label: "Perf score" },
      { value: "1.9MB", label: "3D payload" },
      { value: "4:32", label: "Avg. session" },
    ],
  },
  {
    id: "climbly-growth",
    title: "Climly Growth Engine",
    category: "Web",
    year: "2024",
    client: "Climbly EdTech",
    accent: "from-amber-500/25 to-rose-500/20",
    summary:
      "A programmatic SEO platform generating 1,200 location and course pages, all holding green Core Web Vitals.",
    problem:
      "The client was heavily dependent on paid acquisition with almost no organic presence, and the content team had no publishing system.",
    solution:
      "A topic-cluster architecture with programmatic ISR templates, an editorial workflow in a headless CMS and an automated internal-linking engine.",
    role: "SEO architecture, CMS setup, content operations and reporting",
    stack: ["Next.js ISR", "Sanity", "PostgreSQL", "GA4", "GSC API", "Ahrefs"],
    features: [
      "1,200 programmatic landing pages",
      "Editorial workflow with approvals",
      "Automated internal-linking engine",
      "Live ranking and traffic dashboard",
    ],
    challenges: [
      "Thin-content risk resolved with entity enrichment and moderated UGC",
      "Crawl-budget waste fixed through sitemap segmentation",
      "Index bloat cleaned up with canonical and noindex rules",
    ],
    metrics: [
      { value: "3.4×", label: "Organic traffic" },
      { value: "1.2k", label: "Pages indexed" },
      { value: "-42%", label: "CAC" },
    ],
  },
  {
    id: "orbit-launch-film",
    title: "Orbit Launch Film Suite",
    category: "Video",
    year: "2025",
    client: "Orbit Wearables",
    accent: "from-violet-500/25 to-pink-500/20",
    summary:
      "A 90-second hero launch film plus 14 vertical ad cuts, all generated from a single brand motion system.",
    problem:
      "The launch required a different format for every platform, and the client had no motion language — each editor produced something off-brand.",
    solution:
      "We built one brand motion kit covering typography, transitions and sound palette, then derived 14 platform-specific cuts from the hero film using a template system.",
    role: "Creative direction, edit, motion graphics and sound design",
    stack: ["After Effects", "Premiere Pro", "DaVinci Resolve", "Blender", "Frame.io"],
    features: [
      "90-second cinematic hero film",
      "14 vertical and square ad variants",
      "Reusable brand motion kit",
      "Caption and localisation pipeline",
    ],
    challenges: [
      "15 deliverables produced from a single shoot using template-based compositing",
      "Hook variants A/B tested across the paid campaign",
      "Turnaround held to six days with a proxy workflow",
    ],
    metrics: [
      { value: "1.8M", label: "Views" },
      { value: "14", label: "Ad variants" },
      { value: "+27%", label: "CTR" },
    ],
  },
];

export const projectFilters = ["All", "Web", "App", "Design", "Video"] as const;

/* --------------------------------- Team --------------------------------- */
export const team = [
  {
    name: "Aarav Mehta",
    role: "Founder & Principal Engineer",
    initials: "AM",
    photo: "https://images.pexels.com/photos/28442318/pexels-photo-28442318.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=520&w=520",
    bio: "Eight years of engineering across SaaS and commerce. Owns architecture on Next.js, Node.js and SQL, plus everything monitoring and CI/CD related.",
    skills: ["Next.js", "TypeScript", "Node.js", "PostgreSQL", "AWS"],
  },
  {
    name: "Sanya Kapoor",
    role: "Head of Product Design",
    initials: "SK",
    photo: "https://images.pexels.com/photos/33680700/pexels-photo-33680700.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=520&w=520",
    bio: "A research-first designer running user interviews, design systems and conversion-focused interfaces — from Figma through developer handoff.",
    skills: ["Figma", "Design Systems", "UX Research", "Prototyping", "Motion"],
  },
  {
    name: "Rohan Iyer",
    role: "Motion & Growth Lead",
    initials: "RI",
    photo: "https://images.pexels.com/photos/38740728/pexels-photo-38740728.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=520&w=520",
    bio: "A storyteller who understands both the edit suite and the analytics dashboard. Runs launch films, ad creative and SEO content operations.",
    skills: ["After Effects", "Premiere Pro", "SEO", "Content", "Analytics"],
  },
];

/* ------------------------------- Tech stack ----------------------------- */
export type TechItem = { name: string; icon: string | null; note: string };
export type TechGroup = { id: string; title: string; blurb: string; items: TechItem[] };

export const techStack: TechGroup[] = [
  {
    id: "frontend",
    title: "Frontend",
    blurb: "Interfaces that load fast and stay pixel-accurate on every device.",
    items: [
      { name: "HTML5", icon: "html5/html5-original", note: "Semantic, accessible markup" },
      { name: "Tailwind CSS", icon: "tailwindcss/tailwindcss", note: "Design tokens and utilities" },
      { name: "JavaScript", icon: "javascript/javascript-original", note: "Vanilla JS fundamentals" },
      { name: "Three.js", icon: "threejs/threejs-original", note: "WebGL and 3D experiences" },
      { name: "React", icon: "react/react-original", note: "Component architecture" },
      { name: "Next.js", icon: "nextjs/nextjs-original", note: "SSR, ISR and edge rendering" },
      { name: "TypeScript", icon: "typescript/typescript-original", note: "Type safety end to end" },
      { name: "Framer Motion", icon: null, note: "Interaction and transitions" },
    ],
  },
  {
    id: "backend",
    title: "Backend",
    blurb: "APIs that stay predictable, documented and testable.",
    items: [
      { name: "Node.js", icon: "nodejs/nodejs-original", note: "Runtime for every service" },
      { name: "Express", icon: "express/express-original", note: "REST API layer" },
      { name: "NestJS", icon: "nestjs/nestjs-original", note: "Structured enterprise services" },
      { name: "GraphQL", icon: "graphql/graphql-plain", note: "Client-driven data queries" },
      { name: "Redis", icon: "redis/redis-original", note: "Caching, sessions, rate limits" },
      { name: "BullMQ", icon: null, note: "Queues and background workers" },
      { name: "Prisma", icon: "prisma/prisma-original", note: "Typed database ORM" },
      { name: "Stripe", icon: null, note: "Payments and subscriptions" },
      { name: "PHP", icon: "php/php-original", note: "Legacy & shared-hosting APIs" },
      { name: "Laravel", icon: "laravel/laravel-original", note: "Full PHP application framework" },
      { name: "Composer", icon: "composer/composer-original", note: "PHP dependency management" },
    ],
  },
  {
    id: "database",
    title: "Database & Storage",
    blurb: "Data modelling that still breathes at scale.",
    items: [
      { name: "PostgreSQL", icon: "postgresql/postgresql-original", note: "Relational source of truth" },
      { name: "MySQL", icon: "mysql/mysql-original", note: "Legacy and shared hosting" },
      { name: "SQL", icon: "azure/sql-database", note: "Migrations, views, tuning" },
      { name: "MongoDB", icon: "mongodb/mongodb-original", note: "Flexible document storage" },
      { name: "SQLite", icon: "sqlite/sqlite-original", note: "Offline-first mobile storage" },
      { name: "Cloudinary", icon: null, note: "Media pipeline and optimisation" },
      { name: "S3 / R2", icon: null, note: "Object storage and backups" },
      { name: "Supabase", icon: "supabase/supabase-original", note: "Auth and realtime Postgres" },
    ],
  },
  {
    id: "devops",
    title: "DevOps & Monitoring",
    blurb: "Deployments should be boring — boring means reliable.",
    items: [
      { name: "Git", icon: "git/git-original", note: "Trunk-based workflow" },
      { name: "GitHub Actions", icon: "github/github-original", note: "CI/CD pipelines" },
      { name: "Docker", icon: "docker/docker-original", note: "Reproducible environments" },
      { name: "Vercel", icon: "vercel/vercel-original", note: "Frontend hosting and edge" },
      { name: "Datadog", icon: null, note: "APM, logs and uptime alerts" },
      { name: "Sentry", icon: null, note: "Error and release tracking" },
      { name: "Playwright", icon: "playwright/playwright-original", note: "E2E regression suite" },
      { name: "Cloudflare", icon: "cloudflare/cloudflare-original", note: "CDN, DNS and WAF" },
      { name: "Adminer", icon: null, note: "Lightweight DB administration" },
      { name: "Nginx", icon: "nginx/nginx-original", note: "Reverse proxy and static serving" },
    ],
  },
  {
    id: "design-media",
    title: "Design & Media",
    blurb: "The craft tools we open every single day.",
    items: [
      { name: "Figma", icon: "figma/figma-original", note: "UI design and systems" },
      { name: "Storybook", icon: "storybook/storybook-original", note: "Component documentation" },
      { name: "After Effects", icon: null, note: "Motion graphics and VFX" },
      { name: "Premiere Pro", icon: null, note: "Long-form video editing" },
      { name: "DaVinci Resolve", icon: null, note: "Colour grading" },
      { name: "Blender", icon: "blender/blender-original", note: "3D assets and renders" },
    ],
  },
];

/* ------------------------------ Build method ---------------------------- */
export const buildPath = [
  { title: "Foundation", desc: "Semantic HTML5 structure, a Tailwind CSS design system and vanilla JS interactions.", tag: "HTML5 · Tailwind · JS" },
  { title: "Componentise", desc: "Convert the layout into React and Next.js components with strict TypeScript types.", tag: "React · Next.js · TS" },
  { title: "Elevate visually", desc: "Three.js scenes, shader-driven effects and motion for a premium feel.", tag: "Three.js · GSAP" },
  { title: "Wire the backend", desc: "Node.js and Express services, SQL schema, auth, caching and job queues.", tag: "Node · Express · SQL" },
  { title: "Harden & ship", desc: "Datadog and Sentry monitoring, CI/CD, edge deployment and SEO verification.", tag: "CI/CD · Monitoring" },
];

export const studioImages = {
  workspace:
    "https://images.pexels.com/photos/6804068/pexels-photo-6804068.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=760&w=1200",
  design:
    "https://images.pexels.com/photos/7675029/pexels-photo-7675029.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=760&w=1200",
  focus:
    "https://images.pexels.com/photos/8100052/pexels-photo-8100052.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=760&w=1200",
};
