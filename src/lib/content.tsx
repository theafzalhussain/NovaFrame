/**
 * ContentProvider — every section of the site reads from here.
 *
 *   1. Renders instantly from the last live copy (localStorage) or the shipped defaults
 *   2. Fetches GET /api/content and swaps in the database version
 *   3. Re-fetches when the admin saves (same tab), another tab changes, or the tab regains focus
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { blanks } from "../data/blanks";
import { defaultContent } from "../data/defaults";
import { COLLECTION_NAMES, type CollectionName, type Collections, type SiteContent } from "../data/types";
import { api, isDemoSession } from "./api";
import { localContentModified, localContentSnapshot } from "./localApi";

const CACHE_KEY = "nf_content_cache_v2";

export type ContentSource = "defaults" | "cache" | "live" | "local";
type ContentValue = SiteContent & { source: ContentSource; refresh: () => Promise<void> };

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function deepMerge<T>(base: T, override: unknown): T {
  if (!isObject(base) || !isObject(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(override)) {
    const cur = (base as Record<string, unknown>)[k];
    out[k] = isObject(cur) && isObject(v) ? deepMerge(cur, v) : v;
  }
  return out as T;
}

/** Fill gaps so a partially edited record can never crash a page. */
export function normalizeContent(input: Partial<SiteContent> | null | undefined): SiteContent {
  const collections = {} as Collections;
  for (const name of COLLECTION_NAMES) {
    const list = input?.collections?.[name];
    (collections as Record<string, unknown>)[name] = Array.isArray(list)
      ? list.filter(isObject).map((item) => ({ ...blanks[name], ...item }))
      : defaultContent.collections[name];
  }
  return {
    settings: deepMerge(defaultContent.settings, input?.settings),
    advanced: deepMerge(defaultContent.advanced, input?.advanced),
    collections,
  };
}

function readCacheRaw(): string | null {
  try {
    return localStorage.getItem(CACHE_KEY);
  } catch {
    return null;
  }
}

function readCache(raw = readCacheRaw()): SiteContent | null {
  try {
    return raw ? (JSON.parse(raw) as SiteContent) : null;
  } catch {
    return null;
  }
}

function writeCache(json: string) {
  try {
    localStorage.setItem(CACHE_KEY, json);
  } catch {
    /* storage full / private mode */
  }
}

type State = { content: SiteContent; source: ContentSource; /** JSON of the live snapshot on screen, if known */ json: string | null };

function initialState(): State {
  if (isDemoSession() && localContentModified()) return { content: normalizeContent(localContentSnapshot()), source: "local", json: null };
  const raw = readCacheRaw();
  const cached = readCache(raw);
  if (cached) return { content: normalizeContent(cached), source: "cache", json: raw };
  if (localContentModified()) return { content: normalizeContent(localContentSnapshot()), source: "local", json: null };
  return { content: defaultContent, source: "defaults", json: null };
}

const ContentContext = createContext<ContentValue>({ ...defaultContent, source: "defaults", refresh: async () => {} });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);
  const shownJson = useRef(state.json);
  const shown = useRef(state.content);
  shown.current = state.content;

  const refresh = useCallback(async () => {
    const res = await api.content();
    if (!res.ok || !res.data) return;
    if (!res.offline) {
      const { settings, advanced, collections } = res.data;
      const json = JSON.stringify({ settings, advanced, collections });
      // Unchanged since the copy on screen: skip the cache write and the whole-site re-render.
      // (This runs on every page load and every time the tab regains focus.)
      if (json === shownJson.current) return;
      const next = normalizeContent(res.data);
      shownJson.current = json;
      writeCache(json);
      // First visit: the page rendered from the shipped defaults. If the live content is identical,
      // keep what's on screen instead of re-rendering (and re-laying out) the whole page.
      if (JSON.stringify(next) === JSON.stringify(shown.current)) return;
      setState({ content: next, source: "live", json });
      return;
    }
    // API unreachable — keep the last live copy unless the demo workspace is in use.
    if (isDemoSession() || !readCacheRaw()) {
      shownJson.current = null;
      setState({ content: normalizeContent(res.data), source: "local", json: null });
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onUpdate = () => void refresh();
    const onStorage = (e: StorageEvent) => {
      if (e.key === CACHE_KEY || e.key?.startsWith("nf_local_content")) void refresh();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("nf:content-updated", onUpdate);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("nf:content-updated", onUpdate);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const value = useMemo<ContentValue>(() => ({ ...state.content, source: state.source, refresh }), [state, refresh]);
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent() {
  return useContext(ContentContext);
}

export function useSettings() {
  return useContext(ContentContext).settings;
}

export function useCollection<K extends CollectionName>(name: K): Collections[K] {
  return useContext(ContentContext).collections[name];
}
