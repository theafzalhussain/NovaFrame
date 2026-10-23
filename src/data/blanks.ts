import type { CollectionName, Collections } from "./types";

type ItemOf<K extends CollectionName> = Collections[K][number];

/**
 * Empty templates for every collection. Used to:
 *  • create new entries in the admin
 *  • normalise API data so missing fields never crash a page
 */
export const blanks: { [K in CollectionName]: ItemOf<K> } = {
  services: {
    id: "",
    icon: "sparkle",
    title: "",
    tagline: "",
    short: "",
    deliverable: "",
    startingAt: "",
    timeline: "",
    items: [],
    stack: [],
  },
  projects: {
    id: "",
    title: "",
    subtitle: "",
    category: "Web",
    year: String(new Date().getFullYear()),
    client: "In-house product",
    kind: "studio",
    status: "Live",
    liveUrl: "",
    repoUrl: "",
    cover: "",
    visual: "browser",
    preview: [],
    featured: false,
    summary: "",
    problem: "",
    solution: "",
    role: "",
    stack: [],
    features: [],
    challenges: [],
    metrics: [],
  },
  packages: {
    id: "",
    name: "",
    price: "",
    usd: "",
    suffix: "starting price",
    best: false,
    timeline: "",
    idealFor: "",
    desc: "",
    features: [],
  },
  team: {
    id: "",
    name: "",
    role: "",
    initials: "",
    photo: "",
    location: "",
    focus: "",
    headline: "",
    bio: "",
    quote: "",
    skills: [],
    skillGroups: [],
    services: [],
    goal: "",
    email: "",
    credentials: [],
    links: [],
  },
  testimonials: { id: "", name: "", role: "", company: "", quote: "", rating: 5, avatar: "", project: "" },
  faqs: { id: "", q: "", a: "" },
  process: { id: "", step: "", title: "", desc: "", duration: "" },
  techStack: { id: "", title: "", blurb: "", items: [] },
  guarantees: { id: "", icon: "check-circle", title: "", desc: "" },
  whyUs: { id: "", icon: "sparkle", title: "", desc: "" },
  rhythm: { id: "", icon: "calendar", title: "", desc: "" },
  milestones: { id: "", year: String(new Date().getFullYear()), title: "", place: "", desc: "" },
  insights: {
    id: "",
    title: "",
    excerpt: "",
    category: "Engineering",
    date: new Date().toISOString().slice(0, 10),
    readTime: "5 min read",
    author: "Afzal Hussain",
    body: [],
  },
};

export function blankFor<K extends CollectionName>(name: K): ItemOf<K> {
  return JSON.parse(JSON.stringify(blanks[name])) as ItemOf<K>;
}
