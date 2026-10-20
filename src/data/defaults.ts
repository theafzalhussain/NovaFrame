/**
 * Default site content — the single source of truth used to:
 *  • render the site instantly (and offline) before the API responds
 *  • seed the database on first run of the API
 *  • power "reset to defaults" in the admin
 */
import type { CollectionName, Collections, SiteContent } from "./types";
import {
  advancedSettings,
  faqs,
  guarantees,
  milestones,
  packages,
  processSteps,
  projects,
  rhythm,
  services,
  siteSettings,
  team,
  techStack,
  testimonials,
  whyUs,
} from "./content";
import { insights } from "./content-extra";

export const defaultCollections: Collections = {
  services,
  projects,
  packages,
  team,
  testimonials,
  faqs,
  process: processSteps,
  techStack,
  guarantees,
  whyUs,
  rhythm,
  milestones,
  insights,
};

export const defaultContent: SiteContent = {
  settings: siteSettings,
  advanced: advancedSettings,
  collections: defaultCollections,
};

/** Human-readable labels for every collection (admin navigation, logs). */
export const collectionLabels: Record<CollectionName, { label: string; singular: string }> = {
  services: { label: "Services", singular: "Service" },
  projects: { label: "Projects", singular: "Project" },
  packages: { label: "Pricing", singular: "Package" },
  team: { label: "Team", singular: "Team member" },
  testimonials: { label: "Testimonials", singular: "Testimonial" },
  faqs: { label: "FAQs", singular: "FAQ" },
  process: { label: "Process", singular: "Step" },
  techStack: { label: "Tech stack", singular: "Tech group" },
  guarantees: { label: "Guarantees", singular: "Guarantee" },
  whyUs: { label: "Why us", singular: "Reason" },
  rhythm: { label: "Working rhythm", singular: "Rhythm item" },
  milestones: { label: "Journey", singular: "Milestone" },
  insights: { label: "Insights", singular: "Article" },
};

/** Deep clone helper (structuredClone isn't in every target lib). */
export function cloneDefaults(): SiteContent {
  return JSON.parse(JSON.stringify(defaultContent)) as SiteContent;
}
