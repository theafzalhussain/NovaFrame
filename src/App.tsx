import { useEffect } from "react";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import QuickDock from "./components/QuickDock";
import { RouterProvider, useRouter, type RouterValue } from "./lib/router";
import { projects, services } from "./data/content";
import { insights } from "./data/content-extra";

import About from "./pages/About";
import Contact from "./pages/Contact";
import Home from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Services from "./pages/Services";
import TechStack from "./pages/TechStack";
import CaseStudyPage from "./pages/CaseStudy";
import CapabilityDetail from "./pages/CapabilityDetail";
import Pricing from "./pages/Pricing";
import LegalPage from "./pages/Legal";
import NotFoundPage from "./pages/NotFound";
import Sitemap from "./pages/Sitemap";
import BookCallPage from "./pages/BookCall";
import AdminPortal from "./pages/AdminPortal";
import { InsightArticle, InsightsPage } from "./pages/Insights";

const titles: Record<string, string> = {
  "/": "Novaframe Studio — Web, App, UI/UX, SEO & Video Production Studio",
  "/services": "Capabilities — Web, App, UI/UX, SEO & Video | Novaframe Studio",
  "/work": "Work — Case Studies & Results | Novaframe Studio",
  "/about": "The Studio — Mission, Story & Team | Novaframe Studio",
  "/tech-stack": "Tech Stack — Next.js, TypeScript, Node & SQL | Novaframe Studio",
  "/contact": "Contact — Start a Project | Novaframe Studio",
  "/book": "Book a 30-Min Discovery Call | Novaframe Studio",
  "/pricing": "Pricing — Transparent Packages | Novaframe Studio",
  "/insights": "Insights — Notes From the Studio | Novaframe Studio",
  "/privacy": "Privacy Policy | Novaframe Studio",
  "/terms": "Terms of Service | Novaframe Studio",
  "/sitemap": "Sitemap — Every Page | Novaframe Studio",
  "/admin": "Admin Control Center | Novaframe Studio",
  "/portal": "Admin Control Center | Novaframe Studio",
};

function resolve(path: string): { node: React.ReactNode; title?: string } {
  const segments = path.split("/").filter(Boolean);

  /* ---------------- static routes ---------------- */
  if (segments.length === 0) return { node: <Home />, title: titles["/"] };

  const staticRoutes: Record<string, React.ReactNode> = {
    services: <Services />,
    work: <Portfolio />,
    portfolio: <Portfolio />,
    studio: <About />,
    about: <About />,
    "tech-stack": <TechStack />,
    contact: <Contact />,
    book: <BookCallPage />,
    pricing: <Pricing />,
    insights: <InsightsPage />,
    privacy: <LegalPage doc="privacy" />,
    terms: <LegalPage doc="terms" />,
    sitemap: <Sitemap />,
    admin: <AdminPortal />,
    portal: <AdminPortal />,
  };

  if (segments.length === 1) {
    const hit = staticRoutes[segments[0]];
    if (hit) {
      const alias: Record<string, string> = {
        portfolio: "/work",
        about: "/studio",
        studio: "/studio",
      };
      const key = alias[segments[0]] ?? path;
      return { node: hit, title: titles[key] ?? "Novaframe Studio" };
    }
  }

  /* ---------------- dynamic: /work/:id ---------------- */
  if (segments.length === 2 && segments[0] === "work") {
    const project = projects.find((p) => p.id === segments[1]);
    if (project) {
      return { node: <CaseStudyPage project={project} />, title: `${project.title} | Novaframe Studio` };
    }
  }
  // support /portfolio/:id too
  if (segments.length === 2 && segments[0] === "portfolio") {
    const project = projects.find((p) => p.id === segments[1]);
    if (project) {
      return { node: <CaseStudyPage project={project} />, title: `${project.title} | Novaframe Studio` };
    }
  }

  /* ---------------- dynamic: /services/:id + /capabilities/:id ---------------- */
  if (segments.length === 2 && (segments[0] === "services" || segments[0] === "capabilities")) {
    const service = services.find((s) => s.id === segments[1]);
    if (service) {
      return {
        node: <CapabilityDetail service={service} />,
        title: `${service.title} Services | Novaframe Studio`,
      };
    }
  }

  /* ---------------- dynamic: /insights/:slug ---------------- */
  if (segments.length === 2 && segments[0] === "insights") {
    const article = insights.find((i) => i.slug === segments[1]);
    if (article) {
      return {
        node: <InsightArticle article={article} />,
        title: `${article.title} | Novaframe Studio`,
      };
    }
  }

  /* ---------------- fallback ---------------- */
  return { node: <NotFoundPage path={path} />, title: "Page Not Found | Novaframe Studio" };
}

function Routes() {
  const { path } = useRouter() as RouterValue;
  const isAdmin = path === "/admin" || path === "/portal";

  const { node, title } = resolve(path);

  useEffect(() => {
    document.title = title ?? "Novaframe Studio — Digital Product Studio";
  }, [title, path]);

  return (
    <div className="grain flex min-h-screen flex-col bg-ink-950">
      {!isAdmin && <Navbar />}
      <main key={path} className="flex-1">
        {node}
      </main>
      {!isAdmin && <Footer />}
      {!isAdmin && <QuickDock />}
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <Routes />
    </RouterProvider>
  );
}
