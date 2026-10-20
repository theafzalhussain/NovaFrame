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
        const target = document.getElementById(decodeURIComponent(raw));
        window.history.replaceState(null, "", `#${pathRef.current}`);
        target?.scrollIntoView({ behavior: "smooth", block: "start" });
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

/** Smooth-scroll to an element on the current page (hash-router safe). */
export function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
