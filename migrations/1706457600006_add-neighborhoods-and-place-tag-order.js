/**
 * Phase C additive schema changes.
 *
 * 1. neighborhoods table:
 *    - id, value (slug, unique), display, sort_order, is_default
 *    - is_default has a partial unique index — only one row may be default at a time.
 *
 * 2. places.neighborhood_id  uuid NOT NULL FK to neighborhoods(id) ON DELETE RESTRICT
 *    - Backfilled to the default neighborhood (East Village) for all existing places.
 *
 * 3. place_tags.sort_order  integer not null default 0
 *    - Per-place ordering. Mobile feed's meta line uses tag at sort_order=0.
 */

exports.up = async (pgm) => {
  pgm.createTable('neighborhoods', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    value: { type: 'varchar(64)', notNull: true, unique: true },
    display: { type: 'varchar(128)', notNull: true },
    sort_order: { type: 'integer', notNull: true, default: 0 },
    is_default: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.createIndex('neighborhoods', 'sort_order');

  pgm.sql(`
    CREATE UNIQUE INDEX neighborhoods_one_default_idx
      ON neighborhoods (is_default) WHERE is_default = true;
  `);

  pgm.sql(`
    INSERT INTO neighborhoods (value, display, sort_order, is_default)
    VALUES ('east-village', 'East Village', 0, true);
  `);

  pgm.addColumn('places', {
    neighborhood_id: {
      type: 'uuid',
      notNull: false,
      references: 'neighborhoods(id)',
      onDelete: 'RESTRICT',
    },
  });

  pgm.sql(`
    UPDATE places
    SET neighborhood_id = (SELECT id FROM neighborhoods WHERE is_default = true)
    WHERE neighborhood_id IS NULL;
  `);

  pgm.alterColumn('places', 'neighborhood_id', { notNull: true });
  pgm.createIndex('places', 'neighborhood_id');

  pgm.addColumn('place_tags', {
    sort_order: { type: 'integer', notNull: true, default: 0 },
  });

  pgm.sql(`
    WITH ordered AS (
      SELECT
        pt.place_id,
        pt.tag_id,
        ROW_NUMBER() OVER (PARTITION BY pt.place_id ORDER BY t.sort_order, t.value) - 1 AS new_order
      FROM place_tags pt
      JOIN tags t ON t.id = pt.tag_id
    )
    UPDATE place_tags pt
    SET sort_order = ordered.new_order
    FROM ordered
    WHERE pt.place_id = ordered.place_id AND pt.tag_id = ordered.tag_id;
  `);
};

exports.down = (pgm) => {
  pgm.dropColumn('place_tags', 'sort_order');
  pgm.dropIndex('places', 'neighborhood_id');
  pgm.dropColumn('places', 'neighborhood_id');
  pgm.sql('DROP INDEX IF EXISTS neighborhoods_one_default_idx;');
  pgm.dropTable('neighborhoods');
};
