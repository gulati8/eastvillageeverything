/**
 * Add parent tag support for nested/grouped tags
 *
 * Adds:
 * - parent_tag_id: Self-referential FK to create tag hierarchy
 * - has_children: Boolean flag for fast queries (maintained on write)
 */

exports.up = (pgm) => {
  // Add parent_tag_id column for tag hierarchy
  pgm.addColumn('tags', {
    parent_tag_id: {
      type: 'uuid',
      references: 'tags',
      onDelete: 'CASCADE',
      comment: 'Parent tag ID for nested tags (NULL = top-level)'
    }
  });

  // Add has_children flag for fast queries
  pgm.addColumn('tags', {
    has_children: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'True if this tag has child tags (maintained on write)'
    }
  });

  // Index for efficient parent lookups
  pgm.createIndex('tags', 'parent_tag_id');
};

exports.down = (pgm) => {
  pgm.dropIndex('tags', 'parent_tag_id');
  pgm.dropColumn('tags', 'has_children');
  pgm.dropColumn('tags', 'parent_tag_id');
};
