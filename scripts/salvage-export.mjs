/**
 * Export schema (from repo migrations) + data (via Supabase REST API / anon key).
 * Does not require DB password. Tables blocked by RLS are reported in manifest.
 */
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

function loadEnvLocal() {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local");
  }
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

function listMigrationFiles() {
  const dir = path.join(ROOT, "supabase", "migrations");
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => path.join(dir, f));
}

function buildSchemaBundle(outDir) {
  const files = listMigrationFiles();
  const parts = files.map((f) => {
    const name = path.basename(f);
    const sql = fs.readFileSync(f, "utf8");
    return `-- >>> migration: ${name}\n${sql}\n`;
  });
  const combined = parts.join("\n");
  fs.writeFileSync(path.join(outDir, "schema_from_migrations.sql"), combined, "utf8");
  return files.map((f) => path.basename(f));
}

async function fetchOpenApi(url, key) {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  return { ok: true, json: await res.json() };
}

const TABLES = [
  "achievements",
  "activity_log",
  "applications",
  "candidate_interests",
  "candidate_searches",
  "class_progress",
  "classes",
  "companies",
  "company_votes",
  "engagement_emails",
  "english_lessons",
  "help_articles",
  "job_perk_map",
  "job_perks",
  "jobs",
  "journey_progress",
  "journey_stages",
  "journey_steps",
  "notifications",
  "profiles",
  "project_votes",
  "recruiter_profiles",
  "recruiter_subscriptions",
  "resources",
  "resume_analyses",
  "resumes",
  "side_projects",
  "subscribers",
  "user_achievements",
  "user_roles",
];

const PAGE = 1000;

async function exportTable(supabase, table, outDir) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE - 1;
    const { data, error } = await supabase
      .from(table)
      .select("*")
      .range(from, to);

    if (error) {
      return { table, ok: false, error: error.message, code: error.code, count: 0 };
    }

    if (!data?.length) break;
    rows.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const file = path.join(outDir, "data", `${table}.json`);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2), "utf8");
  return { table, ok: true, count: rows.length };
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local"
    );
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(ROOT, "supabase", "backups", stamp);
  fs.mkdirSync(path.join(outDir, "data"), { recursive: true });

  const migrationFiles = buildSchemaBundle(outDir);
  const typesSrc = path.join(ROOT, "integrations", "supabase", "types.ts");
  if (fs.existsSync(typesSrc)) {
    fs.copyFileSync(typesSrc, path.join(outDir, "types.ts"));
  }

  const openApi = await fetchOpenApi(url, key);
  if (openApi.ok) {
    fs.writeFileSync(
      path.join(outDir, "postgrest_openapi.json"),
      JSON.stringify(openApi.json, null, 2),
      "utf8"
    );
  }

  const supabase = createClient(url, key);
  const results = [];

  for (const table of TABLES) {
    process.stdout.write(`Exporting ${table}... `);
    const result = await exportTable(supabase, table, outDir);
    results.push(result);
    if (result.ok) {
      console.log(`${result.count} rows`);
    } else {
      console.log(`FAILED (${result.code ?? "?"}): ${result.error}`);
    }
  }

  const manifest = {
    exported_at: new Date().toISOString(),
    project_url: url,
    schema_source: "supabase/migrations/*.sql (concatenated)",
    migration_files: migrationFiles,
    openapi_fetched: openApi.ok,
    openapi_error: openApi.ok ? null : { status: openApi.status, body: openApi.body?.slice?.(0, 500) },
    tables: results,
    notes: [
      "Schema DDL is from repo migrations; apply to your new DB then import data/*.json.",
      "Data export uses the anon/publishable key; RLS may hide rows or block tables entirely.",
      "For a complete data copy you need service_role key or DB credentials from the project owner.",
    ],
  };

  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
    "utf8"
  );

  const ok = results.filter((r) => r.ok);
  const blocked = results.filter((r) => !r.ok);
  const totalRows = ok.reduce((n, r) => n + r.count, 0);

  console.log("\n---");
  console.log(`Backup folder: ${outDir}`);
  console.log(`Tables exported: ${ok.length}/${TABLES.length}, ${totalRows} total rows`);
  if (blocked.length) {
    console.log(`Blocked/empty (${blocked.length}): ${blocked.map((r) => r.table).join(", ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
