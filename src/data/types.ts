/* ================================================================
   Shared content model
   ----------------------------------------------------------------
   One set of types for the React site, the Express/SQLite API
   (seeding + validation) and the admin CMS. Every editable section
   of the website is described here.
   ================================================================ */

export type SocialLink = { label: string; href: string; icon: string };

export type HeroStat = { value: number; suffix: string; label: string };

export type Perk = { icon: string; title: string; desc: string };

/** Single "site" settings document (company identity, contact, hero, offers). */
export type SiteSettings = {
  name: string;
  legal: string;
  short: string;
  tagline: string;
  description: string;
  founded: string;

  email: string;
  phone: string;
  /** WhatsApp number, digits only, international format (e.g. 918447859784) */
  whatsapp: string;
  whatsappMessage: string;

  location: string;
  city: string;
  country: string;
  timezone: string;
  timezoneLabel: string;
  hours: string;
  /** Live "studio is online" indicator. Days: 0 = Sunday */
  workingHours: { start: number; end: number; days: number[] };
  responseTime: string;

  availability: { slotsOpen: number; note: string };
  announcement: { enabled: boolean; text: string; linkLabel: string; link: string };
  hero: { eyebrow: string; title: string; rotating: string[]; subtitle: string };
  stats: HeroStat[];
  founding: {
    enabled: boolean;
    eyebrow: string;
    title: string;
    highlight: string;
    note: string;
    slotsTotal: number;
    slotsLeft: number;
    perks: Perk[];
  };
  booking: { slots: string[]; durationMinutes: number; daysAhead: number; meetingTool: string };
  socials: SocialLink[];
};

/* ----------------------------- Advanced ----------------------------- */
export type BudgetRange = { label: string; min: number; max: number | null };

export type EstimatorType = {
  id: string;
  label: string;
  icon: string;
  base: number;
  weeks: [number, number];
  service: string;
  sizes: [string, string, string];
};

export type EstimatorExtra = { id: string; label: string; price: number; for: string[] };

export type EstimatorConfig = {
  types: EstimatorType[];
  sizeMultipliers: [number, number, number];
  sizeWeeks: [number, number, number];
  extras: EstimatorExtra[];
  rushMultiplier: number;
};

export type CompareValue = "yes" | "no" | "partial";

export type ComparisonTable = {
  columns: string[];
  rows: { label: string; values: CompareValue[] }[];
};

export type LegalSection = { heading: string; paragraphs?: string[]; list?: string[] };
export type LegalDoc = { updated: string; intro: string; sections: LegalSection[] };

/** Structured configuration edited as validated JSON in the admin. */
export type AdvancedSettings = {
  estimator: EstimatorConfig;
  comparison: ComparisonTable;
  budgetRanges: BudgetRange[];
  budgetUnsure: string;
  timelineOptions: string[];
  bookingTopics: string[];
  legal: { privacy: LegalDoc; terms: LegalDoc };
};

/* ---------------------------- Collections --------------------------- */
export type ServiceItem = { title: string; desc: string };

export type Service = {
  id: string;
  icon: string;
  title: string;
  tagline: string;
  short: string;
  deliverable: string;
  /** Starting price shown on cards — keep in sync with the estimator */
  startingAt: string;
  timeline: string;
  items: ServiceItem[];
  stack: string[];
};

export type Metric = { value: string; label: string };

export type ProjectVisualKind = "browser" | "terminal" | "monogram";

export type Project = {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  year: string;
  /** "In-house product" for studio builds, otherwise the client's name */
  client: string;
  /** "studio" = self-initiated product, "client" = paid client work */
  kind: "studio" | "client";
  /** Short status label, e.g. "Live", "Open source", "In beta" */
  status: string;
  liveUrl?: string;
  repoUrl?: string;
  /** Screenshot path or URL (tall full-page screenshots auto-scroll on hover) */
  cover?: string;
  visual?: ProjectVisualKind;
  /** Lines rendered by the "terminal" visual */
  preview?: string[];
  featured?: boolean;
  summary: string;
  /** Studio products: "Why we built it" · Client work: "The problem" */
  problem: string;
  /** Studio products: "What we built" · Client work: "Our solution" */
  solution: string;
  role: string;
  stack: string[];
  features: string[];
  challenges: string[];
  metrics: Metric[];
};

export type PricingPackage = {
  id: string;
  name: string;
  price: string;
  usd: string;
  suffix: string;
  best: boolean;
  timeline: string;
  idealFor: string;
  desc: string;
  features: string[];
};

export type Credential = { title: string; org: string; year: string };

export type TeamMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
  /** Path to a photo in /public (e.g. "/team/afzal-hussain.jpg") or a URL */
  photo?: string;
  location?: string;
  focus: string;
  /** One-line positioning statement shown under the name */
  headline?: string;
  bio: string;
  quote?: string;
  /** Flat skill list (used when `skillGroups` is empty) */
  skills: string[];
  /** Skills grouped by area, e.g. Backend / Frontend / Database / Tools */
  skillGroups?: { label: string; items: string[] }[];
  /** "What I do" — services this person delivers */
  services?: string[];
  /** Mission statement */
  goal?: string;
  /** Public contact email */
  email?: string;
  credentials?: Credential[];
  links: { label: string; href: string }[];
};

export type Testimonial = {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  rating: number;
  avatar?: string;
  project?: string;
};

export type Faq = { id: string; q: string; a: string };

export type ProcessStep = { id: string; step: string; title: string; desc: string; duration: string };

/** `icon` is a devicon path like "react/react-original" or "" for a monogram */
export type TechItem = { name: string; icon: string; note: string };
export type TechGroup = { id: string; title: string; blurb: string; items: TechItem[] };

/** Generic icon + title + description block (guarantees, why-us, rhythm) */
export type Highlight = { id: string; icon: string; title: string; desc: string };

export type Milestone = { id: string; year: string; title: string; place: string; desc: string };

export type InsightBlock = { heading?: string; paragraphs: string[]; list?: string[] };

export type Insight = {
  /** URL slug — /insights/:id */
  id: string;
  title: string;
  excerpt: string;
  category: string;
  date: string;
  readTime: string;
  author: string;
  body: InsightBlock[];
};

export type Collections = {
  services: Service[];
  projects: Project[];
  packages: PricingPackage[];
  team: TeamMember[];
  testimonials: Testimonial[];
  faqs: Faq[];
  process: ProcessStep[];
  techStack: TechGroup[];
  guarantees: Highlight[];
  whyUs: Highlight[];
  rhythm: Highlight[];
  milestones: Milestone[];
  insights: Insight[];
};

export type CollectionName = keyof Collections;

export const COLLECTION_NAMES: CollectionName[] = [
  "services",
  "projects",
  "packages",
  "team",
  "testimonials",
  "faqs",
  "process",
  "techStack",
  "guarantees",
  "whyUs",
  "rhythm",
  "milestones",
  "insights",
];

export type SiteContent = {
  settings: SiteSettings;
  advanced: AdvancedSettings;
  collections: Collections;
};

/* ------------------------------ Leads ------------------------------- */
export const LEAD_STATUSES = ["new", "contacted", "qualified", "proposal", "won", "lost", "archived"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_PRIORITIES = ["low", "normal", "high"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const BOOKING_STATUSES = ["scheduled", "confirmed", "completed", "cancelled", "no_show"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const ADMIN_ROLES = ["owner", "admin", "editor"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];
