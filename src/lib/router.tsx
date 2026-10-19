import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from "react";

export type RouterValue = {
  path: string;
  segments: string[];
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterValue>({
  path: "/",
  segments: [],
  navigate: () => {},
});

function readPath(): string {
  if (typeof window === "undefined") return "/";
  const raw = window.location.hash.replace(/^#/, "");
  if (!raw) return "/";
  // normalise: strip trailing slash, keep query-free path
  const clean = raw.split("?")[0];
  return clean.length > 1 ? clean.replace(/\/+$/, "") : "/";
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState<string>(() => readPath());

  useEffect(() => {
    const onHash = () => setPath(readPath());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const navigate = useCallback(
    (to: string) => {
      if (readPath() === to) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      window.location.hash = to;
    },
    [],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [path]);

  const value = useMemo(
    () => ({ path, segments: path.split("/").filter(Boolean), navigate }),
    [path, navigate],
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
        event.preventDefault();
        onClick?.(event);
        navigate(to);
      }}
      {...rest}
    >
      {children}
    </a>
  );
}
