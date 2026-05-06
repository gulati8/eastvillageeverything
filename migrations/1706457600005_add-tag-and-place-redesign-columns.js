/**
 * Phase A redesign columns.
 *
 * Tags get four columns to support primary-tag concept and design fallbacks:
 *   is_primary         — boolean flag, this tag can be a place's headline tag
 *   tint               — varchar(7), hex color (e.g. '#E07B3F') for fallback bg + accent
 *   accent             — varchar(7), hex color, for typographic-fallback hero accent
 *   fallback_image_url — text, CDN URL shown when a place with this primary tag has no photo
 *
 * Places get one column:
 *   primary_tag_id — uuid FK to tags(id), ON DELETE SET NULL.
 *                    Drives row meta line and fallback image in the mobile feed.
 */

exports.up = (pgm) => {
  pgm.addColumns('tags', {
    is_primary: {
      type: 'boolean',
      notNull: true,
      default: false,
    },
    tint: {
      type: 'varchar(7)',
      notNull: false,
    },
    accent: {
      type: 'varchar(7)',
      notNull: false,
    },
    fallback_image_url: {
      type: 'text',
      notNull: false,
    },
  });

  pgm.addColumn('places', {
    primary_tag_id: {
      type: 'uuid',
      notNull: false,
      references: 'tags(id)',
      onDelete: 'SET NULL',
    },
  });

  pgm.createIndex('places', 'primary_tag_id', { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropIndex('places', 'primary_tag_id', { ifExists: true });
  pgm.dropColumn('places', 'primary_tag_id');
  pgm.dropColumns('tags', ['is_primary', 'tint', 'accent', 'fallback_image_url']);
};
