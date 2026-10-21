import { Component, Suspense, useEffect, type ReactNode } from "react";
import Backdrop from "./components/Backdrop";
import CommandPalette from "./components/CommandPalette";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import QuickDock from "./components/QuickDock";
import { RouterProvider, useRouter } from "./lib/router";
import { ContentProvider, useContent } from "./lib/content";
import { track } from "./lib/api";
import { prefersLowData, whenIdle } from "./lib/idle";
import { lazyPage } from "./lib/lazyPage";
import type { SiteContent } from "./data/types";

// The home page ships in the main bundle (most visits start there); every other page is its own
// small file, fetched on first visit or prefetched while the browser is idle.
import Home from "./pages/Home";
const About = lazyPage(() => import("./pages/About"));
const AdminPortal = lazyPage(() => import("./pages/AdminPortal"));
const BookCallPage = lazyPage(() => import("./pages/BookCall"));
const CapabilityDetail = lazyPage(() => import("./pages/CapabilityDetail"));
const CaseStudyPage = lazyPage(() => import("./pages/CaseStudy"));
const ConfirmationPage = lazyPage(() => import("./pages/Confirmation"));
const Contact = lazyPage(() => import("./pages/Contact"));
const InsightsPage = lazyPage(async () => ({ default: (await import("./pages/Insights")).InsightsPage }));
const InsightArticle = lazyPage(async () => ({ default: (await import("./pages/Insights")).InsightArticle }));
const LegalPage = lazyPage(() => import("./pages/Legal"));
const NotFoundPage = lazyPage(() => import("./pages/NotFound"));
const PayPage = lazyPage(() => import("./pages/Pay"));
const Portfolio = lazyPage(() => import("./pages/Portfolio"));
const Pricing = lazyPage(() => import("./pages/Pricing"));
const Services = lazyPage(() => import("./pages/Services"));
const Sitemap = lazyPage(() => import("./pages/Sitemap"));
const TechStack = lazyPage(() => import("./pages/TechStack"));

/** Public pages in rough order of how often visitors open them (the admin console is never prefetched). */
const PREFETCH = [Services, Portfolio, CaseStudyPage, Pricing, Contact, BookCallPage, About, CapabilityDetail, InsightsPage, TechStack, ConfirmationPage, PayPage, LegalPage, Sitemap, NotFoundPage];

/** Shown only if a page's file is still downloading (e.g. first tap on a slow connection). */
function RouteFallback() {
  return (
    <div className="grid min-h-[75vh] place-items-center" role="status" aria-label="Loading page">
      <span className="spinner h-7 w-7" style={{ opacity: 0, animation: "spin 0.8s linear infinite, fade-up 0.3s 0.3s both" }} />
    </div>
  );
}

/** A page's code failed to download (offline, or a new deploy replaced the old files). */
class RouteBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <section className="shell grid min-h-[75vh] place-items-center pt-36 pb-24 text-center">
        <div>
          <p className="eyebrow is-center">Connection hiccup</p>
          <h1 className="display mt-6 text-[2.3rem] leading-tight sm:text-5xl">This page didn't load.</h1>
          <p className="mx-auto mt-4 max-w-md text-[15px] text-mist">Check your connection, then try again.</p>
          <button type="button" className="btn btn-gold mt-9" onClick={() => window.location.reload()}>
            Reload the page
          </button>
        </div>
      </section>
    );
  }
}

function resolve(path: string, content: SiteContent): { node: ReactNode; title: string } {
  const brand = content.settings.name;
  const t = (title: string) => `${title} | ${brand}`;
  const [first, second, ...rest] = path.split("/").filter(Boolean);

  if (!first) return { node: <Home />, title: `${brand} — Premium Websites, Web Apps & PWAs | ${content.settings.city}` };
  if (rest.length) return { node: <NotFoundPage path={path} />, title: t("Page not found") };

  if (!second) {
    const pages: Record<string, { node: ReactNode; title: string }> = {
      services: { node: <Services />, title: t("Services — Web, Apps, Backend, UI/UX, SEO & Video") },
      capabilities: { node: <Services />, title: t("Services") },
      work: { node: <Portfolio />, title: t("Work — Live Products & Case Studies") },
      portfolio: { node: <Portfolio />, title: t("Work — Live Products & Case Studies") },
      studio: { node: <About />, title: t("The Studio — Founder, Story & Standards") },
      about: { node: <About />, title: t("The Studio — Founder, Story & Standards") },
      "tech-stack": { node: <TechStack />, title: t("Tech Stack — Where Every Tool Has Shipped") },
      pricing: { node: <Pricing />, title: t("Pricing — Transparent Packages & Estimator") },
      insights: { node: <InsightsPage />, title: t("Insights — Engineering Notes") },
      contact: { node: <Contact />, title: t("Contact — Start a Project") },
      book: { node: <BookCallPage />, title: t("Book a Free 30-Minute Strategy Call") },
      pay: { node: <PayPage />, title: t("Pay Securely Online") },
      confirmation: { node: <ConfirmationPage />, title: t("Confirmation") },
      privacy: { node: <LegalPage doc="privacy" />, title: t("Privacy Policy") },
      terms: { node: <LegalPage doc="terms" />, title: t("Terms of Service") },
      sitemap: { node: <Sitemap />, title: t("Sitemap") },
      admin: { node: <AdminPortal />, title: t("Admin Console") },
      portal: { node: <AdminPortal />, title: t("Admin Console") },
    };
    return pages[first] ?? { node: <NotFoundPage path={path} />, title: t("Page not found") };
  }

  if (first === "work" || first === "portfolio") {
    const project = content.collections.projects.find((p) => p.id === second);
    if (project) return { node: <CaseStudyPage project={project} />, title: t(`${project.title} — ${project.subtitle}`) };
  }
  if (first === "services" || first === "capabilities") {
    const service = content.collections.services.find((s) => s.id === second);
    if (service) return { node: <CapabilityDetail service={service} />, title: t(`${service.title} Services`) };
  }
  if (first === "insights") {
    const article = content.collections.insights.find((a) => a.id === second);
    if (article) return { node: <InsightArticle article={article} />, title: t(article.title) };
  }
  return { node: <NotFoundPage path={path} />, title: t("Page not found") };
}

function Routes() {
  const { path } = useRouter();
  const content = useContent();
  const isAdmin = path === "/admin" || path === "/portal";
  const { node, title } = resolve(path, content);

  useEffect(() => {
    document.title = title;
  }, [title]);

  useEffect(() => {
    if (!isAdmin) track("page_view");
  }, [path, isAdmin]);

  // Warm up the other pages' code in the background, one file at a time, only while idle.
  useEffect(() => {
    if (isAdmin || prefersLowData()) return;
    const queue = [...PREFETCH];
    let cancel = () => {};
    const next = () => {
      const page = queue.shift();
      if (!page) return;
      page
        .preload()
        .catch(() => {})
        .finally(() => {
          cancel = whenIdle(next, { timeout: 4000, afterLoad: false });
        });
    };
    cancel = whenIdle(next, { timeout: 4000 });
    return () => cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isAdmin)
    return (
      <main key="admin">
        <RouteBoundary>
          <Suspense fallback={<RouteFallback />}>{node}</Suspense>
        </RouteBoundary>
      </main>
    );

  return (
    <div className="relative flex min-h-screen flex-col">
      <Backdrop />
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView();
        }}
        className="skip-link btn btn-gold btn-sm"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main" tabIndex={-1} key={path} className="page-enter relative z-10 flex-1 outline-none">
        <RouteBoundary>
          <Suspense fallback={<RouteFallback />}>{node}</Suspense>
        </RouteBoundary>
      </main>
      <Footer />
      <QuickDock />
      <CommandPalette />
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <ContentProvider>
        <Routes />
      </ContentProvider>
    </RouterProvider>
  );
}
