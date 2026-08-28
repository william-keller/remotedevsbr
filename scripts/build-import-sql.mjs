/**
 * Build per-table SQL import files from `supabase/backups/<stamp>/data/*.json`.
 *
 * Why per-table? `npx supabase db query --file` executes a single prepared statement
 * and rejects multi-statement files.
 *
 * Usage:
 *   node scripts/build-import-sql.mjs supabase/backups/<stamp>
 */
import fs from "fs";
import path from "path";

function sqlIdent(name) {
  // basic identifier quoting
  return `"${String(name).replaceAll('"', '""')}"`;
}

function sqlString(s) {
  return `'${String(s).replaceAll("'", "''")}'`;
}

function sqlLiteral(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "string") return sqlString(v);
  // text[] convenience: if array of strings, emit a Postgres array literal
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    if (v.length === 0) return "ARRAY[]::text[]";
    return `ARRAY[${v.map(sqlString).join(", ")}]::text[]`;
  }
  // arrays/objects -> jsonb
  return `${sqlString(JSON.stringify(v))}::jsonb`;
}

function buildInsert(table, rows) {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]);
  const colList = cols.map(sqlIdent).join(", ");
  const values = rows
    .map((r) => `(${cols.map((c) => sqlLiteral(r[c])).join(", ")})`)
    .join(",\n");

  // ON CONFLICT DO NOTHING helps reruns/id collisions; assumes PK/unique constraints exist.
  return `INSERT INTO public.${sqlIdent(table)} (${colList}) VALUES\n${values}\nON CONFLICT DO NOTHING;`;
}

function main() {
  const backupDir = process.argv[2];
  if (!backupDir) {
    console.error("Expected backup directory arg, e.g. supabase/backups/2026-.../");
    process.exit(1);
  }
  const absBackupDir = path.resolve(backupDir);
  const dataDir = path.join(absBackupDir, "data");
  if (!fs.existsSync(dataDir)) {
    console.error(`Missing data dir: ${dataDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dataDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const outDir = path.join(absBackupDir, "import_parts");
  fs.mkdirSync(outDir, { recursive: true });

  for (const f of files) {
    const table = path.basename(f, ".json");
    const rows = JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const sql =
      `-- table: ${table} (${rows.length} rows)\n` + buildInsert(table, rows) + "\n";
    fs.writeFileSync(path.join(outDir, `${table}.sql`), sql, "utf8");
  }
  console.log(`Wrote per-table SQL files to ${outDir}`);
}

main();

