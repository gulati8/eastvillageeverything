/**
 * Unit tests for the pure half of the admin "Generate editorial" feature.
 *
 * Run (Node >= 22.18, which strips types from `.ts` imports natively):
 *   cd apps/admin && node --test lib/editorial.test.mjs
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  EDITORIAL_FIELDS,
  EDITORIAL_OUTPUT_SCHEMA,
  buildEditorialPrompt,
  editorialViolations,
  isEditorialField,
  normalizeEditorialOutput,
  pickEditorialFields,
  splitSentences,
  validateEditorial,
} from './editorial.ts';

const place = {
  name: 'Death & Co',
  address: '433 E 6th St, New York, NY 10009',
  cross_street: 'between Ave A and 1st Ave',
  neighborhood: 'East Village',
  url: 'https://www.deathandcompany.com',
  tags: ['Cocktails', 'Late night'],
  hours: ['Monday: 6:00 PM – 1:00 AM', 'Tuesday: 6:00 PM – 1:00 AM'],
  price_tier: '$$$',
  specials: 'Happy hour 6 to 7',
  notes: 'Reservations open 30 days out.',
  current: { pitch: 'Existing pitch text.', crowd: 'cocktail nerds', vibe: '' },
};

describe('EDITORIAL_FIELDS', () => {
  it('lists the five fields in form order', () => {
    assert.deepEqual([...EDITORIAL_FIELDS], ['pitch', 'perfect', 'insider', 'vibe', 'crowd']);
    assert.equal(isEditorialField('vibe'), true);
    assert.equal(isEditorialField('name'), false);
    assert.equal(isEditorialField(3), false);
  });

  it('has a schema with the same five nullable string properties, all required', () => {
    assert.deepEqual(Object.keys(EDITORIAL_OUTPUT_SCHEMA.properties), [...EDITORIAL_FIELDS]);
    assert.deepEqual([...EDITORIAL_OUTPUT_SCHEMA.required], [...EDITORIAL_FIELDS]);
    assert.equal(EDITORIAL_OUTPUT_SCHEMA.additionalProperties, false);
    for (const f of EDITORIAL_FIELDS) {
      assert.deepEqual([...EDITORIAL_OUTPUT_SCHEMA.properties[f].type], ['string', 'null']);
    }
  });
});

describe('buildEditorialPrompt', () => {
  it('carries the voice rules in the system prompt', () => {
    const { system } = buildEditorialPrompt({ place, fields: ['pitch'] });
    for (const needle of ['two sentences', 'Perfect when', 'under 12 words', '" · "', 'hidden gem', 'nestled', 'vibrant', 'elevated', 'Google', 'Yelp', 'exclamation', 'last two years', 'null']) {
      assert.ok(system.includes(needle), `system prompt should mention ${needle}`);
    }
  });

  it('puts the place facts, hours and price tier in the user message', () => {
    const { user } = buildEditorialPrompt({ place, fields: [...EDITORIAL_FIELDS] });
    assert.match(user, /^Place: Death & Co$/m);
    assert.match(user, /^Address: 433 E 6th St/m);
    assert.match(user, /^Cross street: between Ave A and 1st Ave$/m);
    assert.match(user, /^Neighborhood: East Village$/m);
    assert.match(user, /^Website: https:\/\/www\.deathandcompany\.com$/m);
    assert.match(user, /^Tags: Cocktails, Late night$/m);
    assert.match(user, /^Price tier: \$\$\$$/m);
    assert.match(user, /^Hours:\n {2}Monday: 6:00 PM – 1:00 AM\n {2}Tuesday/m);
    assert.match(user, /^Specials: Happy hour 6 to 7$/m);
    assert.match(user, /^Notes: Reservations open 30 days out\.$/m);
    assert.match(user, /^Write these fields: pitch, perfect, insider, vibe, crowd\.$/m);
    assert.doesNotMatch(user, /Return null for/);
    assert.doesNotMatch(user, /Current copy/);
  });

  it('names the fields to write and to null, and passes the current text of the others', () => {
    const { user } = buildEditorialPrompt({ place, fields: ['perfect', 'insider'] });
    assert.match(user, /^Write these fields: perfect, insider\.$/m);
    assert.match(user, /^Return null for: pitch, vibe, crowd\.$/m);
    assert.match(user, /Current copy for the other fields/);
    assert.match(user, /^ {2}pitch: Existing pitch text\.$/m);
    assert.match(user, /^ {2}crowd: cocktail nerds$/m);
    assert.doesNotMatch(user, /^ {2}vibe:/m, 'blank current fields are not listed');
  });

  it('does not echo the current text of a field being rewritten', () => {
    const { user } = buildEditorialPrompt({ place, fields: ['pitch'] });
    assert.doesNotMatch(user, /Existing pitch text/);
    assert.match(user, /^ {2}crowd: cocktail nerds$/m);
  });

  it('leaves out blank facts', () => {
    const { user } = buildEditorialPrompt({ place: { name: 'Bare Bar', address: '  ', tags: [], hours: [] }, fields: ['vibe'] });
    assert.equal(user, 'Place: Bare Bar\n\nWrite these fields: vibe.\nReturn null for: pitch, perfect, insider, crowd.');
  });
});

describe('splitSentences', () => {
  it('splits on sentence-ending periods and question marks but not on St./Ave./a.m.', () => {
    assert.equal(splitSentences('Go at 11 p.m. on a Tuesday. The bar on E 6th St. is quieter then.').length, 2);
    assert.equal(splitSentences('One sentence only.').length, 1);
    assert.equal(splitSentences('First. Second. Third.').length, 3);
    assert.equal(splitSentences('Is it good? Yes.').length, 2);
  });
});

describe('validateEditorial', () => {
  const clean = {
    pitch: 'The cocktails are the point here, and the room is dark enough to linger. Go early on a weeknight and you can walk in.',
    perfect: 'you want a serious drink without the velvet rope',
    insider: 'Ask for the seats at the bar near the door.',
    vibe: 'dim · hushed · leather',
    crowd: 'cocktail nerds and second dates',
  };

  it('passes clean copy', () => {
    assert.deepEqual(validateEditorial(clean), []);
  });

  it('skips null, undefined and blank fields', () => {
    assert.deepEqual(validateEditorial({ pitch: null, perfect: undefined, insider: '  ', vibe: null, crowd: null }), []);
    assert.deepEqual(validateEditorial({}), []);
  });

  it('flags exclamation marks on any field', () => {
    assert.deepEqual(validateEditorial({ ...clean, crowd: 'everyone!' }), ['crowd: has an exclamation mark']);
  });

  it('flags the banned words and source mentions, case-insensitively', () => {
    assert.deepEqual(validateEditorial({ ...clean, insider: 'A Hidden Gem on the block.' }), ['insider: uses the banned word "Hidden Gem"']);
    assert.deepEqual(validateEditorial({ ...clean, crowd: 'nestled regulars' }), ['crowd: uses the banned word "nestled"']);
    assert.deepEqual(validateEditorial({ ...clean, crowd: 'a vibrant mix' }), ['crowd: uses the banned word "vibrant"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'Elevated bar food after ten.' }), ['insider: uses the banned word "Elevated"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'Reviewers love the fries.' }), ['insider: uses the banned word "Reviewers"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'Five stars on Google.' }).sort(), ['insider: uses the banned word "stars"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'Yelp says the fries are good.' }), ['insider: uses the banned word "Yelp"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'The ratings are high.' }), ['insider: uses the banned word "ratings"']);
    assert.deepEqual(validateEditorial({ ...clean, insider: 'Stargazing from the roof.' }), [], 'word boundary: "Stargazing" is not "star"');
  });

  it('requires perfect to be under 12 words with no "Perfect when" prefix', () => {
    assert.deepEqual(validateEditorial({ ...clean, perfect: 'one two three four five six seven eight nine ten eleven' }), []);
    assert.deepEqual(validateEditorial({ ...clean, perfect: 'one two three four five six seven eight nine ten eleven twelve' }), ['perfect: is 12 words (must be under 12)']);
    assert.deepEqual(validateEditorial({ ...clean, perfect: 'Perfect when you want a drink' }), ['perfect: starts with "Perfect when" (write only what follows)']);
  });

  it('requires pitch to be exactly two sentences', () => {
    assert.deepEqual(validateEditorial({ ...clean, pitch: 'Just one sentence here.' }), ['pitch: has 1 sentence (must be exactly 2)']);
    assert.deepEqual(validateEditorial({ ...clean, pitch: 'One. Two. Three.' }), ['pitch: has 3 sentences (must be exactly 2)']);
    assert.deepEqual(validateEditorial({ ...clean, pitch: 'Go at 11 p.m. on E 6th St. for the quiet. Order the daiquiri.' }), []);
  });

  it('requires vibe to be three " · "-separated parts', () => {
    assert.deepEqual(validateEditorial({ ...clean, vibe: 'dim · loud' }), ['vibe: has 2 parts (must be 3 words joined by " · ")']);
    assert.deepEqual(validateEditorial({ ...clean, vibe: 'dim, loud, leather' }), ['vibe: has 1 part (must be 3 words joined by " · ")']);
    assert.deepEqual(validateEditorial({ ...clean, vibe: 'dim ·  · leather' }), ['vibe: has 2 parts (must be 3 words joined by " · ")']);
    assert.deepEqual(validateEditorial({ ...clean, vibe: 'a · b · c · d' }), ['vibe: has 4 parts (must be 3 words joined by " · ")']);
  });

  it('reports every violation, one per rule, with the field in editorialViolations', () => {
    const v = editorialViolations({ ...clean, pitch: 'Nestled gem!', vibe: 'x' });
    assert.deepEqual(v.map((x) => x.field), ['pitch', 'pitch', 'pitch', 'vibe']);
    assert.equal(validateEditorial({ ...clean, pitch: 'Nestled gem!', vibe: 'x' }).length, 4);
  });
});

describe('normalizeEditorialOutput', () => {
  it('trims strings, nulls blanks and non-strings, drops extra keys', () => {
    assert.deepEqual(
      normalizeEditorialOutput({ pitch: '  A. B. ', perfect: '', insider: null, vibe: 42, crowd: 'regulars', extra: 'x' }),
      { pitch: 'A. B.', perfect: null, insider: null, vibe: null, crowd: 'regulars' },
    );
  });

  it('fills missing keys with null', () => {
    assert.deepEqual(normalizeEditorialOutput({}), { pitch: null, perfect: null, insider: null, vibe: null, crowd: null });
  });

  it('throws on anything that is not an object', () => {
    assert.throws(() => normalizeEditorialOutput(null));
    assert.throws(() => normalizeEditorialOutput('text'));
    assert.throws(() => normalizeEditorialOutput([1]));
  });
});

describe('pickEditorialFields', () => {
  it('keeps the requested fields and nulls the rest, in form order', () => {
    const all = { pitch: 'p', perfect: 'q', insider: 'i', vibe: 'v', crowd: 'c' };
    assert.deepEqual(pickEditorialFields(all, ['crowd', 'pitch']), { pitch: 'p', perfect: null, insider: null, vibe: null, crowd: 'c' });
    assert.deepEqual(Object.keys(pickEditorialFields(all, ['crowd'])), [...EDITORIAL_FIELDS]);
  });
});
