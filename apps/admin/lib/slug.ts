/**
 * Slug derivation shared by the tag and neighborhood forms (client) and
 * their server actions. No 'use server' here: client components import it
 * to show the slug live while the display name is typed.
 */

export const SLUG_MAX = 64;
export const SLUG_FALLBACK = 'item';

/**
 * Lowercases, folds accented letters to their base letter, turns every run
 * of non-alphanumerics into one hyphen, trims hyphens, cuts to SLUG_MAX and
 * falls back to 'item' when nothing is left (a name like "???").
 */
export function slugify(s: string): string {
  const slug = s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, '');
  return slug || SLUG_FALLBACK;
}

/**
 * `base-n` trimmed so the result still fits in SLUG_MAX characters.
 */
export function suffixSlug(base: string, n: number): string {
  const suffix = `-${n}`;
  return `${base.slice(0, SLUG_MAX - suffix.length).replace(/-+$/g, '')}${suffix}`;
}
