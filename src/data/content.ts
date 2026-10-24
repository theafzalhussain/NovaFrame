/* ================================================================
   Novaframe Studio — default content
   ----------------------------------------------------------------
   These are the seed values. On first run the API copies them into
   the database; after that every section is edited from /#/admin.
   Real data sourced from github.com/theafzalhussain and
   afzalhussain.tech — no invented clients, logos or testimonials.
   ================================================================ */
import type {
  AdvancedSettings,
  Faq,
  Highlight,
  Milestone,
  PricingPackage,
  ProcessStep,
  Project,
  Service,
  SiteSettings,
  TeamMember,
  TechGroup,
  Testimonial,
} from "./types";

export const siteSettings: SiteSettings = {
  name: "Novaframe Studio",
  legal: "Novaframe Studio",
  short: "Novaframe",
  tagline: "Digital products, engineered to perform.",
  description:
    "Novaframe is a founder-led digital studio in New Delhi. We design and engineer fast websites, web apps, online stores and PWAs — on the same React, Next.js and Node.js stack behind five live products you can open today.",
  founded: "2026",

  email: "theafzalhussain786@gmail.com",
  phone: "+91 84478 59784",
  whatsapp: "918447859784",
  whatsappMessage: "Hi Novaframe! I'd like to discuss a project.",

  location: "New Delhi, India · Working worldwide",
  city: "New Delhi",
  country: "IN",
  timezone: "Asia/Kolkata",
  timezoneLabel: "IST",
  hours: "Mon – Sat, 10:00 – 19:00 IST",
  workingHours: { start: 10, end: 19, days: [1, 2, 3, 4, 5, 6] },
  responseTime: "We reply within 12 business hours",

  availability: { slotsOpen: 2, note: "Taking on new projects this month" },
  announcement: {
    enabled: true,
    text: "Founding client program — 20% off and 60 days of free support for our first five clients.",
    linkLabel: "Claim a slot",
    link: "/pricing",
  },
  hero: {
    eyebrow: "Founder-led product studio · New Delhi",
    title: "We engineer digital products that",
    rotating: ["perform.", "convert.", "scale.", "endure."],
    subtitle:
      "Websites, web apps, online stores and PWAs — designed with restraint and engineered on the production stack behind five live products you can open right now.",
  },
  stats: [
    { value: 5, suffix: "", label: "Live products shipped" },
    { value: 45, suffix: "+", label: "REST endpoints in production" },
    { value: 90, suffix: "+", label: "Lighthouse on shipped work" },
    { value: 12, suffix: "h", label: "Reply time, business hours" },
  ],
  founding: {
    enabled: true,
    eyebrow: "Founding client program",
    title: "Become one of our first",
    highlight: "five founding clients.",
    note: "We're a young studio — so instead of borrowed logos and invented testimonials, we earn your trust with live products, public code, written guarantees and founding-client pricing we won't offer again.",
    slotsTotal: 5,
    slotsLeft: 5,
    perks: [
      { icon: "gift", title: "20% founding discount", desc: "On any package or custom scope — locked in for your first project." },
      { icon: "shield", title: "60 days of free support", desc: "Double our standard post-launch cover for fixes and small tweaks." },
      { icon: "chat", title: "Direct line to the founder", desc: "A shared WhatsApp group with the engineer building your product." },
      { icon: "sparkle", title: "Featured case study", desc: "With your approval, your project is showcased here — free exposure for your brand." },
    ],
  },
  booking: {
    slots: ["10:30 AM", "11:45 AM", "02:00 PM", "03:30 PM", "05:00 PM", "06:15 PM"],
    durationMinutes: 30,
    daysAhead: 10,
    meetingTool: "Google Meet",
  },
  socials: [
    { label: "GitHub", href: "https://github.com/theafzalhussain", icon: "github" },
    { label: "LinkedIn", href: "https://www.linkedin.com/in/theafzalhussain/", icon: "linkedin" },
    { label: "Instagram", href: "https://www.instagram.com/theafzal_hussain_786", icon: "instagram" },
    { label: "Portfolio", href: "https://www.afzalhussain.tech/", icon: "globe" },
  ],
};

/* ------------------------------- Services ------------------------------- */
export const services: Service[] = [
  {
    id: "web",
    icon: "code",
    title: "Web Development",
    tagline: "Fast, SEO-first websites and web applications",
    short:
      "Marketing sites, online stores and full platforms built on React, Next.js and TypeScript — engineered against Core Web Vitals, not just design mockups.",
    deliverable: "Live deployment + repository + documentation",
    startingAt: "₹45,000",
    timeline: "3–8 weeks",
    items: [
      { title: "Business Websites", desc: "Pixel-accurate, component-driven websites with a private design system." },
      { title: "E-commerce Stores", desc: "Catalogue, cart, coupons and Razorpay checkout — the same patterns behind eShopper." },
      { title: "Web Applications", desc: "Authentication, roles, dashboards and real-time data for full product builds." },
      { title: "CMS & Admin Panels", desc: "Edit every section yourself — no developer needed for day-to-day changes." },
      { title: "Performance Engineering", desc: "Image pipelines, code-splitting and caching that keep Lighthouse at 90+." },
      { title: "Care & Maintenance", desc: "Monitoring, security patches, uptime checks and monthly performance reports." },
    ],
    stack: ["React", "Next.js", "TypeScript", "Tailwind CSS", "Node.js"],
  },
  {
    id: "backend",
    icon: "server",
    title: "Backend, APIs & Admin",
    tagline: "The engine room: payments, data and real-time",
    short:
      "Node.js and Express APIs with caching, queues, payments and live updates — plus the admin dashboards your team runs the business from.",
    deliverable: "Documented API + admin panel + deployment",
    startingAt: "₹60,000",
    timeline: "4–8 weeks",
    items: [
      { title: "REST API Engineering", desc: "Validated, versioned endpoints with auth, roles and rate limiting." },
      { title: "Payment Integration", desc: "Razorpay orders, server-side signature verification, webhooks and refunds." },
      { title: "Real-time Features", desc: "Socket.IO order tracking, notifications and live dashboards." },
      { title: "Caching & Queues", desc: "Redis caching with graceful fallback and BullMQ background workers." },
      { title: "Admin Dashboards", desc: "Orders, users, analytics and content management in one secure console." },
      { title: "Email & Notifications", desc: "Transactional email, OTP flows and web-push notifications." },
    ],
    stack: ["Node.js", "Express", "MongoDB", "Redis", "BullMQ", "Socket.IO"],
  },
  {
    id: "app",
    icon: "phone",
    title: "App Development",
    tagline: "Installable apps that feel native on every screen",
    short:
      "Progressive Web Apps and cross-platform builds with offline storage, push notifications and app-store-grade polish — one codebase, every device.",
    deliverable: "Installable PWA or store-ready builds",
    startingAt: "₹1,20,000",
    timeline: "6–12 weeks",
    items: [
      { title: "Progressive Web Apps", desc: "Installable, offline-capable apps with service workers and web push." },
      { title: "Cross-platform Apps", desc: "React Native and Expo when you need the app stores — one codebase." },
      { title: "Smart-TV Interfaces", desc: "D-pad navigation and TV-optimised layouts, as shipped in MovieZone." },
      { title: "Push & Deep Linking", desc: "Notification systems, reminders and attribution-ready analytics events." },
      { title: "Offline-first Data", desc: "Local caching and background sync so nothing is lost without signal." },
      { title: "Release & Iteration", desc: "Crash monitoring, feature flags and a steady release train." },
    ],
    stack: ["PWA", "Service Worker", "Web Push", "React Native", "Expo"],
  },
  {
    id: "design",
    icon: "layers",
    title: "UI/UX Design",
    tagline: "Interfaces engineered to convert, not just impress",
    short:
      "Research-led product design from discovery to design-system handoff — every screen validated against a user flow and a business objective.",
    deliverable: "Figma files, prototype and documented design system",
    startingAt: "₹35,000",
    timeline: "2–4 weeks",
    items: [
      { title: "Responsive Web Design", desc: "Mobile-first layouts verified from 320px through ultrawide breakpoints." },
      { title: "Brand & Visual Direction", desc: "Type, colour and motion language that makes a young brand look established." },
      { title: "User Research", desc: "Interviews, personas and journey mapping before a single pixel is drawn." },
      { title: "Wireframes & Prototypes", desc: "Clickable prototypes for fast, low-cost stakeholder validation." },
      { title: "Design Systems", desc: "Tokens, components and documentation your engineers can actually implement." },
      { title: "UX Audit", desc: "Heuristic and analytics review delivered as a prioritised fix list." },
    ],
    stack: ["Figma", "Design Tokens", "Framer Motion", "Three.js", "Tailwind CSS"],
  },
  {
    id: "seo",
    icon: "search",
    title: "SEO & Growth",
    tagline: "Technical SEO built into the architecture",
    short:
      "Beyond keywords: server-rendered pages, schema, sitemaps and Core Web Vitals. Growth is reported monthly, with numbers you can audit.",
    deliverable: "Technical audit, implementation and monthly growth report",
    startingAt: "₹25,000/mo",
    timeline: "Ongoing",
    items: [
      { title: "Technical SEO", desc: "SSR/ISR routes, canonical logic, sharded sitemaps and crawl debugging." },
      { title: "Structured Data", desc: "JSON-LD for products, articles and organisations — rich results ready." },
      { title: "Core Web Vitals", desc: "LCP, CLS and INP fixes measured on real mid-range phones." },
      { title: "On-Page SEO", desc: "Titles, metadata, internal linking and content hierarchy." },
      { title: "Local SEO", desc: "Business profile optimisation and location landing pages." },
      { title: "Analytics & Reporting", desc: "GA4 and Search Console dashboards with monthly growth reviews." },
    ],
    stack: ["Next.js SSR", "Schema.org", "GA4", "Search Console", "Lighthouse CI"],
  },
  {
    id: "video",
    icon: "play",
    title: "Video & Motion",
    tagline: "Motion design that sells the product story",
    short:
      "Launch films, product demos and social creatives — scripting, edit, motion graphics and sound handled by one accountable team.",
    deliverable: "Master files + platform-specific exports",
    startingAt: "₹25,000",
    timeline: "1–3 weeks",
    items: [
      { title: "Promotional Videos", desc: "Product launch films with hook-first scripting and a brand motion kit." },
      { title: "Product Demos", desc: "Screen-recorded flows polished with zooms, captions and voice-over." },
      { title: "Social Media Content", desc: "Reels, shorts and vertical cuts engineered for retention." },
      { title: "Motion Graphics", desc: "Kinetic typography, logo stings, UI walkthroughs and data animation." },
      { title: "Corporate Videos", desc: "Founder stories and explainers for investors and partners." },
      { title: "Ad Creative Variants", desc: "Multiple hook variants per concept for paid campaign testing." },
    ],
    stack: ["After Effects", "Premiere Pro", "DaVinci Resolve", "Figma", "CapCut"],
  },
];

/* ------------------------------- Projects ------------------------------- */
export const projects: Project[] = [
  {
    id: "eshopper",
    title: "eShopper",
    subtitle: "Full-stack fashion commerce platform",
    category: "E-commerce",
    year: "2026",
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "https://eshopperr.me",
    repoUrl: "https://github.com/theafzalhussain/eshopper",
    cover: "/projects/eshopper.jpg",
    visual: "browser",
    featured: true,
    summary:
      "A production fashion retail platform covering the whole commercial lifecycle — catalogue discovery, cart and coupon pricing, Razorpay checkout, fulfilment with delivery OTP, customer returns with automated refunds and a membership tier system.",
    problem:
      "Most store templates stop at a pretty catalogue. Real commerce lives in the hard parts — payment verification, refunds that must never double-issue, live order status and a cache that survives a busy sale. eShopper was built to own every one of those parts, end to end.",
    solution:
      "A React storefront (Redux Toolkit + Saga) over an Express API with 16 Mongoose models. Redis caches hot reads with an automatic in-memory fallback, four BullMQ queues move mail, refunds, reports and image work off the request path, and Socket.IO pushes live order state with identity derived on the server.",
    role: "Architecture, full-stack engineering, payments, DevOps and monitoring",
    stack: ["React", "Redux Toolkit", "Redux Saga", "Material UI", "Node.js", "Express", "MongoDB", "Mongoose", "Redis", "BullMQ", "Socket.IO", "Razorpay", "Cloudinary", "Sentry"],
    features: [
      "Razorpay checkout with server-side HMAC signature verification and webhook reconciliation",
      "Coupon engine with usage caps, first-order rules and validity windows",
      "Order status machine with delivery OTP and a stored status timeline",
      "Customer returns with automated, idempotent refunds",
      "Silver / Gold / Elite membership tiers from lifetime orders",
      "Admin analytics, low-stock alerts and PDF invoices with QR codes",
    ],
    challenges: [
      "Redis cache silently degrades to in-memory when the managed quota runs out — the API keeps serving",
      "Refund jobs carry idempotency keys and attempt counters, so a refund is never issued twice",
      "Socket.IO rooms derive identity on the server — no client can join the admin channel by claiming to",
      "Vercel Edge middleware injects canonical tags and JSON-LD into the SPA shell before crawlers see it",
    ],
    metrics: [
      { value: "30+", label: "REST endpoints" },
      { value: "16", label: "Data models" },
      { value: "~60%", label: "Fewer DB reads" },
      { value: "90+", label: "Lighthouse" },
    ],
  },
  {
    id: "moviezone",
    title: "MovieZone",
    subtitle: "Installable movie & TV discovery PWA",
    category: "PWA",
    year: "2026",
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "https://moviezone.dev",
    repoUrl: "https://github.com/theafzalhussain/Moviezonne",
    cover: "/projects/moviezone.jpg",
    visual: "browser",
    featured: true,
    summary:
      "A movie and TV discovery platform on the TMDB API, shipped as an installable PWA with a dedicated Smart-TV interface, server-rendered SEO pages, web push and an automated performance test suite.",
    problem:
      "Discovery apps feel broken the moment their upstream API slows down — and hash-routed single-page apps are invisible to search engines. The goal: a framework-free PWA that stays fast and usable even when its data source is struggling.",
    solution:
      "A vanilla JavaScript client with a service worker, web push and a TV module for D-pad navigation. Every TMDB call passes through an Express proxy with caching, request coalescing, retry with backoff, dual-host failover and a 24-hour stale fallback, while a server-rendered layer generates crawlable pages for every title.",
    role: "Product design, frontend engineering, SSR/SEO layer, PWA and performance testing",
    stack: ["JavaScript", "Express", "TMDB API", "Service Worker", "Web Push", "node-cache", "MongoDB", "Cloudflare Workers"],
    features: [
      "Installable PWA with an offline shell and a capped image cache",
      "Smart-TV mode with D-pad spatial navigation",
      "Server-rendered SEO pages, JSON-LD and sharded sitemaps",
      "Fuzzy search powered by a custom 3 KB matcher",
      "Release reminders over VAPID web push",
    ],
    challenges: [
      "Upstream resilience — coalescing, bounded retries and a 24-hour stale cache instead of error pages",
      "Asset sealing fails the build when a changed bundle forgets its version bump",
      "TV mode detected from real hardware signals, never from screen size",
      "Around thirty standalone checks gate Core Web Vitals, SEO output and resilience",
    ],
    metrics: [
      { value: "~30", label: "Automated checks" },
      { value: "24h", label: "Stale fallback" },
      { value: "90+", label: "Lighthouse PWA" },
      { value: "0", label: "Framework deps" },
    ],
  },
  {
    id: "the-chronicle",
    title: "The Chronicle",
    subtitle: "Bilingual English & Hindi news app",
    category: "Web App",
    year: "2025",
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "https://mynews-web.vercel.app",
    repoUrl: "https://github.com/theafzalhussain/News-Web",
    cover: "/projects/the-chronicle.jpg",
    visual: "browser",
    featured: true,
    summary:
      "English and Hindi news discovery that aggregates GNews and RSS feeds into one normalised, deduplicated timeline — with search, a trending carousel, a breaking-news ticker and infinite scroll.",
    problem:
      "Free news APIs impose tight quotas and fail without warning, and most readers ignore India's bilingual audience. The brief: a news reader that never shows an empty feed — in English or Hindi.",
    solution:
      "A Next.js App Router build in strict TypeScript. One server route aggregates GNews with Bing and Google News RSS fallbacks, deduplicates and paginates the merged feed, and serves stale-but-valid content for up to 24 hours if every source fails. SWR drives infinite scroll on the client.",
    role: "UI/UX design, Next.js engineering, data layer and internationalisation",
    stack: ["Next.js", "React 19", "TypeScript", "Tailwind CSS v4", "SWR", "Framer Motion", "GNews API"],
    features: [
      "English ↔ Hindi toggle across every string, category and date",
      "Multi-source aggregation with cross-page deduplication",
      "Infinite scroll that pre-loads before the reader reaches the end",
      "Trending carousel and a requestAnimationFrame breaking ticker",
    ],
    challenges: [
      "Three-tier caching — in-memory, fetch revalidation and CDN hints",
      "Quota-friendly SWR tuning cut outbound API calls by about half",
      "Dedicated Devanagari typography wired into the type scale",
    ],
    metrics: [
      { value: "2", label: "Languages" },
      { value: "~50%", label: "Fewer API calls" },
      { value: "24h", label: "Stale fallback" },
      { value: "94%", label: "TypeScript" },
    ],
  },
  {
    id: "saarthi",
    title: "SAARTHI",
    subtitle: "Hinglish personal AI agent",
    category: "AI",
    year: "2026",
    client: "In-house product",
    kind: "studio",
    status: "Open source",
    liveUrl: "",
    repoUrl: "https://github.com/theafzalhussain/Sarthi",
    visual: "terminal",
    preview: [
      "tu      › bhai paytm khol ke dhai hazaar ka bijli ka bill bhar de",
      "saarthi › Paytm khol diya. Electricity section pe hun.",
      "saarthi › Ruk ja — ₹2500 ka payment hai. Confirm kar?",
      "tu      › haan kar de",
      "saarthi › Done ✓  Receipt Downloads mein save kar di.",
    ],
    featured: true,
    summary:
      "A lightweight personal AI agent that understands Hinglish and safely controls your devices — running on a local model, on modest hardware, with no API key required.",
    problem:
      "Global assistants stumble on code-mixed Hindi-English — task success drops sharply when people speak the way hundreds of millions of Indians actually do. Most agents also need a cloud API key and a powerful machine.",
    solution:
      "A Python agent (with a small Kotlin component) that runs on a local Ollama model chosen by available RAM. A one-line PowerShell installer sets up Python, a private virtual environment, the model and desktop shortcuts — and every sensitive action asks for confirmation first.",
    role: "Product concept, Python engineering, installer and safety design",
    stack: ["Python", "Kotlin", "Ollama", "Qwen 2.5", "PowerShell"],
    features: [
      "Understands natural Hinglish commands",
      "Local-first — runs on a local model, no API key required",
      "One-command Windows installer with shortcuts",
      "Confirmation before payments or risky actions",
      "Global CLI that works inside any project folder",
    ],
    challenges: [
      "Model size (3B or 7B) chosen automatically from the machine's RAM",
      "Provider keys are never bundled — designed around a server-side key proxy",
      "Project .env files are not loaded by default, for safety",
    ],
    metrics: [
      { value: "1-line", label: "Windows installer" },
      { value: "0", label: "API keys needed" },
      { value: "3B/7B", label: "RAM-aware local model" },
      { value: "Offline", label: "Runs on your machine" },
    ],
  },
  {
    id: "world-explorer",
    title: "World Explorer",
    subtitle: "Typed full-stack data explorer",
    category: "Web App",
    year: "2025",
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "https://myrest-country.vercel.app",
    repoUrl: "https://github.com/theafzalhussain/New-RestCountry",
    cover: "/projects/world-explorer.jpg",
    visual: "browser",
    featured: false,
    summary:
      "An explorer for 250 countries with debounced search, region filters, sorting, border-country navigation and detailed views — served over a typed Express API.",
    problem:
      "Data-heavy lists get sluggish fast: every keystroke fires a request and every revisit refetches the same payload. A 250-country dataset was the proving ground for search, caching and typed API contracts.",
    solution:
      "React and TypeScript on the client with TanStack Query for caching and request de-duplication, a 300 ms debounced search and an Express API whose typed responses are shared end to end.",
    role: "Frontend engineering, API design and performance",
    stack: ["React", "TypeScript", "Express", "Tailwind CSS", "TanStack Query"],
    features: [
      "Instant debounced search across 250 countries",
      "Region filters and multi-key sorting",
      "Border-country navigation between detail views",
      "Typed API responses shared end to end",
    ],
    challenges: [
      "TanStack Query caching cut redundant requests by roughly 70%",
      "Debounce tuned to 300 ms to balance responsiveness and load",
      "Skeleton states keep the layout stable while data streams in",
    ],
    metrics: [
      { value: "250", label: "Countries" },
      { value: "300ms", label: "Search debounce" },
      { value: "~70%", label: "Fewer requests" },
      { value: "96%", label: "TypeScript" },
    ],
  },
  {
    id: "founder-portfolio",
    title: "Founder Portfolio",
    subtitle: "Next.js site with a real contact pipeline",
    category: "Website",
    year: "2026",
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "https://www.afzalhussain.tech",
    repoUrl: "https://github.com/theafzalhussain/Portfolio",
    cover: "/projects/portfolio.jpg",
    visual: "browser",
    featured: false,
    summary:
      "A Next.js App Router portfolio with a real-time WebGL hero and a genuine server-side contact pipeline — validation, honeypot, rate limiting, MongoDB persistence and two transactional emails per message.",
    problem:
      "Most portfolio contact forms are decorative: they look fine and silently drop messages. This site treats every enquiry like production data.",
    solution:
      "Next.js route handlers validate each submission, reject honeypot hits, rate-limit per IP, persist to MongoDB Atlas through Mongoose and send an owner notification plus a confirmation email over SMTP. The hero is a React Three Fiber scene that freezes for reduced-motion users.",
    role: "Design, frontend engineering, 3D and backend pipeline",
    stack: ["Next.js", "React 19", "TypeScript", "Tailwind CSS v4", "Three.js", "React Three Fiber", "MongoDB", "Nodemailer"],
    features: [
      "WebGL hero with mouse parallax and a reduced-motion fallback",
      "Contact API with honeypot and sliding-window rate limit",
      "Owner notification and confirmation email on every send",
      "Filterable skills grid and an animated experience timeline",
    ],
    challenges: [
      "3D scene loads client-only so first paint stays fast",
      "Rate limited to 5 requests per minute per IP",
      "Accessibility kept at 95+ despite heavy motion",
    ],
    metrics: [
      { value: "20+", label: "Components" },
      { value: "95+", label: "Accessibility" },
      { value: "5/min", label: "Rate limit" },
      { value: "2", label: "Emails per send" },
    ],
  },
];

/* -------------------------------- Pricing ------------------------------- */
export const packages: PricingPackage[] = [
  {
    id: "launch",
    name: "Launch",
    price: "₹45,000",
    usd: "~$540",
    suffix: "starting price",
    best: false,
    timeline: "3–4 weeks",
    idealFor: "New businesses & personal brands",
    desc: "A credibility website that is fast, clear and search-ready from day one.",
    features: [
      "Up to 6 responsive pages",
      "Custom UI design",
      "React / Next.js + Tailwind build",
      "Technical SEO + analytics",
      "Contact form wired to your inbox",
      "2 revision rounds",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    price: "₹1,20,000",
    usd: "~$1,440",
    suffix: "starting price",
    best: true,
    timeline: "6–8 weeks",
    idealFor: "Startups, online stores & SaaS MVPs",
    desc: "For brands that need a web app, an online store or a full product website with an admin panel.",
    features: [
      "Unlimited CMS-driven pages",
      "E-commerce or auth + dashboard",
      "Custom API + database modelling",
      "Admin panel to manage content & leads",
      "Payments (Razorpay) integration",
      "30 days of post-launch support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: "Custom",
    usd: "Monthly retainer",
    suffix: "dedicated capacity",
    best: false,
    timeline: "Ongoing",
    idealFor: "Growing teams that need a product partner",
    desc: "An ongoing product partnership covering engineering, design, SEO and video in one retainer.",
    features: [
      "Dedicated monthly capacity",
      "Web, app and video pipeline",
      "Monitoring, CI/CD and DevOps",
      "Monthly growth experiments",
      "Quarterly roadmap planning",
      "Priority WhatsApp channel",
    ],
  },
];

/* --------------------------------- Team --------------------------------- */
export const team: TeamMember[] = [
  {
    id: "afzal-hussain",
    name: "Afzal Hussain",
    role: "Founder · Lead Engineer",
    initials: "AH",
    photo: "/team/afzal-hussain.jpg",
    location: "New Delhi, India",
    focus: "Full-stack product engineering — React, Next.js, Node.js",
    bio: "Afzal builds the products Novaframe ships. He learned by shipping software that has to stay up — which is why his work has cache layers, retry logic, worker queues and admin screens rather than just a pretty landing page. His flagship build, eShopper, runs Razorpay payments, 16 data models, Redis caching and live order updates over Socket.IO.",
    quote: "Ask me about any file in any of our repositories, and I'll walk you through the decision behind it.",
    skills: ["React", "Next.js", "TypeScript", "Node.js", "Express", "MongoDB", "Redis", "BullMQ", "Tailwind CSS", "Three.js", "Python"],
    credentials: [
      { title: "MCA — Computer Applications", org: "IGNOU, New Delhi", year: "In progress" },
      { title: "BCA — First Division", org: "Maharshi Dayanand University, Rohtak", year: "" },
      { title: "MERN Stack Development", org: "DUCAT, Delhi", year: "2023" },
      { title: "Web Development — 6-month program", org: "World Class Skill Centre, Delhi", year: "2023" },
      { title: "Cybersecurity & AI Basics", org: "NIIT Foundation", year: "2023" },
    ],
    links: [
      { label: "GitHub", href: "https://github.com/theafzalhussain" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/theafzalhussain/" },
      { label: "Portfolio", href: "https://www.afzalhussain.tech/" },
    ],
  },
  {
    id: "vijay",
    name: "Vijay Kumar",
    role: "PHP Laravel Developer",
    initials: "VK",
    photo: "/team/vijay.jpg",
    location: "India",
    focus: "Laravel web applications, REST APIs and database-driven systems",
    headline: "Building modern, scalable and user-friendly web applications",
    bio: "Vijay is a PHP Laravel developer with hands-on experience in web development. He specialises in building responsive websites, dynamic web applications, REST APIs and database-driven systems using modern web technologies.",
    goal: "To build secure, efficient and scalable web solutions that help businesses grow online.",
    email: "vijayykumar785@gmail.com",
    skills: ["PHP", "Laravel", "HTML5", "CSS3", "JavaScript", "Bootstrap", "React", "MySQL", "Git", "GitHub", "VS Code"],
    skillGroups: [
      { label: "Backend", items: ["PHP", "Laravel"] },
      { label: "Frontend", items: ["HTML5", "CSS3", "JavaScript", "Bootstrap", "React"] },
      { label: "Database", items: ["MySQL"] },
      { label: "Tools", items: ["Git", "GitHub", "VS Code"] },
    ],
    services: [
      "Custom website development",
      "Laravel web applications",
      "REST API development",
      "Admin panels & CRUD systems",
      "Database design & integration",
      "Responsive UI development",
    ],
    links: [
      { label: "GitHub", href: "https://github.com/codewithrishee" },
      { label: "Portfolio", href: "https://codewithrishee.github.io/vijayy-portfolio/" },
    ],
  },
  {
    id: "om-gupta",
    name: "Om Gupta",
    role: "Lead Generation Specialist & Web Developer",
    initials: "OG",
    photo: "/team/om-gupta.jpg",
    location: "Delhi-NCR, India",
    focus: "Responsive front-end development with HTML, CSS, JavaScript and WordPress",
    headline: "Building responsive, user-friendly websites that stand out",
    bio: "Om is a web developer with hands-on experience building responsive, user-friendly websites using HTML, CSS, JavaScript and WordPress. Through a 6-month web development training he built multiple projects focused on modern, interactive and mobile-friendly design, and he enjoys solving problems and turning ideas into functional websites.",
    goal: "To contribute to real-world projects, collaborate with dynamic teams and grow into a versatile developer who delivers impactful digital experiences.",
    email: "omgupta9592@gmail.com",
    skills: ["HTML5", "CSS3", "JavaScript", "Bootstrap", "PHP", "MySQL", "WordPress", "GitHub", "Netlify"],
    skillGroups: [
      { label: "Frontend", items: ["HTML5", "CSS3", "JavaScript", "Bootstrap"] },
      { label: "Backend & Database", items: ["PHP", "MySQL"] },
      { label: "CMS", items: ["WordPress"] },
      { label: "Tools & Hosting", items: ["GitHub", "Netlify"] },
    ],
    services: [
      "Responsive website development",
      "Front-end development (HTML, CSS, JavaScript)",
      "Bootstrap & mobile-first UI",
      "WordPress websites",
      "PHP & MySQL integration",
      "Deployment on Netlify & GitHub Pages",
    ],
    credentials: [
      { title: "Web Development Course", org: "World Class Skill Centre (WCSC)", year: "2025" },
      { title: "Diploma — Computer Operator & Programming Assistant (COPA)", org: "", year: "2024" },
      { title: "12th (CBSE)", org: "Sarvodaya Bal Vidyalaya", year: "2023" },
      { title: "BA — Political Science", org: "Delhi University", year: "2023 – 2026" },
      { title: "Certified: AI-Powered People Manager", org: "", year: "" },
    ],
    links: [
      { label: "GitHub", href: "https://github.com/Om9592" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/om-gupta-5b8361304/" },
      { label: "Portfolio", href: "https://om-portfoli.netlify.app/" },
    ],
  },
];

/* ------------------------------ Testimonials ---------------------------- */
/* Intentionally empty — add real client words from the admin once earned. */
export const testimonials: Testimonial[] = [];

/* --------------------------------- FAQs --------------------------------- */
export const faqs: Faq[] = [
  {
    id: "trust",
    q: "You're a young studio — why should we trust you with our project?",
    a: "Because you don't have to take our word for it. Every product in our portfolio is live, and its code is public on GitHub — open it before you sign. Everything is agreed in writing, payments are milestone-based so you never pay for work you haven't seen, and you own 100% of the code and design files.",
  },
  {
    id: "who",
    q: "Who will actually work on my project?",
    a: "The founder, Afzal Hussain, leads every engagement personally — architecture, code and the weekly demo. If a project ever needs an extra specialist, you'll know exactly who they are before they start, and they work under the same contract and NDA.",
  },
  {
    id: "start",
    q: "How soon can a project start?",
    a: "Kick-off usually happens 3–5 business days after the discovery call. Urgent builds can be fast-tracked with a priority slot (20% rush fee).",
  },
  {
    id: "pricing",
    q: "Is pricing hourly or fixed?",
    a: "Fixed-scope milestone pricing, so you get predictability. After the discovery call you receive a written proposal with deliverables, timeline and payment split — typically 40 / 40 / 20.",
  },
  {
    id: "ownership",
    q: "Who owns the code and design files?",
    a: "You do — 100%. On final payment, the repository, design files, credentials and documentation are all transferred to you.",
  },
  {
    id: "support",
    q: "Do you provide support after launch?",
    a: "Yes. 30 days of free bug support is included (60 days for founding clients). After that, an optional monthly care plan covers monitoring, updates, small changes and a performance report.",
  },
  {
    id: "existing",
    q: "Can you work on our existing website or app?",
    a: "Yes — audits, redesigns and rebuilds. Legacy systems start with a technical audit, followed by an incremental migration plan so business downtime stays at zero.",
  },
  {
    id: "admin",
    q: "Will we be able to update the website ourselves?",
    a: "Yes. Every build can ship with an admin panel — like the one powering this site — so you can edit content, manage enquiries and publish new work without touching code.",
  },
  {
    id: "seo",
    q: "Is SEO included or charged separately?",
    a: "Technical SEO (metadata, schema, sitemap, Core Web Vitals) is included in every website build. Content strategy and ongoing growth work sit under a separate monthly retainer.",
  },
  {
    id: "international",
    q: "Do you work with clients outside India?",
    a: "Yes. We're remote-friendly with overlapping hours for the Middle East, Europe, the UK and the US East Coast. International projects are billed in USD, and we communicate over WhatsApp, Google Meet or email — whatever suits you.",
  },
];

/* ------------------------------- Process ------------------------------- */
export const processSteps: ProcessStep[] = [
  { id: "discovery", step: "01", title: "Discovery call", desc: "We map goals, users and scope, then lock deliverables and timeline in writing.", duration: "Day 1–2" },
  { id: "architecture", step: "02", title: "UX & architecture", desc: "Sitemap, wireframes, data model and API contract — approved before design begins.", duration: "Week 1" },
  { id: "build", step: "03", title: "Design & build", desc: "High-fidelity design alongside development sprints, with a working demo every week.", duration: "Week 2–5" },
  { id: "qa", step: "04", title: "QA & hardening", desc: "Cross-device testing, Lighthouse audit, accessibility pass and error monitoring.", duration: "Week 6" },
  { id: "launch", step: "05", title: "Launch & support", desc: "Deployment, analytics, SEO indexing and a handover walkthrough — then 30 days of cover.", duration: "Ongoing" },
];

/* ------------------------------ Highlights ------------------------------ */
export const guarantees: Highlight[] = [
  { id: "ownership", icon: "key", title: "100% code ownership", desc: "Repository, design files and credentials transferred to you at handover." },
  { id: "nda", icon: "lock", title: "NDA-ready engagements", desc: "A mutual NDA is signed before any sensitive brief is discussed." },
  { id: "fixed", icon: "doc", title: "Fixed-scope contracts", desc: "Written deliverables, milestone billing and zero scope creep." },
  { id: "milestones", icon: "check-circle", title: "Pay per milestone", desc: "You only pay for work you have seen, reviewed and approved." },
  { id: "founder", icon: "user", title: "Founder-led delivery", desc: "You work directly with the engineer who writes your code — no relay." },
  { id: "cover", icon: "shield", title: "30-day post-launch cover", desc: "Free bug fixes and monitoring for the first month, always." },
];

export const whyUs: Highlight[] = [
  { id: "proof", icon: "globe", title: "Proof you can click", desc: "Five live products and public repositories. Judge us by what runs in production — not by a slide deck." },
  { id: "production", icon: "shield", title: "Production-ready from day one", desc: "Validation, error handling, monitoring and graceful fallbacks are defaults — never afterthoughts." },
  { id: "performance", icon: "bolt", title: "Performance obsessed", desc: "Every build targets a 90+ Lighthouse score. Speed compounds into ranking and conversion." },
  { id: "scope", icon: "doc", title: "Fixed scope, zero surprises", desc: "Written deliverables, milestone payments and a shared board. Budgets never leak." },
  { id: "founder", icon: "chat", title: "Founder-level attention", desc: "You speak directly with the person building your product — every single week." },
  { id: "scale", icon: "scale", title: "Built to scale", desc: "Caching, queues and fallbacks are planned upfront — the patterns that keep eShopper and MovieZone up." },
];

export const rhythm: Highlight[] = [
  { id: "demo", icon: "calendar", title: "Weekly live demo", desc: "Every Friday you see working software, not slide decks." },
  { id: "board", icon: "chart", title: "Shared progress board", desc: "Every task, owner and deadline visible to you in real time." },
  { id: "replies", icon: "chat", title: "Same-day replies", desc: "A direct WhatsApp line to the person doing the work." },
  { id: "decisions", icon: "doc", title: "Written decisions", desc: "Scope changes and approvals are documented — no surprises." },
];

/* ------------------------------- Milestones ----------------------------- */
export const milestones: Milestone[] = [
  { id: "foundations", year: "2023", title: "Web development foundations", place: "World Class Skill Centre, Delhi", desc: "A six-month intensive in HTML5, CSS3, JavaScript and responsive layout discipline — where the fundamentals got fixed." },
  { id: "mern", year: "2023", title: "MERN stack development", place: "DUCAT, Delhi", desc: "MongoDB, Express, React and Node — data modelling, REST APIs, authentication and the first full-stack deploys." },
  { id: "mca", year: "2024", title: "MCA — Computer Applications", place: "IGNOU, New Delhi", desc: "Studying alongside full-time building, after a First Division BCA from Maharshi Dayanand University, Rohtak." },
  { id: "products", year: "2025", title: "Independent product work", place: "New Delhi", desc: "World Explorer and The Chronicle shipped — typed APIs, caching strategy, a bilingual UI and measurable request reduction." },
  { id: "scale", year: "2026", title: "Production scale", place: "New Delhi", desc: "eShopper and MovieZone: payments, background workers, real-time order state, SSR SEO and PWA delivery." },
  { id: "studio", year: "2026", title: "Novaframe Studio opens", place: "New Delhi · Worldwide", desc: "The same production standard — now offered to founders and businesses that want software built properly." },
];

/* ------------------------------- Tech stack ----------------------------- */
export const techStack: TechGroup[] = [
  {
    id: "frontend",
    title: "Frontend",
    blurb: "Interfaces that load fast and stay pixel-accurate on every device.",
    items: [
      { name: "JavaScript", icon: "javascript/javascript-original", note: "ES6+ across every shipped app" },
      { name: "TypeScript", icon: "typescript/typescript-original", note: "Strict mode — The Chronicle, World Explorer" },
      { name: "React", icon: "react/react-original", note: "Component architecture and hooks" },
      { name: "Next.js", icon: "nextjs/nextjs-original", note: "App Router — The Chronicle, Portfolio" },
      { name: "Tailwind CSS", icon: "tailwindcss/tailwindcss-original", note: "Token-driven, mobile-first styling" },
      { name: "Redux Toolkit", icon: "redux/redux-original", note: "eShopper store with Redux Saga" },
      { name: "Three.js", icon: "threejs/threejs-original", note: "WebGL heroes — this site, Portfolio" },
      { name: "Framer Motion", icon: "framermotion/framermotion-original", note: "Purposeful interface motion" },
      { name: "Material UI", icon: "materialui/materialui-original", note: "eShopper admin and data grid" },
      { name: "PWA", icon: "", note: "MovieZone service worker and web push" },
    ],
  },
  {
    id: "backend",
    title: "Backend",
    blurb: "APIs that stay predictable, documented and resilient.",
    items: [
      { name: "Node.js", icon: "nodejs/nodejs-original", note: "APIs, workers and CLI checks" },
      { name: "Express", icon: "express/express-original", note: "Routing, middleware and validation" },
      { name: "REST APIs", icon: "", note: "45+ endpoints shipped" },
      { name: "Socket.IO", icon: "socketio/socketio-original", note: "Live order state, server-derived rooms" },
      { name: "BullMQ", icon: "", note: "4 queues — mail, refunds, reports, images" },
      { name: "Razorpay", icon: "", note: "Server-side signature verification" },
      { name: "Nodemailer", icon: "", note: "Transactional, HTML-escaped email" },
      { name: "Python", icon: "python/python-original", note: "SAARTHI local AI agent" },
      { name: "PHP 8", icon: "php/php-original", note: "Shared-hosting API edition of this site" },
    ],
  },
  {
    id: "database",
    title: "Data & Storage",
    blurb: "Data modelling and caching that still breathe at scale.",
    items: [
      { name: "MongoDB", icon: "mongodb/mongodb-original", note: "Atlas — 16 models in eShopper" },
      { name: "Mongoose", icon: "mongoose/mongoose-original", note: "Schemas, indexes, cached connections" },
      { name: "Redis", icon: "redis/redis-original", note: "~60% fewer repeat database reads" },
      { name: "SQLite", icon: "sqlite/sqlite-original", note: "This site's CMS and lead pipeline" },
      { name: "MySQL", icon: "mysql/mysql-original", note: "Shared-hosting deployments" },
      { name: "Cloudinary", icon: "", note: "Product media storage" },
      { name: "Firebase", icon: "firebase/firebase-original", note: "Auth and Admin SDK in eShopper" },
    ],
  },
  {
    id: "devops",
    title: "DevOps & Monitoring",
    blurb: "Deployments should be boring — boring means reliable.",
    items: [
      { name: "Git & GitHub", icon: "github/github-original", note: "Branches, pull requests, Actions" },
      { name: "Vercel", icon: "vercel/vercel-original", note: "Preview and production deploys" },
      { name: "Render", icon: "", note: "Express APIs via deploy hooks" },
      { name: "Cloudflare", icon: "cloudflare/cloudflare-original", note: "Workers and KV for MovieZone" },
      { name: "Sentry", icon: "sentry/sentry-original", note: "Client and server error tracking" },
      { name: "Datadog RUM", icon: "", note: "Real-user monitoring" },
    ],
  },
  {
    id: "design-media",
    title: "Design & Media",
    blurb: "The craft tools behind the interfaces and launch content.",
    items: [
      { name: "Figma", icon: "figma/figma-original", note: "UI design, prototypes and systems" },
      { name: "After Effects", icon: "aftereffects/aftereffects-original", note: "Motion graphics" },
      { name: "Premiere Pro", icon: "premierepro/premierepro-original", note: "Video editing" },
      { name: "Lighthouse", icon: "", note: "Performance and accessibility audits" },
    ],
  },
];

/* ------------------------------- Advanced ------------------------------- */
export const advancedSettings: AdvancedSettings = {
  estimator: {
    types: [
      { id: "website", label: "Business website", icon: "globe", base: 45_000, weeks: [3, 4], service: "Web Development", sizes: ["Up to 6 pages", "7–15 pages", "15+ pages"] },
      { id: "store", label: "Online store", icon: "cart", base: 90_000, weeks: [5, 7], service: "Web Development", sizes: ["Up to 50 products", "50–500 products", "500+ products"] },
      { id: "webapp", label: "Web app / SaaS", icon: "code", base: 1_20_000, weeks: [6, 8], service: "Web Development", sizes: ["MVP — core flows", "Full product", "Complex platform"] },
      { id: "backend", label: "API / admin panel", icon: "server", base: 60_000, weeks: [4, 6], service: "Backend, APIs & Admin", sizes: ["Core API + auth", "Admin + integrations", "Real-time platform"] },
      { id: "mobile", label: "Mobile app / PWA", icon: "phone", base: 1_20_000, weeks: [6, 9], service: "App Development", sizes: ["MVP — 5–8 screens", "10–20 screens", "20+ screens"] },
      { id: "design", label: "UI/UX design", icon: "layers", base: 35_000, weeks: [2, 3], service: "UI/UX Design", sizes: ["Up to 8 screens", "9–25 screens", "Full design system"] },
      { id: "video", label: "Promo / launch video", icon: "play", base: 25_000, weeks: [1, 2], service: "Video & Motion", sizes: ["30–45 seconds", "60–90 seconds", "Film + ad cut-downs"] },
    ],
    sizeMultipliers: [1, 1.7, 2.6],
    sizeWeeks: [0, 2, 4],
    extras: [
      { id: "cms", label: "Admin panel / CMS", price: 15_000, for: ["website", "store", "webapp"] },
      { id: "payments", label: "Online payments", price: 15_000, for: ["website", "store", "webapp", "backend", "mobile"] },
      { id: "auth", label: "User accounts & login", price: 18_000, for: ["website", "store", "webapp", "backend", "mobile"] },
      { id: "realtime", label: "Real-time updates", price: 20_000, for: ["store", "webapp", "backend", "mobile"] },
      { id: "i18n", label: "Multi-language (EN/HI)", price: 10_000, for: ["website", "store", "webapp", "mobile", "design"] },
      { id: "motion", label: "3D / advanced animation", price: 20_000, for: ["website", "store", "webapp", "design", "video"] },
      { id: "seo", label: "SEO launch pack", price: 10_000, for: ["website", "store", "webapp"] },
      { id: "push", label: "Push notifications", price: 12_000, for: ["mobile", "webapp"] },
      { id: "voice", label: "Voice-over & captions", price: 8_000, for: ["video"] },
    ],
    rushMultiplier: 1.2,
  },
  comparison: {
    columns: ["Typical agency", "Freelancer", "Novaframe"],
    rows: [
      { label: "Talk directly to the person building it", values: ["no", "yes", "yes"] },
      { label: "Live products & public code you can inspect", values: ["partial", "partial", "yes"] },
      { label: "Design, development, SEO & video under one roof", values: ["yes", "no", "yes"] },
      { label: "Fixed-price, milestone-based quote", values: ["partial", "partial", "yes"] },
      { label: "Weekly live demos & shared progress board", values: ["partial", "no", "yes"] },
      { label: "Admin panel so you can edit everything yourself", values: ["partial", "partial", "yes"] },
      { label: "100% code & design ownership", values: ["partial", "partial", "yes"] },
      { label: "Post-launch support included", values: ["yes", "no", "yes"] },
      { label: "Startup-friendly pricing", values: ["no", "yes", "yes"] },
    ],
  },
  budgetRanges: [
    { label: "Under ₹50,000", min: 0, max: 50_000 },
    { label: "₹50,000 – ₹1,00,000", min: 50_000, max: 100_000 },
    { label: "₹1,00,000 – ₹3,00,000", min: 100_000, max: 300_000 },
    { label: "₹3,00,000 – ₹8,00,000", min: 300_000, max: 800_000 },
    { label: "₹8,00,000+", min: 800_000, max: null },
  ],
  budgetUnsure: "Not sure yet — need guidance",
  timelineOptions: ["ASAP (within 2 weeks)", "In 1 month", "In 2–3 months", "Just exploring"],
  bookingTopics: [
    "New website",
    "Online store",
    "Web app / SaaS",
    "Mobile app / PWA",
    "Backend, APIs & admin panel",
    "UI/UX design",
    "SEO & growth",
    "Video & motion",
    "Something else",
  ],
  legal: {
    privacy: {
      updated: "19 October 2026",
      intro:
        "This policy explains what information Novaframe Studio collects through this website, why we collect it and the control you keep over it. We collect the minimum needed to respond to a business enquiry.",
      sections: [
        {
          heading: "Information we collect",
          list: [
            "Enquiry and booking details you submit: name, company, email, phone, service interest, budget range, timeline, preferred call slot and project description",
            "Newsletter sign-ups: your email address",
            "Anonymous usage events (page views and button clicks) recorded by our own server — no third-party trackers and no advertising cookies",
            "Technical data such as IP address and browser user agent, used for security and abuse prevention",
          ],
        },
        {
          heading: "How we use it",
          list: [
            "To respond to your enquiry, confirm your call and prepare a proposal",
            "To deliver contracted services and project communication",
            "To understand which pages are useful and keep the site fast",
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
            "Enquiry records are kept for 24 months from last contact, then deleted. Data is stored on access-controlled infrastructure; the admin console uses hashed passwords and expiring sessions. You may request access, correction or deletion at any time by emailing us.",
          ],
        },
      ],
    },
    terms: {
      updated: "19 October 2026",
      intro:
        "These terms govern the use of this website. Client engagements are governed by a signed statement of work, which takes precedence over anything stated here.",
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
            "On receipt of final payment, all custom code, design files and documentation created for your project transfer to you. We may reuse general-purpose internal tooling and reference the work in our portfolio unless an NDA states otherwise.",
          ],
        },
        {
          heading: "Payment terms",
          list: [
            "Milestone billing as defined in the proposal, typically 40 / 40 / 20",
            "Invoices are due within 15 days of issue",
            "Late payments may pause active work after written notice",
          ],
        },
        {
          heading: "Warranty and liability",
          paragraphs: [
            "We provide 30 days of free bug support after launch. We are not liable for indirect or consequential losses, and total liability is limited to the fees paid for the affected engagement.",
          ],
        },
      ],
    },
  },
};
