import type { CollectionName } from "../../data/types";

export type FieldDef = {
  key: string;
  label: string;
  type:
    | "text"
    | "textarea"
    | "number"
    | "url"
    | "image"
    | "date"
    | "select"
    | "toggle"
    | "tags"
    | "lines"
    | "icon"
    | "repeater"
    | "blocks"
    | "days";
  required?: boolean;
  hint?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  suggestions?: string[];
  rows?: number;
  /** Sub-fields for "repeater" */
  fields?: FieldDef[];
  /** Layout: span both columns */
  wide?: boolean;
  /** Only show when another field has a given value */
  showIf?: { key: string; equals: unknown };
};

export type CollectionSchema = {
  label: string;
  singular: string;
  icon: string;
  description: string;
  titleField: string;
  subtitleField?: string;
  imageField?: string;
  fields: FieldDef[];
};

const highlight = (singular: string): FieldDef[] => [
  { key: "title", label: "Title", type: "text", required: true, wide: true },
  { key: "icon", label: "Icon", type: "icon" },
  { key: "desc", label: "Description", type: "textarea", rows: 3, wide: true, placeholder: `What this ${singular.toLowerCase()} means for clients` },
];

export const schemas: Record<CollectionName, CollectionSchema> = {
  projects: {
    label: "Projects",
    singular: "Project",
    icon: "diamond",
    description: "Case studies shown on Home, Work and service pages. Featured projects appear on the homepage.",
    titleField: "title",
    subtitleField: "subtitle",
    imageField: "cover",
    fields: [
      { key: "title", label: "Project name", type: "text", required: true },
      { key: "subtitle", label: "One-line positioning", type: "text", placeholder: "Full-stack fashion commerce platform" },
      { key: "category", label: "Category", type: "text", suggestions: ["Web", "Website", "Web App", "E-commerce", "PWA", "App", "AI", "Design", "Video"] },
      { key: "year", label: "Year", type: "text" },
      { key: "client", label: "Client", type: "text", hint: "\"In-house product\" for studio builds" },
      { key: "kind", label: "Type", type: "select", options: [{ value: "studio", label: "Studio product" }, { value: "client", label: "Client project" }] },
      { key: "status", label: "Status label", type: "text", suggestions: ["Live", "Open source", "In beta", "In development", "Client project"] },
      { key: "featured", label: "Feature on homepage", type: "toggle" },
      { key: "liveUrl", label: "Live URL", type: "url", placeholder: "https://" },
      { key: "repoUrl", label: "Repository URL", type: "url", placeholder: "https://github.com/…" },
      { key: "visual", label: "Visual style", type: "select", options: [{ value: "browser", label: "Screenshot in browser frame" }, { value: "terminal", label: "Terminal transcript" }, { value: "monogram", label: "Gold monogram" }] },
      { key: "cover", label: "Screenshot", type: "image", wide: true, hint: "Upload a screenshot · tall full-page captures auto-scroll on hover", showIf: { key: "visual", equals: "browser" } },
      { key: "preview", label: "Terminal lines", type: "lines", rows: 5, wide: true, showIf: { key: "visual", equals: "terminal" } },
      { key: "summary", label: "Summary", type: "textarea", required: true, rows: 3, wide: true },
      { key: "problem", label: "Why we built it / The problem", type: "textarea", rows: 4, wide: true },
      { key: "solution", label: "What we built / Our solution", type: "textarea", rows: 4, wide: true },
      { key: "role", label: "Our role", type: "text", wide: true },
      { key: "metrics", label: "Headline metrics", type: "repeater", wide: true, fields: [{ key: "value", label: "Value", type: "text", placeholder: "~60%" }, { key: "label", label: "Label", type: "text", placeholder: "Fewer DB reads" }] },
      { key: "stack", label: "Tech stack", type: "tags", wide: true },
      { key: "features", label: "Key features", type: "lines", rows: 5, wide: true },
      { key: "challenges", label: "Engineering decisions", type: "lines", rows: 4, wide: true },
    ],
  },
  services: {
    label: "Services",
    singular: "Service",
    icon: "layers",
    description: "Your service catalogue — navbar menu, homepage bento, services pages and the contact form all use this list.",
    titleField: "title",
    subtitleField: "tagline",
    fields: [
      { key: "title", label: "Service name", type: "text", required: true },
      { key: "icon", label: "Icon", type: "icon" },
      { key: "tagline", label: "Tagline", type: "text", wide: true },
      { key: "short", label: "Short description", type: "textarea", rows: 3, wide: true },
      { key: "startingAt", label: "Starting price", type: "text", placeholder: "₹45,000" },
      { key: "timeline", label: "Typical timeline", type: "text", placeholder: "3–8 weeks" },
      { key: "deliverable", label: "Deliverable", type: "text", wide: true },
      { key: "items", label: "What's included", type: "repeater", wide: true, fields: [{ key: "title", label: "Title", type: "text" }, { key: "desc", label: "Description", type: "text" }] },
      { key: "stack", label: "Core stack", type: "tags", wide: true },
    ],
  },
  packages: {
    label: "Pricing",
    singular: "Package",
    icon: "rupee",
    description: "Packages on the pricing page.",
    titleField: "name",
    subtitleField: "price",
    fields: [
      { key: "name", label: "Package name", type: "text", required: true },
      { key: "price", label: "Price", type: "text", required: true, placeholder: "₹45,000 or Custom" },
      { key: "usd", label: "Secondary price", type: "text", placeholder: "~$540" },
      { key: "suffix", label: "Price note", type: "text", placeholder: "starting price" },
      { key: "timeline", label: "Timeline", type: "text" },
      { key: "idealFor", label: "Ideal for", type: "text" },
      { key: "best", label: "Highlight as most chosen", type: "toggle" },
      { key: "desc", label: "Description", type: "textarea", rows: 3, wide: true },
      { key: "features", label: "Included features", type: "lines", rows: 6, wide: true },
    ],
  },
  insights: {
    label: "Insights",
    singular: "Article",
    icon: "book",
    description: "Articles on the Insights page. Use drafts to prepare posts before publishing.",
    titleField: "title",
    subtitleField: "category",
    fields: [
      { key: "title", label: "Headline", type: "text", required: true, wide: true },
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true, rows: 3, wide: true },
      { key: "category", label: "Category", type: "text", suggestions: ["Engineering", "Product", "Design", "Growth", "Studio"] },
      { key: "date", label: "Publish date", type: "date" },
      { key: "readTime", label: "Read time", type: "text", placeholder: "5 min read" },
      { key: "author", label: "Author", type: "text" },
      { key: "body", label: "Article body", type: "blocks", wide: true },
    ],
  },
  team: {
    label: "Team",
    singular: "Team member",
    icon: "users",
    description: "The first member is shown as the founder across the site.",
    titleField: "name",
    subtitleField: "role",
    imageField: "photo",
    fields: [
      { key: "name", label: "Full name", type: "text", required: true },
      { key: "role", label: "Role", type: "text", required: true },
      { key: "initials", label: "Initials", type: "text" },
      { key: "location", label: "Location", type: "text" },
      { key: "photo", label: "Photo", type: "image", wide: true },
      { key: "focus", label: "Focus", type: "text", wide: true },
      { key: "headline", label: "Headline", type: "text", wide: true, hint: "One line shown under the name, e.g. Building scalable web applications" },
      { key: "email", label: "Public email", type: "text" },
      { key: "bio", label: "Bio", type: "textarea", rows: 5, wide: true },
      { key: "quote", label: "Signature quote", type: "textarea", rows: 2, wide: true },
      { key: "goal", label: "Goal / mission", type: "textarea", rows: 2, wide: true },
      { key: "services", label: "What they do", type: "lines", rows: 6, wide: true, hint: "One service per line" },
      { key: "skills", label: "Skills (flat list)", type: "tags", wide: true, hint: "Shown when no skill groups are set" },
      { key: "skillGroups", label: "Skill groups", type: "repeater", wide: true, fields: [{ key: "label", label: "Group", type: "text", placeholder: "Backend" }, { key: "items", label: "Skills", type: "tags" }] },
      { key: "credentials", label: "Education & training", type: "repeater", wide: true, fields: [{ key: "title", label: "Title", type: "text" }, { key: "org", label: "Organisation", type: "text" }, { key: "year", label: "Year", type: "text" }] },
      { key: "links", label: "Links", type: "repeater", wide: true, fields: [{ key: "label", label: "Label", type: "text", placeholder: "GitHub" }, { key: "href", label: "URL", type: "url" }] },
    ],
  },
  testimonials: {
    label: "Testimonials",
    singular: "Testimonial",
    icon: "quote",
    description: "Only publish real client words. The section stays hidden until at least one is published.",
    titleField: "name",
    subtitleField: "company",
    imageField: "avatar",
    fields: [
      { key: "name", label: "Client name", type: "text", required: true },
      { key: "role", label: "Role", type: "text" },
      { key: "company", label: "Company", type: "text" },
      { key: "rating", label: "Rating (1–5)", type: "number" },
      { key: "quote", label: "Quote", type: "textarea", required: true, rows: 4, wide: true },
      { key: "avatar", label: "Photo", type: "image" },
      { key: "project", label: "Related project", type: "text" },
    ],
  },
  faqs: {
    label: "FAQs",
    singular: "FAQ",
    icon: "chat",
    description: "Questions on Home, Pricing and service pages — order matters, the first six show on the homepage.",
    titleField: "q",
    fields: [
      { key: "q", label: "Question", type: "text", required: true, wide: true },
      { key: "a", label: "Answer", type: "textarea", required: true, rows: 5, wide: true },
    ],
  },
  process: {
    label: "Process",
    singular: "Step",
    icon: "activity",
    description: "The delivery process timeline.",
    titleField: "title",
    subtitleField: "duration",
    fields: [
      { key: "step", label: "Step number", type: "text", placeholder: "01" },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "duration", label: "Duration", type: "text", placeholder: "Week 1" },
      { key: "desc", label: "Description", type: "textarea", rows: 3, wide: true },
    ],
  },
  whyUs: { label: "Why us", singular: "Reason", icon: "sparkle", description: "Reasons to choose the studio (homepage).", titleField: "title", fields: highlight("Reason") },
  guarantees: { label: "Guarantees", singular: "Guarantee", icon: "shield", description: "Written promises shown on Home, Pricing, Studio and Contact.", titleField: "title", fields: highlight("Guarantee") },
  rhythm: { label: "Working rhythm", singular: "Rhythm item", icon: "calendar", description: "How clients stay informed during a project.", titleField: "title", fields: highlight("Rhythm item") },
  milestones: {
    label: "Journey",
    singular: "Milestone",
    icon: "history",
    description: "The founder & studio timeline on the Studio page.",
    titleField: "title",
    subtitleField: "year",
    fields: [
      { key: "year", label: "Year", type: "text", required: true },
      { key: "title", label: "Title", type: "text", required: true },
      { key: "place", label: "Place / organisation", type: "text", wide: true },
      { key: "desc", label: "Description", type: "textarea", rows: 3, wide: true },
    ],
  },
  techStack: {
    label: "Tech stack",
    singular: "Tech group",
    icon: "cpu",
    description: "Groups on the Tech Stack page. Icons use devicon paths like \"react/react-original\" (leave empty for a monogram).",
    titleField: "title",
    subtitleField: "blurb",
    fields: [
      { key: "title", label: "Group title", type: "text", required: true },
      { key: "blurb", label: "Blurb", type: "text" },
      { key: "items", label: "Technologies", type: "repeater", wide: true, fields: [{ key: "name", label: "Name", type: "text" }, { key: "icon", label: "Devicon path", type: "text", placeholder: "react/react-original" }, { key: "note", label: "Where it shipped", type: "text" }] },
    ],
  },
};

export const CONTENT_NAV: CollectionName[] = ["projects", "services", "packages", "insights", "team", "testimonials", "faqs", "process", "whyUs", "guarantees", "rhythm", "milestones", "techStack"];

/** Site settings form, grouped into sections. Keys use dot paths. */
export const settingsSections: { title: string; description: string; icon: string; fields: FieldDef[] }[] = [
  {
    title: "Brand identity",
    description: "Names and the descriptions used across the site and in search results.",
    icon: "diamond",
    fields: [
      { key: "name", label: "Company name", type: "text", required: true },
      { key: "short", label: "Short name", type: "text" },
      { key: "legal", label: "Legal name", type: "text" },
      { key: "founded", label: "Founded (year)", type: "text" },
      { key: "tagline", label: "Tagline", type: "text", wide: true },
      { key: "description", label: "Company description", type: "textarea", rows: 3, wide: true },
    ],
  },
  {
    title: "Contact & hours",
    description: "Every email, phone and WhatsApp button on the site uses these values.",
    icon: "call",
    fields: [
      { key: "email", label: "Email", type: "text", required: true },
      { key: "phone", label: "Phone (display)", type: "text" },
      { key: "whatsapp", label: "WhatsApp number", type: "text", hint: "Digits only, with country code" },
      { key: "whatsappMessage", label: "WhatsApp greeting", type: "text" },
      { key: "location", label: "Location line", type: "text", wide: true },
      { key: "city", label: "City", type: "text" },
      { key: "country", label: "Country code", type: "text" },
      { key: "timezone", label: "Timezone (IANA)", type: "text", placeholder: "Asia/Kolkata" },
      { key: "timezoneLabel", label: "Timezone label", type: "text", placeholder: "IST" },
      { key: "hours", label: "Hours (display)", type: "text", wide: true },
      { key: "workingHours.start", label: "Opens at (hour, 0–23)", type: "number" },
      { key: "workingHours.end", label: "Closes at (hour, 0–23)", type: "number" },
      { key: "workingHours.days", label: "Working days", type: "days", wide: true },
      { key: "responseTime", label: "Response promise", type: "text", wide: true },
    ],
  },
  {
    title: "Availability & announcement",
    description: "The availability pill in the navbar and the dismissible top banner.",
    icon: "bell",
    fields: [
      { key: "availability.slotsOpen", label: "Project slots open", type: "number" },
      { key: "availability.note", label: "Availability note", type: "text" },
      { key: "announcement.enabled", label: "Show announcement bar", type: "toggle", wide: true },
      { key: "announcement.text", label: "Announcement text", type: "text", wide: true },
      { key: "announcement.linkLabel", label: "Link label", type: "text" },
      { key: "announcement.link", label: "Link (site path)", type: "text", placeholder: "/pricing" },
    ],
  },
  {
    title: "Homepage hero",
    description: "The first thing every visitor reads.",
    icon: "home",
    fields: [
      { key: "hero.eyebrow", label: "Eyebrow", type: "text", wide: true },
      { key: "hero.title", label: "Headline", type: "text", wide: true },
      { key: "hero.rotating", label: "Rotating words", type: "tags", wide: true, hint: "Shown in gold after the headline" },
      { key: "hero.subtitle", label: "Subtitle", type: "textarea", rows: 3, wide: true },
      { key: "stats", label: "Proof stats", type: "repeater", wide: true, fields: [{ key: "value", label: "Number", type: "number" }, { key: "suffix", label: "Suffix", type: "text", placeholder: "+" }, { key: "label", label: "Label", type: "text" }] },
    ],
  },
  {
    title: "Founding client offer",
    description: "The limited offer shown on Home and Pricing.",
    icon: "gift",
    fields: [
      { key: "founding.enabled", label: "Show the founding offer", type: "toggle", wide: true },
      { key: "founding.eyebrow", label: "Eyebrow", type: "text" },
      { key: "founding.title", label: "Title", type: "text" },
      { key: "founding.highlight", label: "Highlighted words", type: "text" },
      { key: "founding.slotsTotal", label: "Total slots", type: "number" },
      { key: "founding.slotsLeft", label: "Slots left", type: "number" },
      { key: "founding.note", label: "Note", type: "textarea", rows: 3, wide: true },
      { key: "founding.perks", label: "Perks", type: "repeater", wide: true, fields: [{ key: "icon", label: "Icon", type: "icon" }, { key: "title", label: "Title", type: "text" }, { key: "desc", label: "Description", type: "text" }] },
    ],
  },
  {
    title: "Call booking",
    description: "Slots offered on the Book a Call page (studio timezone).",
    icon: "calendar",
    fields: [
      { key: "booking.slots", label: "Time slots", type: "tags", wide: true, hint: "e.g. 10:30 AM" },
      { key: "booking.durationMinutes", label: "Duration (minutes)", type: "number" },
      { key: "booking.daysAhead", label: "Days shown ahead", type: "number" },
      { key: "booking.meetingTool", label: "Meeting tool", type: "text", placeholder: "Google Meet" },
    ],
  },
  {
    title: "Social profiles",
    description: "Footer icons and founder links. Icons: github, linkedin, instagram, globe, whatsapp, mail.",
    icon: "globe",
    fields: [
      { key: "socials", label: "Profiles", type: "repeater", wide: true, fields: [{ key: "label", label: "Label", type: "text" }, { key: "href", label: "URL", type: "url" }, { key: "icon", label: "Icon", type: "icon" }] },
    ],
  },
];

/* ---------------- dot-path helpers ---------------- */
export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone = (Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as object) }) as Record<string, unknown>;
  let cur = clone;
  keys.forEach((k, i) => {
    if (i === keys.length - 1) cur[k] = value;
    else {
      const next = cur[k];
      cur[k] = next && typeof next === "object" ? { ...(next as object) } : {};
      cur = cur[k] as Record<string, unknown>;
    }
  });
  return clone as T;
}
