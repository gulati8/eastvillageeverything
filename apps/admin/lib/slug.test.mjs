/**
 * Unit tests for the slug derivation behind the tag and neighborhood forms.
 *
 * Run (Node >= 22.18, which strips types from `.ts` imports natively):
 *   cd apps/admin && node --test lib/slug.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SLUG_MAX, slugify, suffixSlug } from './slug.ts';

describe('slugify', () => {
  it('lowercases and turns spaces into hyphens', () => {
    assert.equal(slugify('Happy Hour'), 'happy-hour');
    assert.equal(slugify('  Late   Night  '), 'late-night');
  });

  it('collapses punctuation into one hyphen', () => {
    assert.equal(slugify('Ralph Hour!'), 'ralph-hour');
    assert.equal(slugify("Mom & Pop's / Deli"), 'mom-pop-s-deli');
    assert.equal(slugify('A--B__C'), 'a-b-c');
  });

  it('folds accents to the base letter', () => {
    assert.equal(slugify('Café Mogador'), 'cafe-mogador');
    assert.equal(slugify('Jalapeño Niño'), 'jalapeno-nino');
    assert.equal(slugify('Crème Brûlée'), 'creme-brulee');
  });

  it('trims leading and trailing hyphens', () => {
    assert.equal(slugify('-happy-hour-'), 'happy-hour');
    assert.equal(slugify('!!! Happy Hour !!!'), 'happy-hour');
  });

  it('cuts at 64 characters without leaving a trailing hyphen', () => {
    const long = 'a'.repeat(70);
    assert.equal(slugify(long), 'a'.repeat(SLUG_MAX));
    assert.equal(slugify(long).length, 64);
    const wordy = `${'b'.repeat(63)} c`;
    assert.equal(slugify(wordy), 'b'.repeat(63));
  });

  it('falls back to "item" when nothing is left', () => {
    assert.equal(slugify(''), 'item');
    assert.equal(slugify('???'), 'item');
    assert.equal(slugify('   '), 'item');
    assert.equal(slugify('日本語'), 'item');
  });
});

describe('suffixSlug', () => {
  it('appends -n', () => {
    assert.equal(suffixSlug('ralph-hour', 2), 'ralph-hour-2');
    assert.equal(suffixSlug('ralph-hour', 10), 'ralph-hour-10');
  });

  it('keeps the result within 64 characters', () => {
    const full = 'a'.repeat(64);
    assert.equal(suffixSlug(full, 2), `${'a'.repeat(62)}-2`);
    assert.equal(suffixSlug(full, 2).length, 64);
    assert.equal(suffixSlug(full, 12).length, 64);
  });
});
