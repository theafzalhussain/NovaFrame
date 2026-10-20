import { useEffect, type ReactNode } from "react";
import Backdrop from "./components/Backdrop";
import CommandPalette from "./components/CommandPalette";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import QuickDock from "./components/QuickDock";
import { RouterProvider, useRouter } from "./lib/router";
import { ContentProvider, useContent } from "./lib/content";
import { track } from "./lib/api";
import type { SiteContent } from "./data/types";

import About from "./pages/About";
import AdminPortal from "./pages/AdminPortal";
import BookCallPage from "./pages/BookCall";
import CapabilityDetail from "./pages/CapabilityDetail";
import CaseStudyPage from "./pages/CaseStudy";
import ConfirmationPage from "./pages/Confirmation";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import { InsightArticle, InsightsPage } from "./pages/Insights";
import LegalPage from "./pages/Legal";
import NotFoundPage from "./pages/NotFound";
import PayPage from "./pages/Pay";
import Portfolio from "./pages/Portfolio";
import Pricing from "./pages/Pricing";
import Services from "./pages/Services";
import Sitemap from "./pages/Sitemap";
import TechStack from "./pages/TechStack";

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

  if (isAdmin) return <main key="admin">{node}</main>;

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
        {node}
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
