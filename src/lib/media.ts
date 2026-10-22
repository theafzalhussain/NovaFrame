/**
 * Image uploads for the admin console
 * -----------------------------------
 * Pictures chosen in the CMS are downscaled and re-encoded in the browser
 * (so a 6 MB phone photo becomes a ~200 kB WebP), then POSTed as raw bytes
 * to `/api/admin/media`. The server stores them in the database and serves
 * them from `/api/media/<id>`, which is what gets saved in the content field.
 *
 * In the demo workspace there is no server, so the picture is kept inline as
 * a data URL — the preview and the live site section still work.
 */
import { API_BASE, getAdminToken, isDemoSession, type ApiResult } from "./api";

/** Formats the file picker and the server accept. */
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
export const IMAGE_ACCEPT = ALLOWED_TYPES.join(",");
/** Hard ceiling enforced by the API. */
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024;
/** What we aim for after re-encoding — comfortably inside every host's limits. */
const TARGET_BYTES = 600 * 1024;
const MAX_EDGE = 1920;

export type UploadedImage = { url: string; bytes: number; mimeType: string };

export const formatBytes = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} kB`);

function readAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Couldn't read that file."));
    reader.readAsDataURL(blob);
  });
}

async function loadBitmap(file: File) {
  if (typeof createImageBitmap === "function") return await createImageBitmap(file);
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Couldn't decode that image."));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

const encode = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Downscale to at most 1920px on the long edge and re-encode as WebP,
 * stepping the quality down until the file is small enough. Animated GIFs
 * and anything already small are left untouched.
 */
async function shrink(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file;
  const bitmap = await loadBitmap(file);
  const isElement = bitmap instanceof HTMLImageElement;
  const width = isElement ? bitmap.naturalWidth : bitmap.width;
  const height = isElement ? bitmap.naturalHeight : bitmap.height;
  if (!width || !height) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  // Nothing to gain: already web-sized, web-format and light.
  if (scale === 1 && file.size <= TARGET_BYTES && /^image\/(webp|jpeg|avif)$/.test(file.type)) return file;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (!isElement) bitmap.close();

  let best: Blob | null = null;
  for (const quality of [0.86, 0.74, 0.62, 0.5]) {
    const blob = await encode(canvas, "image/webp", quality);
    if (!blob) break;
    if (!best || blob.size < best.size) best = blob;
    if (blob.size <= TARGET_BYTES) return blob;
  }
  if (!best) return file;
  return best.size < file.size ? best : file;
}

/** Validates, compresses and uploads one picture. Resolves with the URL to store. */
export async function uploadImage(file: File): Promise<ApiResult<UploadedImage>> {
  if (!file.type.startsWith("image/")) return { ok: false, error: "Please choose an image file (JPG, PNG, WebP or GIF)." };
  if (file.size > 25 * 1024 * 1024) return { ok: false, error: "That file is enormous — please pick an image under 25 MB." };

  let payload: Blob = file;
  try {
    payload = await shrink(file);
  } catch {
    payload = file; // fall back to the original bytes
  }
  const mimeType = payload.type || file.type;
  if (!ALLOWED_TYPES.includes(mimeType)) return { ok: false, error: "Unsupported image format — use JPG, PNG, WebP, AVIF or GIF." };
  if (payload.size > IMAGE_MAX_BYTES) return { ok: false, error: `That image is ${formatBytes(payload.size)} — please use one under 4 MB.` };

  if (isDemoSession()) {
    try {
      return { ok: true, data: { url: await readAsDataUrl(payload), bytes: payload.size, mimeType } };
    } catch {
      return { ok: false, error: "Couldn't read that file." };
    }
  }

  const token = getAdminToken();
  if (!token) return { ok: false, error: "Your session has expired. Please sign in again." };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(`${API_BASE}/admin/media?name=${encodeURIComponent(file.name || "image")}`, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": mimeType, Authorization: `Bearer ${token}` },
      body: payload,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; data?: { path?: string; bytes?: number; mimeType?: string }; error?: string };
    if (!res.ok || json.ok === false || !json.data?.path) {
      return { ok: false, status: res.status, error: json.error ?? `Upload failed (${res.status}).` };
    }
    return { ok: true, data: { url: `${API_BASE}${json.data.path}`, bytes: json.data.bytes ?? payload.size, mimeType: json.data.mimeType ?? mimeType } };
  } catch (err) {
    const aborted = (err as Error).name === "AbortError";
    return { ok: false, status: 0, offline: !aborted, error: aborted ? "The upload timed out — please try again." : "Can't reach the API server, so the image couldn't be uploaded." };
  } finally {
    clearTimeout(timer);
  }
}
