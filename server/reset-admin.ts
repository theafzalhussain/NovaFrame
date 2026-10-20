/**
 * Recover admin access from the command line.
 *
 *   npm run admin:reset -- --email you@example.com --password "a-new-long-password"
 *
 * Creates the account as an owner if it doesn't exist, otherwise resets
 * its password, re-activates it and signs out all of its sessions.
 */
import "./env.js";
import { db, hashPassword } from "./db.js";

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

const { hash, salt } = hashPassword(password);
const existing = db.prepare("SELECT id FROM admin_users WHERE email = ?").get(email) as { id: number } | undefined;

if (existing) {
  db.prepare("UPDATE admin_users SET password_hash = ?, salt = ?, active = 1 WHERE id = ?").run(hash, salt, existing.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(existing.id);
  console.log(`✔ Password reset for ${email}. All of its sessions were signed out.`);
} else {
  db.prepare("INSERT INTO admin_users (email, password_hash, salt, full_name, role) VALUES (?, ?, ?, ?, 'owner')").run(
    email,
    hash,
    salt,
    arg("name") ?? "Studio Owner",
  );
  console.log(`✔ Owner account created for ${email}.`);
}
process.exit(0);
