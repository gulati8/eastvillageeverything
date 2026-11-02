/**
 * Unit tests for PlacePhotoModel (packages/db/src/models/placePhoto.ts).
 *
 * Test framework: Node built-in `node:test` + `node:assert`, in the style of
 * place-findAll-q.test.mjs. The `query` and `withTransaction` helpers from
 * `../pool.js` are replaced with `mock.module`, so no Postgres is needed.
 * The mock hands `withTransaction` a fake client that records every SQL
 * statement and its parameters and answers from a per-test script.
 *
 * The model is loaded from the package's compiled `dist/`, so build first:
 *   npm run build:packages
 *   node --experimental-test-module-mocks --test packages/db/src/models/__tests__/place-photo.test.mjs
 *
 * (`mock.module` is behind that flag on Node 22-26.)
 *
 * Covered:
 *   - add: locks the place, inserts at COALESCE(MAX(position) + 1, 0), mirrors
 *   - add: refuses a non-http(s) url before touching the DB
 *   - remove: deletes, renumbers the rest from 0, mirrors; null for unknown id
 *   - makeFirst: shifts earlier rows up, sets 0, mirrors; no shift at position 0
 *   - setCredit: writes the trimmed credit (blank -> null), mirrors
 *   - mirrorFirst: the UPDATE copies the position-0 row (or nulls) into places
 *   - listForPlace: ordered by position
 *   - countsByPlace: one GROUP BY query, returned as a Map keyed by place id
 * Needs a live DB (not covered here): the deferred constraint actually
 * tolerating the mid-transaction swap; verified by hand in progress.txt (2.1).
 */

import { test, describe, mock, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, '../../../dist');
const poolUrl = pathToFileURL(resolve(dist, 'pool.js')).href;
const modelUrl = pathToFileURL(resolve(dist, 'models/placePhoto.js')).href;

// ---------------------------------------------------------------------------
// Fake pool: `calls` records { sql, params } for every statement (pool-level
// `query` and client-level `client.query` alike). `script` is a queue of
// results handed back in order; anything past the end returns no rows.
// ---------------------------------------------------------------------------

const calls = [];
const script = [];
let transactions = 0;

function nextResult() {
  const next = script.shift();
  if (next === undefined) return { rows: [], rowCount: 0 };
  return next;
}

const fakeClient = {
  async query(sql, params) {
    calls.push({ sql: squash(sql), params: params ?? [] });
    return nextResult();
  },
};

const pool = {
  async query(sql, params) {
    calls.push({ sql: squash(sql), params: params ?? [] });
    return nextResult();
  },
  async withTransaction(callback) {
    transactions += 1;
    return callback(fakeClient);
  },
};

mock.module(poolUrl, { namedExports: pool });
const { PlacePhotoModel } = await import(modelUrl);

function squash(sql) {
  return String(sql).replace(/\s+/g, ' ').trim();
}

function rows(...list) {
  return { rows: list, rowCount: list.length };
}

const PLACE = '11111111-1111-4111-8111-111111111111';
const PHOTO = '22222222-2222-4222-8222-222222222222';

function photoRow(overrides = {}) {
  return {
    id: PHOTO,
    place_id: PLACE,
    url: 'https://cdn.example/p.jpg',
    thumb_url: 'https://cdn.example/p.thumb.jpg',
    hero_url: 'https://cdn.example/p.hero.jpg',
    credit: null,
    position: 0,
    created_at: new Date('2026-11-01T00:00:00Z'),
    ...overrides,
  };
}

const isLock = (c) => /SELECT id FROM places WHERE id = \$1 FOR UPDATE/.test(c.sql);
const isMirror = (c) => /UPDATE places p SET photo_url = f\.url/.test(c.sql);

beforeEach(() => {
  calls.length = 0;
  script.length = 0;
  transactions = 0;
});

// ---------------------------------------------------------------------------

describe('PlacePhotoModel.listForPlace', () => {
  test('selects the place photos ordered by position through the pool', async () => {
    script.push(rows(photoRow(), photoRow({ id: 'b', position: 1 })));
    const list = await PlacePhotoModel.listForPlace(PLACE);
    assert.equal(list.length, 2);
    assert.equal(calls.length, 1);
    assert.match(calls[0].sql, /FROM place_photos WHERE place_id = \$1 ORDER BY position ASC/);
    assert.deepEqual(calls[0].params, [PLACE]);
    assert.equal(transactions, 0, 'a read needs no transaction');
  });
});

describe('PlacePhotoModel.countsByPlace', () => {
  test('groups place_photos by place_id in one query and returns a Map', async () => {
    script.push(rows({ place_id: PLACE, count: 3 }, { place_id: 'other', count: 1 }));
    const counts = await PlacePhotoModel.countsByPlace();
    assert.equal(calls.length, 1, 'one query for every place');
    assert.match(calls[0].sql, /SELECT place_id, COUNT\(\*\)::int AS count FROM place_photos GROUP BY place_id/);
    assert.deepEqual(calls[0].params, []);
    assert.equal(counts.get(PLACE), 3);
    assert.equal(counts.get('other'), 1);
    assert.equal(counts.get('missing'), undefined, 'places with no photos are absent');
    assert.equal(transactions, 0, 'a read needs no transaction');
  });
});

describe('PlacePhotoModel.add', () => {
  test('locks the place, appends at COALESCE(MAX(position) + 1, 0), then mirrors', async () => {
    script.push(rows({ id: PLACE })); // lock
    script.push(rows(photoRow({ position: 2 }))); // insert ... returning
    const added = await PlacePhotoModel.add(PLACE, {
      url: 'https://cdn.example/p.jpg',
      thumb_url: 'https://cdn.example/p.thumb.jpg',
      hero_url: 'https://cdn.example/p.hero.jpg',
      credit: '  Jane  ',
    });

    assert.equal(transactions, 1);
    assert.equal(added.position, 2);
    assert.equal(calls.length, 3, 'lock, insert, mirror');
    assert.ok(isLock(calls[0]), 'first statement locks the place row');
    assert.deepEqual(calls[0].params, [PLACE]);

    const insert = calls[1];
    assert.match(insert.sql, /INSERT INTO place_photos \(place_id, url, thumb_url, hero_url, credit, position\)/);
    assert.match(insert.sql, /COALESCE\(MAX\(position\) \+ 1, 0\) FROM place_photos WHERE place_id = \$1/);
    assert.match(insert.sql, /RETURNING id, place_id, url, thumb_url, hero_url, credit, position, created_at/);
    assert.deepEqual(insert.params, [
      PLACE,
      'https://cdn.example/p.jpg',
      'https://cdn.example/p.thumb.jpg',
      'https://cdn.example/p.hero.jpg',
      'Jane',
    ]);

    assert.ok(isMirror(calls[2]), 'last statement mirrors the first photo into places');
    assert.deepEqual(calls[2].params, [PLACE]);
  });

  test('nulls a thumb/hero that is not an absolute http(s) URL', async () => {
    script.push(rows({ id: PLACE }));
    script.push(rows(photoRow()));
    await PlacePhotoModel.add(PLACE, { url: 'https://cdn.example/p.jpg', thumb_url: '/relative.jpg', hero_url: 'ftp://x/y' });
    assert.deepEqual(calls[1].params.slice(2, 4), [null, null]);
  });

  test('refuses a relative or non-http url before touching the database', async () => {
    await assert.rejects(() => PlacePhotoModel.add(PLACE, { url: '/uploads/x.jpg' }), /absolute http/);
    await assert.rejects(() => PlacePhotoModel.add(PLACE, { url: 'javascript:alert(1)' }), /absolute http/);
    assert.equal(calls.length, 0);
    assert.equal(transactions, 0);
  });

  test('throws when the place does not exist (lock finds no row), and does not insert', async () => {
    script.push(rows()); // lock: no place
    await assert.rejects(() => PlacePhotoModel.add(PLACE, { url: 'https://cdn.example/p.jpg' }), /Place not found/);
    assert.equal(calls.length, 1);
  });
});

describe('PlacePhotoModel.remove', () => {
  test('deletes the row, renumbers the rest from 0, mirrors, returns the place id', async () => {
    script.push(rows({ place_id: PLACE })); // owner lookup
    script.push(rows({ id: PLACE })); // lock
    script.push({ rows: [], rowCount: 1 }); // delete
    script.push({ rows: [], rowCount: 2 }); // renumber
    const placeId = await PlacePhotoModel.remove(PHOTO);

    assert.equal(placeId, PLACE);
    assert.equal(transactions, 1);
    assert.equal(calls.length, 5, 'lookup, lock, delete, renumber, mirror');
    assert.match(calls[0].sql, /SELECT place_id FROM place_photos WHERE id = \$1/);
    assert.ok(isLock(calls[1]));
    assert.match(calls[2].sql, /^DELETE FROM place_photos WHERE id = \$1$/);
    assert.deepEqual(calls[2].params, [PHOTO]);

    const renumber = calls[3];
    assert.match(renumber.sql, /UPDATE place_photos p SET position = r\.rn/);
    assert.match(renumber.sql, /ROW_NUMBER\(\) OVER \(ORDER BY position\) - 1 AS rn FROM place_photos WHERE place_id = \$1/);
    assert.match(renumber.sql, /WHERE p\.id = r\.id AND p\.position <> r\.rn/);
    assert.deepEqual(renumber.params, [PLACE]);

    assert.ok(isMirror(calls[4]));
    assert.deepEqual(calls[4].params, [PLACE]);
  });

  test('returns null and writes nothing when the photo id is unknown', async () => {
    script.push(rows()); // owner lookup: nothing
    const placeId = await PlacePhotoModel.remove(PHOTO);
    assert.equal(placeId, null);
    assert.equal(calls.length, 1);
    assert.equal(calls.filter(isMirror).length, 0);
  });
});

describe('PlacePhotoModel.makeFirst', () => {
  test('shifts the rows before it up by one, sets it to 0, mirrors, returns the moved row', async () => {
    script.push(rows({ place_id: PLACE, position: 2 })); // current
    script.push(rows({ id: PLACE })); // lock
    script.push({ rows: [], rowCount: 2 }); // shift
    script.push({ rows: [], rowCount: 1 }); // set 0
    script.push({ rows: [], rowCount: 1 }); // mirror
    script.push(rows(photoRow({ position: 0 }))); // re-read
    const moved = await PlacePhotoModel.makeFirst(PHOTO);

    assert.equal(moved.position, 0);
    assert.equal(transactions, 1);
    assert.equal(calls.length, 6, 'read, lock, shift, set, mirror, re-read');
    assert.match(calls[0].sql, /SELECT place_id, position FROM place_photos WHERE id = \$1/);
    assert.ok(isLock(calls[1]));

    const shift = calls[2];
    assert.match(shift.sql, /UPDATE place_photos SET position = position \+ 1 WHERE place_id = \$1 AND position < \$2/);
    assert.deepEqual(shift.params, [PLACE, 2]);

    const setZero = calls[3];
    assert.match(setZero.sql, /UPDATE place_photos SET position = 0 WHERE id = \$1/);
    assert.deepEqual(setZero.params, [PHOTO]);

    assert.ok(isMirror(calls[4]));
    assert.deepEqual(calls[4].params, [PLACE]);
    assert.match(calls[5].sql, /SELECT id, place_id, url, thumb_url, hero_url, credit, position, created_at FROM place_photos WHERE id = \$1/);
  });

  test('a photo already at position 0 is not shifted, but the mirror still runs', async () => {
    script.push(rows({ place_id: PLACE, position: 0 }));
    script.push(rows({ id: PLACE }));
    script.push({ rows: [], rowCount: 1 }); // mirror
    script.push(rows(photoRow()));
    const moved = await PlacePhotoModel.makeFirst(PHOTO);
    assert.equal(moved.position, 0);
    assert.equal(calls.filter((c) => /SET position = position \+ 1/.test(c.sql)).length, 0);
    assert.equal(calls.filter((c) => /SET position = 0/.test(c.sql)).length, 0);
    assert.equal(calls.filter(isMirror).length, 1);
  });

  test('returns null and writes nothing when the photo id is unknown', async () => {
    script.push(rows());
    assert.equal(await PlacePhotoModel.makeFirst(PHOTO), null);
    assert.equal(calls.length, 1);
  });
});

describe('PlacePhotoModel.setCredit', () => {
  test('writes the trimmed credit and mirrors', async () => {
    script.push(rows(photoRow({ credit: 'Jane' })));
    const row = await PlacePhotoModel.setCredit(PHOTO, '  Jane ');
    assert.equal(row.credit, 'Jane');
    assert.equal(transactions, 1);
    assert.equal(calls.length, 2, 'update, mirror');
    assert.match(calls[0].sql, /UPDATE place_photos SET credit = \$2 WHERE id = \$1 RETURNING/);
    assert.deepEqual(calls[0].params, [PHOTO, 'Jane']);
    assert.ok(isMirror(calls[1]));
    assert.deepEqual(calls[1].params, [PLACE]);
  });

  test('a blank credit is stored as null', async () => {
    script.push(rows(photoRow()));
    await PlacePhotoModel.setCredit(PHOTO, '   ');
    assert.deepEqual(calls[0].params, [PHOTO, null]);
  });

  test('returns null and does not mirror when the photo id is unknown', async () => {
    script.push(rows());
    assert.equal(await PlacePhotoModel.setCredit(PHOTO, 'x'), null);
    assert.equal(calls.length, 1);
  });
});

describe('mirrorFirst (through add)', () => {
  test('copies the position-0 row, or nulls, into the four legacy places columns', async () => {
    script.push(rows({ id: PLACE }));
    script.push(rows(photoRow()));
    await PlacePhotoModel.add(PLACE, { url: 'https://cdn.example/p.jpg' });
    const mirror = calls.find(isMirror);
    assert.ok(mirror);
    assert.match(mirror.sql, /SET photo_url = f\.url, photo_thumb_url = f\.thumb_url, photo_hero_url = f\.hero_url, photo_credit = f\.credit/);
    // LEFT JOIN on position 0 so a place with no photos gets nulls, not no update.
    assert.match(mirror.sql, /FROM \(SELECT \$1::uuid AS id\) k LEFT JOIN place_photos f ON f\.place_id = k\.id AND f\.position = 0/);
    assert.match(mirror.sql, /WHERE p\.id = k\.id/);
    assert.deepEqual(mirror.params, [PLACE]);
  });

  test('every write path ends with exactly one mirror', async () => {
    // add
    script.push(rows({ id: PLACE }), rows(photoRow()));
    await PlacePhotoModel.add(PLACE, { url: 'https://cdn.example/p.jpg' });
    assert.ok(isMirror(calls.at(-1)));
    assert.equal(calls.filter(isMirror).length, 1);
    calls.length = 0;

    // remove
    script.push(rows({ place_id: PLACE }), rows({ id: PLACE }));
    await PlacePhotoModel.remove(PHOTO);
    assert.ok(isMirror(calls.at(-1)));
    assert.equal(calls.filter(isMirror).length, 1);
    calls.length = 0;

    // makeFirst (mirror runs before the re-read)
    script.push(rows({ place_id: PLACE, position: 1 }), rows({ id: PLACE }));
    await PlacePhotoModel.makeFirst(PHOTO);
    assert.equal(calls.filter(isMirror).length, 1);
    calls.length = 0;

    // setCredit
    script.push(rows(photoRow()));
    await PlacePhotoModel.setCredit(PHOTO, 'x');
    assert.ok(isMirror(calls.at(-1)));
    assert.equal(calls.filter(isMirror).length, 1);
  });
});
