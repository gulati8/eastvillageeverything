/**
 * Cleanup migration — drops the Phase A tag visual-identity columns and
 * place.primary_tag_id. The Phase C admin/mobile redesign no longer uses
 * any of these.
 *
 * NOT RUN as part of the Phase C branch deploy. Applied during cutover,
 * AFTER the Express EJS admin code is removed (so nothing in code still
 * references these columns). See Phase C plan, Task 37 runbook step 6.
 */

exports.up = (pgm) => {
  pgm.dropColumns('tags', ['is_primary', 'tint', 'accent', 'fallback_image_url']);
  pgm.dropConstraint('tags', 'tags_parent_tag_id_fkey', { ifExists: true });
  pgm.dropColumn('tags', 'parent_tag_id');

  pgm.dropConstraint('places', 'places_primary_tag_id_fkey', { ifExists: true });
  pgm.dropIndex('places', 'primary_tag_id', { ifExists: true });
  pgm.dropColumn('places', 'primary_tag_id');
};

exports.down = (pgm) => {
  pgm.addColumn('places', {
    primary_tag_id: { type: 'uuid', references: 'tags(id)', onDelete: 'SET NULL' },
  });
  pgm.createIndex('places', 'primary_tag_id', { ifNotExists: true });
  pgm.addColumn('tags', {
    parent_tag_id: { type: 'uuid', references: 'tags(id)', onDelete: 'SET NULL' },
    is_primary: { type: 'boolean', notNull: true, default: false },
    tint: { type: 'varchar(7)' },
    accent: { type: 'varchar(7)' },
    fallback_image_url: { type: 'text' },
  });
};
