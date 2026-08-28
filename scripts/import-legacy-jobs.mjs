/**
 * Import legacy `jobs.json` (older schema) into the new `public.jobs` schema.
 *
 * Usage:
 *   node scripts/import-legacy-jobs.mjs supabase/backups/<stamp>/data/jobs.json supabase/backups/<stamp>/import_parts/jobs_legacy.sql
 */
import fs from "fs";
import path from "path";

function sqlString(s) {
  return `'${String(s).replaceAll("'", "''")}'`;
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "string") return sqlString(v);
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    if (v.length === 0) return "ARRAY[]::text[]";
    return `ARRAY[${v.map(sqlString).join(", ")}]::text[]`;
  }
  return `${sqlString(JSON.stringify(v))}::jsonb`;
}

function main() {
  const inPath = process.argv[2];
  const outPath = process.argv[3];
  if (!inPath || !outPath) {
    console.error("Usage: node scripts/import-legacy-jobs.mjs <jobs.json> <out.sql>");
    process.exit(1);
  }

  const rows = JSON.parse(fs.readFileSync(inPath, "utf8"));
  if (!Array.isArray(rows)) throw new Error("jobs.json must be an array");

  // Minimal mapping from legacy shape -> new columns.
  const mapped = rows.map((j) => ({
    id: j.id,
    title: j.role ?? j.title ?? "",
    role: j.role ?? j.title ?? "",
    company_name: j.company_name ?? "",
    description: j.description ?? null,
    apply_url: j.apply_url ?? "",
    location: j.location ?? null,
    location_type: "remote",
    status: "published",
    job_type: "full_time",
    source: j.source ?? "admin",
    posted_at: j.posted_at ?? j.created_at,
    created_at: j.created_at ?? j.posted_at,
    is_active: j.is_active ?? true,
    stack: j.stack ?? null,
    // salary mapping
    salary_min: j.comp_min ?? null,
    salary_max: j.comp_max ?? null,
    salary_currency: j.comp_currency ?? null,
    salary_period: "year",
    // counters / flags
    benefits_count: 0,
    views_count: 0,
    applications_count: 0,
    is_featured: false,
    is_verified_company: false,
    is_hot: false,
  }));

  const cols = [
    "id",
    "title",
    "role",
    "company_name",
    "description",
    "apply_url",
    "location",
    "location_type",
    "status",
    "job_type",
    "source",
    "posted_at",
    "created_at",
    "is_active",
    "stack",
    "salary_min",
    "salary_max",
    "salary_currency",
    "salary_period",
    "benefits_count",
    "views_count",
    "applications_count",
    "is_featured",
    "is_verified_company",
    "is_hot",
  ];

  const values = mapped
    .map((r) => `(${cols.map((c) => sqlLiteral(r[c])).join(", ")})`)
    .join(",\n");

  const sql =
    `-- legacy jobs import (${mapped.length} rows)\n` +
    `INSERT INTO public.\"jobs\" (${cols.map((c) => `\"${c}\"`).join(", ")}) VALUES\n` +
    values +
    `\nON CONFLICT (id) DO NOTHING;\n`;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, sql, "utf8");
  console.log(`Wrote ${outPath}`);
}

main();

