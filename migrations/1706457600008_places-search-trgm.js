/**
 * Enable pg_trgm extension and create a GIN trigram expression index on the
 * `places` table to support fast ILIKE substring matching across name, address,
 * cross_street, categories, and notes.
 *
 * WHY pg_trgm:
 *   - Spec requires partial-word, case-insensitive substring match (e.g. "piz"
 *     matches "pizza"). tsvector/FTS tokenises on word boundaries and stems —
 *     "piz" would not match "pizza". Bare ILIKE '%q%' is correct semantically
 *     but cannot use a btree index and degrades linearly with table size.
 *     pg_trgm + gin_trgm_ops accelerates ILIKE with leading wildcards while
 *     preserving the forgiving substring semantics. pg_trgm ships with Postgres
 *     core (contrib); it is NOT an npm dependency.
 *
 * INDEX EXPRESSION INVARIANT:
 *   The expression inside the GIN index MUST stay byte-identical to branch (a)
 *   of the WHERE clause in PlaceModel.findAll (packages/db/src/models/place.ts).
 *   If the two expressions drift (different column order, different separator,
 *   different COALESCE defaults), the Postgres query planner will silently stop
 *   using this index and fall back to a sequential scan.
 *
 * DOWN / CASCADE NOTE:
 *   down() drops the index and the extension with IF EXISTS guards. CASCADE is
 *   deliberately omitted from DROP EXTENSION. If pg_trgm is in use by another
 *   object in the database, DROP EXTENSION will fail loudly — that is the
 *   correct safe behaviour. The operator should manually DROP INDEX
 *   places_search_trgm_idx and leave the extension installed in that case.
 */

exports.up = async (pgm) => {
  // Enable the contrib extension. Idempotent — safe to apply on a DB that
  // already has pg_trgm installed. Requires CREATE EXTENSION privilege on the
  // DB role; if the role lacks it, this migration fails loudly — that is
  // intentional. Run migrations as a role with sufficient privilege (e.g.
  // the DB owner or a role with rds_superuser-equivalent).
  pgm.sql('CREATE EXTENSION IF NOT EXISTS pg_trgm;');

  // GIN trigram index on the concatenated searchable columns of `places`.
  // This expression must match the first OR-branch of the WHERE clause in
  // PlaceModel.findAll exactly — same column order, same separator (' || '
  // with a space character), same COALESCE defaults ('').
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS places_search_trgm_idx
      ON places
      USING gin (
        (
          COALESCE(name,'') || ' ' ||
          COALESCE(address,'') || ' ' ||
          COALESCE(cross_street,'') || ' ' ||
          COALESCE(categories,'') || ' ' ||
          COALESCE(notes,'')
        ) gin_trgm_ops
      );
  `);
};

exports.down = async (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS places_search_trgm_idx;');
  // CASCADE deliberately omitted — see header comment.
  pgm.sql('DROP EXTENSION IF EXISTS pg_trgm;');
};
