/**
 * Recover admin access from the command line.
 *
 *   npm run admin:reset -- --email you@example.com --password "a-new-long-password"
 *
 * Creates the account as an owner if it doesn't exist, otherwise resets
 * its password, re-activates it and signs out all of its sessions.
 */
import "./env.js";
import { get, run, hashPassword, initDb } from "./db.js";

function arg(name: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

const email = (arg("email") ?? "").toLowerCase().trim();
const password = arg("password") ?? "";

if (!email || password.length < 10) {
  console.error('Usage: npm run admin:reset -- --email you@example.com --password "at-least-10-chars"');
  process.exit(1);
}

await initDb();

const { hash, salt } = hashPassword(password);
const existing = await get<{ id: number }>("SELECT id FROM admin_users WHERE email = ?", [email]);

if (existing) {
  await run("UPDATE admin_users SET password_hash = ?, salt = ?, active = 1 WHERE id = ?", [hash, salt, existing.id]);
  await run("DELETE FROM sessions WHERE user_id = ?", [existing.id]);
  console.log(`✔ Password reset for ${email}. All of its sessions were signed out.`);
} else {
  await run("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, 'owner')", [
    email,
    hash,
    salt,
    arg("name") ?? "Studio Owner",
  ]);
  console.log(`✔ Owner account created for ${email}.`);
}
process.exit(0);
