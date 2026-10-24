/**
 * Content-gaps report
 *
 *   DATABASE_URL=postgres://... npx tsx scripts/content-report.ts
 *   npm run report:content
 *
 * Prints one row per place with the editorial/enrichment fields that still
 * need work, sorted so the places with the most gaps come first, followed by
 * summary counts. Read-only: it runs a single SELECT.
 *
 * Columns:
 *   gaps    number of missing items (photo, pitch, tags, hours, enrichment)
 *   photo   Y when photo_url is set
 *   pitch   Y when pitch is non-blank
 *   tags    number of rows in place_tags for the place
 *   hours   Y when hours_json is set
 *   status  enrichment_status (pending / ok / failed)
 *
 * Required environment variables:
 *   DATABASE_URL — PostgreSQL connection string
 */

import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 1,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

interface ReportRow {
  id: string;
  name: string;
  has_photo: boolean;
  has_pitch: boolean;
  tag_count: number;
  has_hours: boolean;
  enrichment_status: string;
  gaps: number;
}

const REPORT_SQL = `
  WITH per_place AS (
    SELECT
      p.id,
      p.name,
      (p.photo_url IS NOT NULL AND btrim(p.photo_url) <> '') AS has_photo,
      (p.pitch IS NOT NULL AND btrim(p.pitch) <> '') AS has_pitch,
      (SELECT count(*) FROM place_tags pt WHERE pt.place_id = p.id)::int AS tag_count,
      (p.hours_json IS NOT NULL) AS has_hours,
      COALESCE(p.enrichment_status, 'pending') AS enrichment_status
    FROM places p
  )
  SELECT
    *,
    (
      (NOT has_photo)::int
      + (NOT has_pitch)::int
      + (tag_count = 0)::int
      + (NOT has_hours)::int
      + (enrichment_status <> 'ok')::int
    ) AS gaps
  FROM per_place
  ORDER BY gaps DESC, lower(name) ASC, id ASC
`;

function yn(value: boolean): string {
  return value ? 'Y' : '-';
}

function pad(value: string | number, width: number, align: 'left' | 'right' = 'left'): string {
  const text = String(value);
  if (text.length >= width) return text;
  const fill = ' '.repeat(width - text.length);
  return align === 'left' ? text + fill : fill + text;
}

function printTable(rows: ReportRow[]): void {
  const nameWidth = Math.max('name'.length, ...rows.map((r) => r.name.length));
  const statusWidth = Math.max('status'.length, ...rows.map((r) => r.enrichment_status.length));

  const header = [
    pad('gaps', 4, 'right'),
    pad('photo', 5),
    pad('pitch', 5),
    pad('tags', 4, 'right'),
    pad('hours', 5),
    pad('status', statusWidth),
    pad('name', nameWidth),
    'id',
  ].join('  ');

  console.log(header);
  console.log('-'.repeat(header.length));

  for (const row of rows) {
    console.log(
      [
        pad(row.gaps, 4, 'right'),
        pad(yn(row.has_photo), 5),
        pad(yn(row.has_pitch), 5),
        pad(row.tag_count, 4, 'right'),
        pad(yn(row.has_hours), 5),
        pad(row.enrichment_status, statusWidth),
        pad(row.name, nameWidth),
        row.id,
      ].join('  ')
    );
  }
}

function printSummary(rows: ReportRow[]): void {
  const total = rows.length;
  const count = (pred: (r: ReportRow) => boolean): number => rows.filter(pred).length;

  const line = (label: string, n: number): string =>
    `${pad(label, 20)} ${pad(n, 5, 'right')} / ${total}`;

  console.log('');
  console.log('Summary');
  console.log(line('places', total));
  console.log(line('with photo', count((r) => r.has_photo)));
  console.log(line('with pitch', count((r) => r.has_pitch)));
  console.log(line('with >= 1 tag', count((r) => r.tag_count > 0)));
  console.log(line('with hours', count((r) => r.has_hours)));

  const byStatus = new Map<string, number>();
  for (const r of rows) {
    byStatus.set(r.enrichment_status, (byStatus.get(r.enrichment_status) ?? 0) + 1);
  }
  for (const [status, n] of [...byStatus.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    console.log(line(`status ${status}`, n));
  }

  console.log(line('complete (0 gaps)', count((r) => r.gaps === 0)));
}

async function main(): Promise<void> {
  const result = await pool.query<ReportRow>(REPORT_SQL);
  printTable(result.rows);
  printSummary(result.rows);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
