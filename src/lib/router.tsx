import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

/**
 * Clean-path router: `/work/eshopper?tab=x`.
 *
 * The site used to run on hash routes (`#/work/eshopper`). Search engines drop the
 * fragment before fetching, so every page collapsed into a single indexable URL ("/").
 * Real paths give each page its own URL, which is what makes per-page titles,
 * descriptions, canonicals and the XML sitemap count for anything.
 *
 * `<Link>` renders an ordinary `<a href="/work/eshopper">`, so crawlers follow it and
 * middle-click / ctrl-click / "open in new tab" behave the way visitors expect.
 *
 * Old `#/...` links (bookmarks, already-indexed URLs, links inside sent emails) are
 * rewritten to the clean path on arrival, so nothing that used to work breaks.
 * A bare `#section` is still treated as an in-page anchor.
 */
export type RouterValue = {
  path: string;
  query: URLSearchParams;
  segments: string[];
  navigate: (to: string, opts?: { replace?: boolean }) => void;
};

const RouterContext = createContext<RouterValue>({
  path: "/",
  query: new URLSearchParams(),
  segments: [],
  navigate: () => {},
});

/** Strips a trailing slash so "/services/" and "/services" are one route (and one URL). */
function normalize(pathname: string) {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  return clean || "/";
}

/**
 * Rewrites a legacy `#/path` URL to the real path before React first renders, so the
 * address bar, the canonical tag and analytics all agree on one URL. Returns the hash
 * that was carried over (e.g. "#main"), which the caller scrolls to after mount.
 */
function migrateLegacyHash(): string {
  if (typeof window === "undefined") return "";
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith("/")) return window.location.hash;
  const [pathname, search = ""] = raw.split("?");
  const target = normalize(pathname);
  // A referral code may sit in front of the hash (`/?ref=X#/book`) — keep both sets of params.
  const merged = new URLSearchParams(window.location.search);
  for (const [key, value] of new URLSearchParams(search)) merged.set(key, value);
  const qs = merged.toString();
  window.history.replaceState(null, "", `${target}${qs ? `?${qs}` : ""}`);
  return "";
}

const carriedHash = migrateLegacyHash();

function readLocation(): { path: string; search: string } {
  if (typeof window === "undefined") return { path: "/", search: "" };
  return { path: normalize(window.location.pathname), search: window.location.search.replace(/^\?/, "") };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(readLocation);
  const pathRef = useRef(loc.path);
  pathRef.current = loc.path;
  // Only the very first route render should keep the scroll position the browser restored
  // (or jump to an anchor carried over from a legacy hash URL).
  const firstRender = useRef(true);

  useEffect(() => {
    // Back / forward buttons.
    const onPop = () => setLoc(readLocation());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const [rawPath, rawQuery = ""] = to.split("?");
    const [search, hash = ""] = rawQuery.split("#");
    const target = normalize(rawPath.startsWith("/") ? rawPath : `/${rawPath}`);
    const url = `${target}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
    const current = `${window.location.pathname}${window.location.search}`;

    if (current === url) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    window.history[opts?.replace ? "replaceState" : "pushState"](null, "", url);
    setLoc(readLocation());
    if (hash) scrollToId(decodeURIComponent(hash));
  }, []);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      const anchor = (carriedHash || window.location.hash).replace(/^#/, "");
      if (anchor) requestAnimationFrame(() => scrollToId(decodeURIComponent(anchor)));
      return;
    }
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [loc.path]);

  const value = useMemo<RouterValue>(
    () => ({
      path: loc.path,
      query: new URLSearchParams(loc.search),
      segments: loc.path.split("/").filter(Boolean),
      navigate,
    }),
    [loc, navigate],
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

/**
 * An in-app link. The `href` is the real path, so it is crawlable and can be opened in a
 * new tab; a plain left-click is handled in the page without a round trip to the server.
 */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}

/**
 * Smooth-scroll to an element on the current page.
 * Off-screen page sections skip rendering (`content-visibility: auto`) and only carry estimated
 * heights, so they are rendered for the duration of the scroll — otherwise a long scroll on a phone
 * would land short of its target.
 */
export function scrollToId(id: string, block: ScrollLogicalPosition = "start") {
  const target = document.getElementById(id);
  if (!target) return;
  const root = document.documentElement;
  root.classList.add("cv-measure");
  void root.offsetHeight; // lay out with real section heights before measuring the target
  target.scrollIntoView({ behavior: "smooth", block });
  let timer = 0;
  const done = () => {
    window.clearTimeout(timer);
    window.removeEventListener("scrollend", done);
    root.classList.remove("cv-measure");
  };
  window.addEventListener("scrollend", done, { once: true });
  timer = window.setTimeout(done, 2000);
}
