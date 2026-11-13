/**
 * Cached site content
 * -------------------
 * `GET /api/content` returns the entire public site — settings, advanced config and all
 * thirteen collections. Assembling it costs ~16 queries and as many JSON parses, and the
 * browser asks for it on every page load *and* every time a tab regains focus. In Turso
 * mode each of those queries is a network round-trip.
 *
 * So it is assembled once and held in memory. Freshness is handled on two levels:
 *
 *   1. Writes made by this process bump `dataRevision()` in server/db.ts, so an admin
 *      saving a change invalidates the cache immediately — no waiting, no stale page.
 *   2. Otherwise the stored `MAX(updated_at)` is re-checked at most once every few
 *      seconds (one cheap query), which catches edits made by another instance or by
 *      a script. Everything in between is served from memory with no queries at all.
 *
 * The snapshot also carries a strong ETag, letting the API answer repeat requests with
 * an empty `304 Not Modified` instead of the full payload.
 */
import crypto from "node:crypto";
import {
  COLLECTION_NAMES,
  type AdvancedSettings,
  type CollectionName,
  type Collections,
  type SiteContent,
  type SiteSettings,
} from "../src/data/types.js";
import { defaultContent } from "../src/data/defaults.js";
import { contentQ, dataRevision, parseRow, readSetting } from "./db.js";

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Recursively overlays stored values on the shipped defaults, so a partial record can't break a page. */
export function deepMerge<T>(base: T, override: unknown): T {
  if (!isPlainObject(base) || !isPlainObject(override)) return (override ?? base) as T;
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = (base as Record<string, unknown>)[key];
    out[key] = isPlainObject(current) && isPlainObject(value) ? deepMerge(current, value) : value;
  }
  return out as T;
}

export type ContentSnapshot = {
  content: SiteContent;
  /** `MAX(updated_at)` across `content` and `settings` — also the sitemap's <lastmod>. */
  version: string;
  /** Strong validator for the exact bytes `/api/content` would send. */
  etag: string;
  /** The complete, ready-to-send `GET /api/content` response body. */
  body: string;
  /** `updatedAt[collection][id]` — per-item timestamps for sitemap <lastmod>. */
  updatedAt: Record<string, Record<string, string>>;
};

/** How long the cache may go without re-checking the stored version. */
const VERIFY_TTL_MS = Math.max(0, Number(process.env.CONTENT_CACHE_TTL_MS || 5000));

let snapshot: ContentSnapshot | null = null;
let snapshotRevision = -1;
let verifiedAt = 0;
let building: Promise<ContentSnapshot> | null = null;

/** Drops the cached copy. Rarely needed — writes are detected automatically. */
export function invalidateContent() {
  snapshot = null;
  building = null;
}

async function build(): Promise<ContentSnapshot> {
  // Captured before the reads: if a write lands while we are assembling, the next caller
  // sees a revision mismatch and rebuilds rather than caching a half-old snapshot.
  const revision = dataRevision();

  const collections = {} as Collections;
  const updatedAt: Record<string, Record<string, string>> = {};

  await Promise.all(
    COLLECTION_NAMES.map(async (name: CollectionName) => {
      const rows = await contentQ.listPublished(name);
      const items: unknown[] = [];
      const stamps: Record<string, string> = {};
      for (const row of rows) {
        const parsed = parseRow(row);
        items.push(parsed.data);
        stamps[parsed.id] = parsed.updatedAt;
      }
      (collections as Record<string, unknown>)[name] = items;
      updatedAt[name] = stamps;
    }),
  );

  const [storedSite, storedAdvanced, last] = await Promise.all([
    readSetting<SiteSettings>("site"),
    readSetting<AdvancedSettings>("advanced"),
    contentQ.lastUpdate(),
  ]);

  const content: SiteContent = {
    settings: deepMerge(defaultContent.settings, storedSite),
    advanced: deepMerge(defaultContent.advanced, storedAdvanced),
    collections,
  };

  const version = last?.t ?? "";
  // Serialized once, here, in the exact shape `GET /api/content` returns, so serving a
  // request is a string write and the ETag is a true validator for those bytes.
  const body = JSON.stringify({
    ok: true,
    data: { settings: content.settings, advanced: content.advanced, collections, version },
  });
  const next: ContentSnapshot = {
    content,
    version,
    etag: `"${crypto.createHash("sha1").update(body).digest("base64url")}"`,
    body,
    updatedAt,
  };

  snapshot = next;
  snapshotRevision = revision;
  verifiedAt = Date.now();
  return next;
}

/** The current site content, from memory whenever it is known to be current. */
export async function getSiteContent(): Promise<ContentSnapshot> {
  const cached = snapshot;
  if (cached && snapshotRevision === dataRevision()) {
    if (Date.now() - verifiedAt < VERIFY_TTL_MS) return cached;
    // Past the window: one cheap query confirms nothing changed elsewhere.
    try {
      const last = await contentQ.lastUpdate();
      if ((last?.t ?? "") === cached.version) {
        verifiedAt = Date.now();
        return cached;
      }
    } catch {
      // Database unreachable — a slightly stale page beats a broken one.
      verifiedAt = Date.now();
      return cached;
    }
  }
  // Collapse concurrent misses into a single rebuild.
  if (!building) {
    building = build().finally(() => {
      building = null;
    });
  }
  return building;
}

export const siteSettings = async (): Promise<SiteSettings> => (await getSiteContent()).content.settings;
export const advancedSettings = async (): Promise<AdvancedSettings> => (await getSiteContent()).content.advanced;
