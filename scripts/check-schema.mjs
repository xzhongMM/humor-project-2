#!/usr/bin/env node
/**
 * Compares schema.config.json against the live database (via PostgREST's
 * OpenAPI description) and prints every real column so mismatches are easy to fix.
 */
import { loadEnv, loadSchema } from "./_env.mjs";

const { url, key } = loadEnv();
const schema = loadSchema();

const res = await fetch(`${url}/rest/v1/`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: "application/openapi+json" },
});
if (!res.ok) {
  console.error(`Could not read schema: ${res.status} ${await res.text()}`);
  process.exit(1);
}
const spec = await res.json();
const defs = spec.definitions ?? {};
let problems = 0;

for (const [logical, table] of Object.entries(schema.tables)) {
  const def = defs[table];
  console.log(`\n■ ${logical} → "${table}"`);
  if (!def) {
    console.log(`  ✘ table not found. Available: ${Object.keys(defs).join(", ")}`);
    problems++;
    continue;
  }
  const real = Object.entries(def.properties ?? {});
  const realNames = new Set(real.map(([n]) => n));
  for (const [alias, col] of Object.entries(schema.columns[logical])) {
    const ok = realNames.has(col);
    if (!ok) problems++;
    console.log(`  ${ok ? "✔" : "✘"} ${alias.padEnd(13)} → ${col}${ok ? "" : "   (MISSING)"}`);
  }
  console.log(`  columns in DB: ${real.map(([n, p]) => `${n}:${p.format ?? p.type}`).join(", ")}`);
}

console.log(problems ? `\n${problems} problem(s). Edit schema.config.json.` : "\nAll good ✔");
process.exit(problems ? 1 : 0);
