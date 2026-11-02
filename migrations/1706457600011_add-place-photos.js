/**
 * Many photos per place: the `place_photos` table.
 *
 * Each row is one admin upload (original, 400px thumb, 1200px hero, credit)
 * with a per-place `position` starting at 0. Position 0 is the list thumbnail
 * in the admin and the mobile app.
 *
 * The unique constraint on (place_id, position) is DEFERRABLE INITIALLY
 * DEFERRED so a reorder can shift rows inside one transaction without
 * tripping over itself mid-way; it is checked at COMMIT.
 *
 * The legacy `places.photo_url`, `photo_thumb_url`, `photo_hero_url` and
 * `photo_credit` columns are NOT dropped. `PlacePhotoModel` keeps them as a
 * mirror of the position-0 row (or nulls when a place has no photo), so the
 * 1.0.0 mobile app, the Google photo proxy's 302 and the EJS admin keep
 * working with no API change. The backfill below seeds one row at position 0
 * from every place that already has an uploaded photo.
 */

exports.up = (pgm) => {
  pgm.createTable('place_photos', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    place_id: {
      type: 'uuid',
      notNull: true,
      references: 'places(id)',
      onDelete: 'CASCADE',
    },
    url: { type: 'text', notNull: true },
    thumb_url: { type: 'text', notNull: false },
    hero_url: { type: 'text', notNull: false },
    credit: { type: 'text', notNull: false },
    position: { type: 'integer', notNull: true },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('place_photos', 'place_photos_place_id_position_key', {
    unique: ['place_id', 'position'],
    deferrable: true,
    deferred: true,
  });

  pgm.createIndex('place_photos', 'place_id');

  // Backfill: one row at position 0 per place that already has an upload.
  pgm.sql(`
    INSERT INTO place_photos (place_id, url, thumb_url, hero_url, credit, position)
    SELECT id, photo_url, photo_thumb_url, photo_hero_url, photo_credit, 0
    FROM places
    WHERE photo_url IS NOT NULL;
  `);
};

exports.down = (pgm) => {
  // The legacy columns still hold the first photo, so nothing is lost.
  pgm.dropTable('place_photos');
};
