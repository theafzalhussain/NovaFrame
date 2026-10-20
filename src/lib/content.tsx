/**
 * ContentProvider — every section of the site reads from here.
 *
 *   1. Renders instantly from the last live copy (localStorage) or the shipped defaults
 *   2. Fetches GET /api/content and swaps in the database version
 *   3. Re-fetches when the admin saves (same tab), another tab changes, or the tab regains focus
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
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

function readCache(): SiteContent | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SiteContent) : null;
  } catch {
    return null;
  }
}

function writeCache(content: SiteContent) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(content));
  } catch {
    /* storage full / private mode */
  }
}

function initialState(): { content: SiteContent; source: ContentSource } {
  if (isDemoSession() && localContentModified()) return { content: normalizeContent(localContentSnapshot()), source: "local" };
  const cached = readCache();
  if (cached) return { content: normalizeContent(cached), source: "cache" };
  if (localContentModified()) return { content: normalizeContent(localContentSnapshot()), source: "local" };
  return { content: defaultContent, source: "defaults" };
}

const ContentContext = createContext<ContentValue>({ ...defaultContent, source: "defaults", refresh: async () => {} });

export function ContentProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialState);

  const refresh = useCallback(async () => {
    const res = await api.content();
    if (!res.ok || !res.data) return;
    if (!res.offline) {
      const { settings, advanced, collections } = res.data;
      writeCache({ settings, advanced, collections });
      setState({ content: normalizeContent(res.data), source: "live" });
      return;
    }
    // API unreachable — keep the last live copy unless the demo workspace is in use.
    if (isDemoSession() || !readCache()) setState({ content: normalizeContent(res.data), source: "local" });
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
