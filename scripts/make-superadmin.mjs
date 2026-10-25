#!/usr/bin/env node
/**
 * Solves the bootstrap problem: the admin app only lets in superadmins, so the
 * FIRST superadmin has to be created out-of-band with a more privileged
 * credential, the service-role key, which never ships to the browser.
 *
 *   1. Sign in once through the app with Google (you'll land on /unauthorized,
 *      but Supabase has now created your auth user + profile row).
 *   2. npm run make-superadmin -- you@gmail.com
 *   3. Refresh. You're in.
 *
 * Pass --revoke to flip it back to false.
 */
import { loadEnv, loadSchema } from "./_env.mjs";

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const target = args.find((a) => !a.startsWith("--"));
if (!target) {
  console.error("Usage: npm run make-superadmin -- <email | user-uuid> [--revoke]");
  process.exit(1);
}

const { url, key } = loadEnv();
const schema = loadSchema();
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function findUserIdByEmail(email) {
  // Look up in Supabase Auth so we don't depend on profiles having an email column.
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, { headers });
    if (!res.ok) throw new Error(`Auth admin API: ${res.status} ${await res.text()}`);
    const body = await res.json();
    const users = body.users ?? [];
    const hit = users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    if (hit) return hit.id;
    if (users.length < 200) break;
  }
  return null;
}

const isUuid = /^[0-9a-f-]{36}$/i.test(target);
const userId = isUuid ? target : await findUserIdByEmail(target);
if (!userId) {
  console.error(`No Supabase Auth user found for ${target}. Sign in to the app with Google once, then re-run.`);
  process.exit(1);
}

const table = schema.tables.profiles;
const idCol = schema.columns.profiles.id;
const flagCol = schema.columns.profiles.isSuperadmin;

const res = await fetch(`${url}/rest/v1/${table}?${idCol}=eq.${encodeURIComponent(userId)}`, {
  method: "PATCH",
  headers: { ...headers, Prefer: "return=representation" },
  body: JSON.stringify({ [flagCol]: !revoke }),
});
if (!res.ok) {
  console.error(`Update failed: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const rows = await res.json();
if (rows.length === 0) {
  console.error(`Auth user ${userId} exists but has no row in "${table}". Is your profile-creation trigger set up?`);
  process.exit(1);
}
console.log(`✔ ${target} (${userId}) ${table}.${flagCol} = ${!revoke}`);
