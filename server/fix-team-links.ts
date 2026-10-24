/**
 * One-off: make sure Vijay and Om carry their portfolio links on the live
 * database. Top-ups only INSERT missing members and never touch existing
 * rows, so a member who already existed before these links were added keeps
 * the old `links`. This script merges the missing links into the existing
 * rows — idempotently, without overwriting any other field.
 *
 *   Inspect only (default):  npm run team:fix-links
 *   Apply the changes:       npm run team:fix-links -- --apply
 *
 * It targets whatever database the normal server uses (local SQLite, or
 * Turso when TURSO_DATABASE_URL is set in .env).
 */
import "./env.js";
import { all, run, initDb, usingTurso } from "./db.js";

const APPLY = process.argv.includes("--apply");

type Link = { label: string; href: string };

/** Links each member must have. Added only if an identical one isn't present. */
const WANT: Record<string, Link[]> = {
  vijay: [{ label: "Portfolio", href: "https://codewithrishee.github.io/vijayy-portfolio/" }],
  "om-gupta": [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/om-gupta-5b8361304/" },
    { label: "Portfolio", href: "https://om-portfoli.netlify.app/" },
  ],
};

/** Optional extra fields to fill only when currently empty. */
const FILL_IF_EMPTY: Record<string, Record<string, unknown>> = {
  vijay: { location: "India" },
};

function sameLink(a: Link, b: Link) {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\/+$/, "");
  return norm(a.href) === norm(b.href) || a.label.trim().toLowerCase() === b.label.trim().toLowerCase();
}

await initDb();
console.log(`Database: ${usingTurso ? "Turso (hosted, LIVE)" : "local SQLite file"}`);
console.log(APPLY ? "Mode: APPLY\n" : "Mode: dry run (pass --apply to write)\n");

const rows = await all<{ id: string; data: string }>("SELECT id, data FROM content WHERE collection = 'team'");

let writes = 0;
for (const row of rows) {
  const want = WANT[row.id];
  const fill = FILL_IF_EMPTY[row.id];
  if (!want && !fill) continue;

  let doc: Record<string, unknown>;
  try {
    doc = JSON.parse(row.data) as Record<string, unknown>;
  } catch {
    console.warn(`! ${row.id}: unparseable data, skipped`);
    continue;
  }

  const links: Link[] = Array.isArray(doc.links) ? (doc.links as Link[]).filter((l) => l && l.href) : [];
  const before = links.length;
  const added: Link[] = [];
  for (const l of want ?? []) {
    if (!links.some((existing) => sameLink(existing, l))) {
      links.push(l);
      added.push(l);
    }
  }

  const filled: string[] = [];
  if (fill) {
    for (const [k, v] of Object.entries(fill)) {
      if (doc[k] === undefined || doc[k] === null || doc[k] === "") {
        doc[k] = v;
        filled.push(`${k}=${JSON.stringify(v)}`);
      }
    }
  }

  if (!added.length && !filled.length) {
    console.log(`= ${row.id}: already up to date (${before} link${before === 1 ? "" : "s"})`);
    continue;
  }

  doc.links = links;
  console.log(`~ ${row.id}: +${added.length} link(s)${added.length ? ` [${added.map((a) => a.label).join(", ")}]` : ""}${filled.length ? `, filled ${filled.join(", ")}` : ""}`);

  if (APPLY) {
    await run("UPDATE content SET data = ?, updated_at = datetime('now') WHERE collection = 'team' AND id = ?", [
      JSON.stringify({ ...doc, id: row.id }),
      row.id,
    ]);
    writes++;
  }
}

console.log(`\n${APPLY ? `Done — ${writes} row(s) updated.` : "Dry run complete. Re-run with --apply to write."}`);
process.exit(0);
