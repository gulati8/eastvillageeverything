/**
 * Add app-ready photo sizes to `places`.
 *
 * The Next admin upload route writes three objects per upload: the original
 * (`photo_url`, unchanged meaning), a 400px-wide JPEG for list rows
 * (`photo_thumb_url`) and a 1200px-wide JPEG for the detail hero
 * (`photo_hero_url`). Both new columns are nullable text; rows uploaded before
 * this migration have only `photo_url`, and clients fall back to it.
 */

exports.up = (pgm) => {
  pgm.addColumns('places', {
    photo_thumb_url: { type: 'text', notNull: false },
    photo_hero_url: { type: 'text', notNull: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('places', ['photo_thumb_url', 'photo_hero_url']);
};
