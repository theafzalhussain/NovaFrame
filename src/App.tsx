import { Component, Suspense, useEffect, type ReactNode } from "react";
import Backdrop from "./components/Backdrop";
import CommandPalette from "./components/CommandPalette";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import QuickDock from "./components/QuickDock";
import { RouterProvider, useRouter } from "./lib/router";
import { ContentProvider, useContent } from "./lib/content";
import { captureReferral, track } from "./lib/api";
import { prefersLowData, whenIdle } from "./lib/idle";
import { lazyPage } from "./lib/lazyPage";
import { useSeo } from "./lib/useSeo";
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
const EarnPage = lazyPage(() => import("./pages/Earn"));
const PartnerPortal = lazyPage(() => import("./pages/PartnerPortal"));
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
const PREFETCH = [Services, Portfolio, CaseStudyPage, Pricing, Contact, BookCallPage, About, EarnPage, CapabilityDetail, InsightsPage, TechStack, ConfirmationPage, PayPage, PartnerPortal, LegalPage, Sitemap, NotFoundPage];

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

function resolve(path: string, content: SiteContent): ReactNode {
  const [first, second, ...rest] = path.split("/").filter(Boolean);

  if (!first) return <Home />;
  if (rest.length) return <NotFoundPage path={path} />;

  if (!second) {
    const pages: Record<string, ReactNode> = {
      services: <Services />,
      capabilities: <Services />,
      work: <Portfolio />,
      portfolio: <Portfolio />,
      studio: <About />,
      about: <About />,
      "tech-stack": <TechStack />,
      pricing: <Pricing />,
      insights: <InsightsPage />,
      contact: <Contact />,
      book: <BookCallPage />,
      pay: <PayPage />,
      earn: <EarnPage />,
      partner: <PartnerPortal />,
      confirmation: <ConfirmationPage />,
      privacy: <LegalPage doc="privacy" />,
      terms: <LegalPage doc="terms" />,
      sitemap: <Sitemap />,
      admin: <AdminPortal />,
      portal: <AdminPortal />,
    };
    return pages[first] ?? <NotFoundPage path={path} />;
  }

  if (first === "work" || first === "portfolio") {
    const project = content.collections.projects.find((p) => p.id === second);
    if (project) return <CaseStudyPage project={project} />;
  }
  if (first === "services" || first === "capabilities") {
    const service = content.collections.services.find((s) => s.id === second);
    if (service) return <CapabilityDetail service={service} />;
  }
  if (first === "insights") {
    const article = content.collections.insights.find((a) => a.id === second);
    if (article) return <InsightArticle article={article} />;
  }
  return <NotFoundPage path={path} />;
}

function Routes() {
  const { path, query } = useRouter();
  const content = useContent();
  const isAdmin = path === "/admin" || path === "/portal";
  const node = resolve(path, content);
  const ref = query.get("ref");

  // Title, description, canonical, Open Graph and JSON-LD for this route.
  useSeo(path, content);

  // Student Partner referral links: `#/?ref=CODE` (or `?ref=CODE` before the hash).
  useEffect(() => {
    if (isAdmin) return;
    captureReferral(ref ?? new URLSearchParams(window.location.search).get("ref"));
  }, [ref, isAdmin]);

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
