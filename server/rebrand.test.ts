/**
 * Proves the one-time Novaframe → WebXstudio rename in db.ts.
 *
 *   npm run test:rebrand
 *
 * Builds a throwaway database that looks like a site seeded and edited under the
 * old name, runs initDb(), and checks the editorial tables were rewritten while
 * customer records were left alone.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wx-rebrand-"));
process.env.DB_PATH = path.join(tmp, "legacy.db");
process.env.TURSO_DATABASE_URL = "";
process.env.TURSO_AUTH_TOKEN = "";
process.env.ADMIN_PASSWORD = "RebrandTest12345";

const { all, get, initDb, run } = await import("./db.js");

let failed = 0;
const check = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.log(`  ✗ ${name}\n      ${(err as Error).message}`);
  }
};

try {
  console.log(`\nRebrand migration — temp DB ${process.env.DB_PATH}\n`);

  // First boot creates the schema and seeds the (already renamed) defaults.
  await initDb();

  // Rewind the database to how it looked under the old brand: edited settings,
  // edited content and a historical customer record.
  await run("DELETE FROM settings WHERE key = 'rebrand_webxstudio'");
  await run("UPDATE settings SET value = ? WHERE key = 'site'", [
    JSON.stringify({ name: "Novaframe Studio", legal: "Novaframe Studio", short: "Novaframe", description: "Novaframe is a founder-led studio.", email: "hello@novaframe.studio" }),
  ]);
  await run("UPDATE content SET data = ? WHERE collection = 'milestones' AND id = 'studio'", [
    JSON.stringify({ id: "studio", year: "2026", title: "Novaframe Studio opens", desc: "Written by the admin, with NOVAFRAME in caps too." }),
  ]);
  await run(
    `INSERT INTO enquiries (reference, name, email, service, budget_range, project_details)
     VALUES ('NF-OLD01', 'Old Client', 'old@client.test', 'Web', '₹50,000', 'Signed with Novaframe Studio last year.')`,
  );

  // Second boot applies the rename.
  await initDb();

  const site = JSON.parse((await get<{ value: string }>("SELECT value FROM settings WHERE key = 'site'"))!.value);
  check("settings: brand fields renamed", () => {
    assert.equal(site.name, "WebXstudio");
    assert.equal(site.legal, "WebXstudio");
    assert.equal(site.short, "WebXstudio");
    assert.equal(site.description, "WebXstudio is a founder-led studio.");
  });
  check("settings: domain token rewritten, not doubled", () => assert.equal(site.email, "hello@webxstudio.me"));

  const milestone = JSON.parse((await get<{ data: string }>("SELECT data FROM content WHERE collection = 'milestones' AND id = 'studio'"))!.data);
  check("content: admin-edited entry renamed", () => assert.equal(milestone.title, "WebXstudio opens"));
  check("content: upper-case spelling renamed", () => assert.match(milestone.desc, /WEBXSTUDIO in caps/));
  check("content: no 'WebXstudio Studio' double-up anywhere", () => {
    assert.equal(JSON.stringify(milestone).includes("WebXstudio Studio"), false);
  });

  const leftovers = await all<{ collection: string; id: string }>("SELECT collection, id FROM content WHERE data LIKE '%ovaframe%'");
  check("content: nothing left under the old name", () => assert.deepEqual(leftovers, []));

  const lead = (await get<{ project_details: string; reference: string }>("SELECT reference, project_details FROM enquiries WHERE reference = 'NF-OLD01'"))!;
  check("customer records are untouched", () => {
    assert.equal(lead.reference, "NF-OLD01");
    assert.match(lead.project_details, /Novaframe Studio/);
  });

  // Third boot must be a no-op: an admin who renames something back stays renamed.
  await run("UPDATE settings SET value = ? WHERE key = 'site'", [JSON.stringify({ ...site, name: "Novaframe Studio" })]);
  await initDb();
  const again = JSON.parse((await get<{ value: string }>("SELECT value FROM settings WHERE key = 'site'"))!.value);
  check("migration runs once only", () => assert.equal(again.name, "Novaframe Studio"));

  const marker = await get<{ value: string }>("SELECT value FROM settings WHERE key = 'rebrand_webxstudio'");
  check("marker records what changed", () => {
    const parsed = JSON.parse(marker!.value);
    assert.ok(parsed.at);
    assert.ok(parsed.content >= 1 && parsed.settings >= 1, JSON.stringify(parsed));
  });
} catch (err) {
  failed += 1;
  console.error(err);
} finally {
  const { db } = await import("./db.js");
  db.close();
  // Windows keeps the SQLite handle a moment longer; the temp folder is disposable either way.
  await new Promise((r) => setTimeout(r, 300));
  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* left for the OS to clean up */
  }
  console.log(`\n  ${failed ? `${failed} failed` : "all passed"}\n`);
  process.exit(failed ? 1 : 0);
}
