/**
 * Add the Google photo reference to `places`.
 *
 * Google's terms do not allow copying Place photos into our bucket, so the
 * enrichment script stores only the photo resource name
 * (`places/<id>/photos/<ref>`) and the first author attribution. The API
 * proxies the bytes from Google on demand (`GET /api/places/:id/photo`) and
 * caches them in Redis for 7 days; nothing is written to storage.
 */

exports.up = (pgm) => {
  pgm.addColumns('places', {
    google_photo_name: { type: 'text', notNull: false },
    google_photo_attribution: { type: 'text', notNull: false },
  });
};

exports.down = (pgm) => {
  pgm.dropColumns('places', ['google_photo_name', 'google_photo_attribution']);
};
