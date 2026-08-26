#!/usr/bin/env node
/**
 * Applies the SQL migrations in supabase/migrations, in filename order, exactly
 * once each. Applied filenames are recorded in `schema_migrations`, so running
 * this repeatedly is safe and only new files execute.
 *
 *   node --env-file=.env.local scripts/db-push.mjs
 *   node --env-file=.env.local scripts/db-push.mjs --dry-run
 *
 * Needs SUPABASE_DB_URL (Project Settings -> Database -> Connection string).
 */

import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(here, "..", "supabase", "migrations");
const dryRun = process.argv.includes("--dry-run");

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error(
    "SUPABASE_DB_URL is not set.\n" +
      "Add it to .env.local (see .env.example) and run:\n" +
      "  node --env-file=.env.local scripts/db-push.mjs",
  );
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  // Supabase terminates plain connections; its certificate chain is not in the
  // local trust store, so verification is relaxed for this admin-only script.
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();

  await client.query(`
    create table if not exists schema_migrations (
      filename    text primary key,
      applied_at  timestamptz not null default now()
    );
  `);

  const { rows } = await client.query("select filename from schema_migrations");
  const applied = new Set(rows.map((row) => row.filename));

  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));

  if (pending.length === 0) {
    console.log(`Up to date. ${files.length} migration${files.length === 1 ? "" : "s"} already applied.`);
    return;
  }

  console.log(`${pending.length} migration${pending.length === 1 ? "" : "s"} to apply:`);
  for (const file of pending) console.log(`  - ${file}`);

  if (dryRun) {
    console.log("\nDry run: nothing was executed.");
    return;
  }

  for (const file of pending) {
    const sql = await readFile(join(migrationsDir, file), "utf8");
    process.stdout.write(`\nApplying ${file} ... `);

    // Each migration runs in its own transaction: a failure leaves the database
    // on the last good migration rather than half-way through a broken one.
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations (filename) values ($1)", [file]);
      await client.query("commit");
      console.log("done");
    } catch (err) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`\n${file} did not apply. Nothing from it was kept.\n`);
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
      return;
    }
  }

  console.log("\nAll migrations applied.");
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => client.end());
