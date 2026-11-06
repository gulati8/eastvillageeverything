/**
 * Unit tests for the place form reader behind createPlace and updatePlace.
 *
 * Run (Node >= 22.18, which strips types from `.ts` imports natively):
 *   cd apps/admin && node --test lib/placeForm.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PLACE_TEXT_FIELDS, readPlaceForm } from './placeForm.ts';

// Every key the old `readForm` in actions/places.ts returned.
const OLD_READ_FORM_KEYS = [
  'name',
  'address',
  'cross_street',
  'phone',
  'url',
  'neighborhood_id',
  'specials',
  'notes',
  'pitch',
  'perfect',
  'insider',
  'vibe',
  'crowd',
];

function form(entries) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(entries)) fd.set(k, v);
  return fd;
}

describe('readPlaceForm', () => {
  it('returns a blank notes field as an empty string, not undefined', () => {
    const f = readPlaceForm(form({ name: 'Death & Co', notes: '' }));
    assert.equal(f.notes, '');
    assert.notEqual(f.notes, undefined);
  });

  it('returns an absent text field as an empty string', () => {
    const f = readPlaceForm(form({ name: 'Death & Co' }));
    for (const key of PLACE_TEXT_FIELDS) {
      assert.equal(f[key], '', `${key} should be '' when the form omits it`);
    }
  });

  it('treats whitespace-only text as blank', () => {
    const f = readPlaceForm(form({ name: 'Death & Co', notes: '  ', pitch: '\n\t ' }));
    assert.equal(f.notes, '');
    assert.equal(f.pitch, '');
  });

  it('trims a filled field', () => {
    const f = readPlaceForm(form({ name: 'Death & Co', specials: '  Happy hour 5 to 7  ', address: ' 433 E 6th St ' }));
    assert.equal(f.specials, 'Happy hour 5 to 7');
    assert.equal(f.address, '433 E 6th St');
  });

  it('trims the name', () => {
    const f = readPlaceForm(form({ name: '  Death & Co  ' }));
    assert.equal(f.name, 'Death & Co');
  });

  it('returns an empty name as an empty string so the action can reject it', () => {
    assert.equal(readPlaceForm(form({ name: '   ' })).name, '');
    assert.equal(readPlaceForm(form({})).name, '');
  });

  it('returns a blank neighborhood_id as undefined', () => {
    assert.equal(readPlaceForm(form({ name: 'x', neighborhood_id: '' })).neighborhood_id, undefined);
    assert.equal(readPlaceForm(form({ name: 'x', neighborhood_id: '  ' })).neighborhood_id, undefined);
    assert.equal(readPlaceForm(form({ name: 'x' })).neighborhood_id, undefined);
  });

  it('keeps a filled neighborhood_id', () => {
    const f = readPlaceForm(form({ name: 'x', neighborhood_id: ' abc-123 ' }));
    assert.equal(f.neighborhood_id, 'abc-123');
  });

  it('returns every key the old readForm returned', () => {
    const f = readPlaceForm(form({ name: 'x' }));
    for (const key of OLD_READ_FORM_KEYS) {
      assert.ok(key in f, `${key} missing from readPlaceForm result`);
    }
    assert.deepEqual(Object.keys(f).sort(), [...OLD_READ_FORM_KEYS].sort());
  });

  it('ignores fields it does not own', () => {
    const f = readPlaceForm(form({ name: 'x', tag_ids: '["a"]', return_to: '/places', photo_url: 'nope' }));
    assert.equal('tag_ids' in f, false);
    assert.equal('return_to' in f, false);
    assert.equal('photo_url' in f, false);
  });
});
