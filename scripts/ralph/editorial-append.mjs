#!/usr/bin/env node
// Validate a batch of editorial entries and append them to scripts/ralph/data/editorial.json.
// Usage: node scripts/ralph/editorial-append.mjs <batch.json>
// Batch file: JSON array of {id, name, pitch, perfect, insider}. Ids must exist in review-context.json
// and must not already be in editorial.json. Exits non-zero and writes nothing if any entry fails.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contextPath = resolve(here, 'data/review-context.json');
const outPath = resolve(here, 'data/editorial.json');
const batchPath = process.argv[2];
if (!batchPath) {
  console.error('usage: node scripts/ralph/editorial-append.mjs <batch.json>');
  process.exit(2);
}

const context = JSON.parse(readFileSync(contextPath, 'utf8'));
const existing = existsSync(outPath) ? JSON.parse(readFileSync(outPath, 'utf8')) : [];
const batch = JSON.parse(readFileSync(batchPath, 'utf8'));
const seen = new Set(existing.map((e) => e.id));

const BANNED = /\b(hidden gem|nestled|vibrant|elevated|google|reviews?|reviewers?|stars?|ratings?)\b/i;
const errors = [];
for (const e of batch) {
  const where = `${e.name ?? '?'} (${e.id ?? '?'})`;
  if (!context[e.id]) errors.push(`${where}: id not in review-context.json`);
  else if (context[e.id].name !== e.name) errors.push(`${where}: name differs from review-context ("${context[e.id].name}")`);
  if (seen.has(e.id)) errors.push(`${where}: already in editorial.json`);
  seen.add(e.id);
  for (const f of ['pitch', 'perfect', 'insider']) {
    const v = e[f];
    if (typeof v !== 'string' || !v.trim()) errors.push(`${where}: ${f} empty`);
    else {
      if (v.includes('!')) errors.push(`${where}: ${f} has an exclamation mark`);
      const m = v.match(BANNED);
      if (m) errors.push(`${where}: ${f} uses banned word "${m[0]}"`);
    }
  }
  if (typeof e.perfect === 'string' && e.perfect.trim().split(/\s+/).length >= 12) {
    errors.push(`${where}: perfect is ${e.perfect.trim().split(/\s+/).length} words (must be under 12)`);
  }
  if (typeof e.pitch === 'string') {
    const sentences = e.pitch.replace(/\b(a\.m|p\.m|St|Ave|Mt|Dr)\./g, '$1').split(/[.?]\s+|[.?]$/).filter((s) => s.trim());
    if (sentences.length !== 2) errors.push(`${where}: pitch has ${sentences.length} sentences (must be 2)`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
const merged = existing.concat(batch);
writeFileSync(outPath, JSON.stringify(merged, null, 2) + '\n');
const total = Object.keys(context).length;
console.log(`appended ${batch.length}; editorial.json now has ${merged.length} of ${total} review-context ids`);
