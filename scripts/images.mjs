/**
 * Automatic image compression
 * ---------------------------
 * Every JPEG/PNG in `public/` is re-encoded as AVIF and WebP at a ladder of widths, and
 * written to `public/_img/`. `src/components/Picture.tsx` reads the manifest this produces
 * and emits a <picture> element, so each visitor downloads the smallest file their browser
 * supports at roughly the size it will actually be displayed.
 *
 * This matters here because the originals are full-resolution screenshots — a 942x1670,
 * 270 kB project cover was being downloaded in full to fill a 44px thumbnail.
 *
 * Runs automatically before `npm run build` (the `prebuild` script) and is idempotent: a
 * variant is only re-encoded when the source file is newer, so repeat builds cost nothing.
 *
 * Both the variants and the manifest are committed. That way a deploy never depends on
 * sharp's native binary being installable on the host — if it isn't, this script warns and
 * exits 0, and the build uses the committed output.
 *
 *   node scripts/images.mjs           # encode anything out of date
 *   node scripts/images.mjs --force   # re-encode everything
 */
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const OUT_DIRNAME = "_img";
const OUT_DIR = path.join(PUBLIC_DIR, OUT_DIRNAME);
const MANIFEST = path.join(ROOT, "src", "data", "images.generated.json");

/**
 * Widths to emit. The small end exists because several of these images are shown as 44–56px
 * avatars and thumbnails; the large end covers the full-page screenshot view. A width is
 * skipped when it would be an upscale of the original.
 */
const WIDTHS = [160, 320, 480, 640, 960, 1280];

/** AVIF ~50 and WebP ~78 sit at the point where artefacts stop being visible on photos. */
const AVIF = { quality: 50, effort: 5, chromaSubsampling: "4:2:0" };
const WEBP = { quality: 78, effort: 5 };

const SOURCE_RE = /\.(jpe?g|png)$/i;
const force = process.argv.includes("--force");

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} kB`;

/** Every JPEG/PNG under `public/`, excluding our own output directory. */
async function findSources(dir, out = []) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === OUT_DIRNAME) continue;
      await findSources(full, out);
    } else if (SOURCE_RE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const mtime = async (file) => {
  try {
    return (await fs.stat(file)).mtimeMs;
  } catch {
    return 0;
  }
};

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch (err) {
  console.warn(`\n[images] sharp is unavailable (${err.message.split("\n")[0]}).`);
  console.warn("[images] Skipping image generation — the committed variants in public/_img will be used.\n");
  process.exit(0);
}

const sources = (await findSources(PUBLIC_DIR)).sort();
if (!sources.length) {
  console.log("[images] No JPEG/PNG files in public/ — nothing to do.");
  process.exit(0);
}

await fs.mkdir(OUT_DIR, { recursive: true });

const manifest = {};
let encoded = 0;
let skipped = 0;
let originalBytes = 0;
let bestCaseBytes = 0;

for (const source of sources) {
  const rel = path.relative(PUBLIC_DIR, source).split(path.sep).join("/");
  const srcUrl = `/${rel}`;
  const stat = await fs.stat(source);
  const sourceMtime = stat.mtimeMs;
  originalBytes += stat.size;

  const image = sharp(source, { failOn: "error" });
  const meta = await image.metadata();
  if (!meta.width || !meta.height) {
    console.warn(`[images] ${rel}: could not read dimensions, skipping.`);
    continue;
  }

  // Flatten the path so "projects/eshopper.jpg" becomes "_img/projects-eshopper-640.avif".
  const slug = rel.replace(SOURCE_RE, "").replace(/[\\/]/g, "-");
  // Never upscale. Always include the native width so the largest display size is covered.
  const widths = [...new Set(WIDTHS.filter((w) => w < meta.width).concat(meta.width))].sort((a, b) => a - b);

  const variants = { avif: {}, webp: {} };
  let smallestAtTop = Infinity;

  for (const width of widths) {
    for (const [format, options] of [
      ["avif", AVIF],
      ["webp", WEBP],
    ]) {
      const name = `${slug}-${width}.${format}`;
      const outPath = path.join(OUT_DIR, name);
      const upToDate = !force && (await mtime(outPath)) > sourceMtime;

      if (upToDate) {
        skipped += 1;
      } else {
        const pipeline = sharp(source, { failOn: "error" }).resize({ width, withoutEnlargement: true });
        await (format === "avif" ? pipeline.avif(options) : pipeline.webp(options)).toFile(outPath);
        encoded += 1;
      }
      const size = (await fs.stat(outPath)).size;
      variants[format][width] = size;
      if (format === "avif" && width === widths[widths.length - 1]) smallestAtTop = size;
    }
  }

  bestCaseBytes += Number.isFinite(smallestAtTop) ? smallestAtTop : stat.size;

  manifest[srcUrl] = {
    width: meta.width,
    height: meta.height,
    base: `/${OUT_DIRNAME}/${slug}`,
    widths,
  };

  const native = widths[widths.length - 1];
  console.log(
    `[images] ${rel.padEnd(32)} ${meta.width}x${meta.height}  ${kb(stat.size).padStart(9)} -> ` +
      `avif ${kb(variants.avif[native]).padStart(9)}  webp ${kb(variants.webp[native]).padStart(9)}  (${widths.length} widths)`,
  );
}

const json = JSON.stringify(manifest, null, 2) + "\n";
const previous = await fs.readFile(MANIFEST, "utf8").catch(() => "");
if (previous !== json) await fs.writeFile(MANIFEST, json);

// Remove variants left behind by images that have since been deleted or renamed.
const expected = new Set(
  Object.values(manifest).flatMap((entry) =>
    entry.widths.flatMap((w) => [`${path.basename(entry.base)}-${w}.avif`, `${path.basename(entry.base)}-${w}.webp`]),
  ),
);
let removed = 0;
for (const name of await fs.readdir(OUT_DIR)) {
  if (!expected.has(name)) {
    await fs.unlink(path.join(OUT_DIR, name));
    removed += 1;
  }
}

const hash = createHash("sha1").update(json).digest("hex").slice(0, 8);
console.log(
  `\n[images] ${sources.length} sources | ${encoded} encoded, ${skipped} already current${removed ? `, ${removed} stale removed` : ""}`,
);
console.log(
  `[images] originals ${kb(originalBytes)} -> ${kb(bestCaseBytes)} as full-size AVIF ` +
    `(${Math.round((1 - bestCaseBytes / originalBytes) * 100)}% smaller); smaller still at thumbnail widths.`,
);
console.log(`[images] manifest: src/data/images.generated.json (${Object.keys(manifest).length} entries, ${hash})\n`);
