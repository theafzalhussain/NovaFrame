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
 * Tiny hash router: `#/work/eshopper?tab=x`.
 * Hashes that don't start with "/" (e.g. `#main`) are treated as in-page
 * anchors — the route is kept and the element is scrolled into view.
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

function readLocation(): { path: string; search: string } {
  if (typeof window === "undefined") return { path: "/", search: "" };
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw.startsWith("/")) return { path: "/", search: "" };
  const [pathname, search = ""] = raw.split("?");
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  return { path: clean || "/", search };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [loc, setLoc] = useState(readLocation);
  const pathRef = useRef(loc.path);
  pathRef.current = loc.path;

  useEffect(() => {
    const onHash = () => {
      const raw = window.location.hash.replace(/^#/, "");
      if (raw && !raw.startsWith("/")) {
        window.history.replaceState(null, "", `#${pathRef.current}`);
        scrollToId(decodeURIComponent(raw));
        return;
      }
      setLoc(readLocation());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback((to: string, opts?: { replace?: boolean }) => {
    const current = window.location.hash.replace(/^#/, "") || "/";
    if (current === to) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (opts?.replace) {
      window.history.replaceState(null, "", `#${to}`);
      setLoc(readLocation());
    } else {
      window.location.hash = to;
    }
  }, []);

  useEffect(() => {
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

export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const { navigate } = useRouter();
  return (
    <a
      href={`#${to}`}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
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
 * Smooth-scroll to an element on the current page (hash-router safe).
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
