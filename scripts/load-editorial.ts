/**
 * Load editorial copy into the places table (Ralph task 3.6)
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/load-editorial.ts
 *   npx tsx scripts/load-editorial.ts --dry-run
 *   npx tsx scripts/load-editorial.ts --force
 *
 * Reads scripts/ralph/data/editorial.json (an array of
 * {id, name, pitch, perfect, insider}) and updates `pitch`, `perfect` and
 * `insider` on `places` by id.
 *
 * By default each column is written only where it is currently NULL or blank,
 * so copy typed in the admin is never clobbered. `--force` overwrites all
 * three columns for every entry in the file. All writes run in a single
 * transaction; nothing is committed if any statement fails.
 *
 * Flags:
 *   --dry-run   Report what would change without writing anything.
 *   --force     Overwrite non-null columns too.
 *
 * Required environment variables:
 *   DATABASE_URL — PostgreSQL connection string
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

const isForce = process.argv.includes('--force');
const isDryRun = process.argv.includes('--dry-run');

// Relative to the working directory: run from the repo root.
const INPUT_PATH = resolve(process.cwd(), 'scripts/ralph/data/editorial.json');

const COLUMNS = ['pitch', 'perfect', 'insider'] as const;
type Column = (typeof COLUMNS)[number];

interface EditorialEntry {
  id: string;
  name: string;
  pitch: string;
  perfect: string;
  insider: string;
}

interface PlaceRow {
  id: string;
  name: string;
  pitch: string | null;
  perfect: string | null;
  insider: string | null;
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === '';
}

function loadEntries(): EditorialEntry[] {
  const raw = JSON.parse(readFileSync(INPUT_PATH, 'utf8')) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error(`${INPUT_PATH} must contain a JSON array`);
  }
  const seen = new Set<string>();
  const entries: EditorialEntry[] = [];
  raw.forEach((item, index) => {
    const e = item as Partial<EditorialEntry>;
    if (typeof e.id !== 'string' || e.id === '') {
      throw new Error(`entry ${index} has no id`);
    }
    if (seen.has(e.id)) {
      throw new Error(`entry ${index} (${e.id}) is a duplicate id`);
    }
    for (const col of COLUMNS) {
      if (typeof e[col] !== 'string' || isBlank(e[col])) {
        throw new Error(`entry ${index} (${e.id}, ${e.name ?? '?'}) has an empty ${col}`);
      }
    }
    seen.add(e.id);
    entries.push({
      id: e.id,
      name: typeof e.name === 'string' ? e.name : '',
      pitch: e.pitch!.trim(),
      perfect: e.perfect!.trim(),
      insider: e.insider!.trim(),
    });
  });
  return entries;
}

async function main(): Promise<void> {
  const entries = loadEntries();
  console.log(
    `Loaded ${entries.length} entries from ${INPUT_PATH}` +
      `${isForce ? ' (force: overwriting existing copy)' : ''}` +
      `${isDryRun ? ' (dry run: no writes)' : ''}`
  );

  const ids = entries.map((e) => e.id);
  const current = await pool.query<PlaceRow>(
    `SELECT id, name, pitch, perfect, insider FROM places WHERE id = ANY($1::uuid[])`,
    [ids]
  );
  const byId = new Map(current.rows.map((r) => [r.id, r]));

  const missing: EditorialEntry[] = [];
  const nameMismatch: Array<{ entry: EditorialEntry; dbName: string }> = [];
  const filled: Record<Column, number> = { pitch: 0, perfect: 0, insider: 0 };
  const kept: Record<Column, number> = { pitch: 0, perfect: 0, insider: 0 };
  const plan: Array<{ id: string; set: Partial<Record<Column, string>> }> = [];

  for (const entry of entries) {
    const row = byId.get(entry.id);
    if (!row) {
      missing.push(entry);
      continue;
    }
    if (entry.name && row.name.trim() !== entry.name.trim()) {
      nameMismatch.push({ entry, dbName: row.name });
    }
    const set: Partial<Record<Column, string>> = {};
    for (const col of COLUMNS) {
      if (isForce || isBlank(row[col])) {
        set[col] = entry[col];
        filled[col]++;
      } else {
        kept[col]++;
      }
    }
    if (Object.keys(set).length > 0) {
      plan.push({ id: entry.id, set });
    }
  }

  if (nameMismatch.length > 0) {
    console.log('');
    console.log(`Name differs from editorial.json for ${nameMismatch.length} row(s) (updated anyway, matched by id):`);
    for (const { entry, dbName } of nameMismatch) {
      console.log(`  ${entry.id}  file: "${entry.name}"  db: "${dbName}"`);
    }
  }

  if (missing.length > 0) {
    console.log('');
    console.log(`${missing.length} id(s) in editorial.json are not in the database (skipped):`);
    for (const entry of missing) {
      console.log(`  ${entry.id}  ${entry.name}`);
    }
  }

  if (!isDryRun && plan.length > 0) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, set } of plan) {
        const cols = Object.keys(set) as Column[];
        const assignments = cols.map((col, i) => `${col} = $${i + 2}`);
        assignments.push('updated_at = NOW()');
        const result = await client.query(
          `UPDATE places SET ${assignments.join(', ')} WHERE id = $1`,
          [id, ...cols.map((col) => set[col])]
        );
        if (result.rowCount !== 1) {
          throw new Error(`expected to update 1 row for ${id}, updated ${result.rowCount}`);
        }
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  const verb = isDryRun ? 'would write' : 'wrote';
  console.log('');
  console.log('Summary');
  console.log(`  entries in file        ${entries.length}`);
  console.log(`  rows matched           ${entries.length - missing.length}`);
  console.log(`  rows not found         ${missing.length}`);
  console.log(`  rows ${isDryRun ? 'to update' : 'updated'}  ${String(plan.length).padStart(isDryRun ? 9 : 11)}`);
  for (const col of COLUMNS) {
    console.log(
      `  ${col.padEnd(8)} ${verb} ${String(filled[col]).padStart(4)}` +
        `, kept existing ${String(kept[col]).padStart(4)}`
    );
  }

  const remaining = await pool.query<{ pitch_null: string; total: string }>(
    `SELECT count(*) FILTER (WHERE pitch IS NULL OR btrim(pitch) = '') AS pitch_null,
            count(*) AS total
       FROM places`
  );
  console.log(`  places with no pitch   ${remaining.rows[0].pitch_null} / ${remaining.rows[0].total}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
