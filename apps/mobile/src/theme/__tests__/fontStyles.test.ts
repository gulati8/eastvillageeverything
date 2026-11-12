/**
 * Source check: the custom font files already carry their weight and slant
 * (InstrumentSerif_400Regular_Italic, SchibstedGrotesk_700Bold, ...). Adding
 * an italic `fontStyle` or a `fontWeight` on top makes Android look for an
 * italic/bold variant of that family, find none, and fall back to the system
 * font. So: no italic `fontStyle` anywhere, and `fontWeight` only on text
 * that uses the system font (listed below).
 */

import * as fs from 'fs';
import * as path from 'path';

const MOBILE_ROOT = path.resolve(__dirname, '../../..');

/** `file:styleKey` of styles that set a weight on system-font text. */
const SYSTEM_FONT_WEIGHTS = new Set(['src/screens/PlaceDetail.tsx:backGlyph']);

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '__tests__') sourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const FILES = [
  ...sourceFiles(path.join(MOBILE_ROOT, 'src')),
  ...sourceFiles(path.join(MOBILE_ROOT, 'app')),
];

describe('font styles', () => {
  it('finds the source files', () => {
    expect(FILES.length).toBeGreaterThan(20);
  });

  it('no italic fontStyle remains (the italic font files are the italic)', () => {
    const hits = FILES.filter((f) => /fontStyle\s*:\s*['"]italic['"]/.test(fs.readFileSync(f, 'utf8')))
      .map((f) => path.relative(MOBILE_ROOT, f));
    expect(hits).toEqual([]);
  });

  it('fontWeight appears only on the known system-font styles', () => {
    const hits: string[] = [];
    for (const file of FILES) {
      const lines = fs.readFileSync(file, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/fontWeight\s*:/.test(line)) return;
        // The enclosing style key: the nearest line above of the form `name: {`.
        let key = '?';
        for (let j = i; j >= 0; j--) {
          const m = /^\s*(\w+)\s*:\s*\{\s*$/.exec(lines[j]);
          if (m) {
            key = m[1];
            break;
          }
        }
        hits.push(`${path.relative(MOBILE_ROOT, file)}:${key}`);
      });
    }
    expect(hits.filter((h) => !SYSTEM_FONT_WEIGHTS.has(h))).toEqual([]);
  });

  it('the allowed system-font styles set no custom fontFamily', () => {
    const src = fs.readFileSync(path.join(MOBILE_ROOT, 'src/screens/PlaceDetail.tsx'), 'utf8');
    const usage = /style=\{\[styles\.backGlyph,[^\]]*\]\}/.exec(src);
    expect(usage).not.toBeNull();
    expect(usage![0]).not.toContain('fontFamily');
  });
});
