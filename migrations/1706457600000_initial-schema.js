/**
 * Initial database schema for East Village Everything
 *
 * Tables:
 * - users: Admin user accounts
 * - tags: Categories for filtering places
 * - places: Business/venue listings
 * - place_tags: Many-to-many junction table
 */

exports.up = (pgm) => {
  // Enable UUID extension
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // Users table for admin authentication
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Tags table for categorizing places
  pgm.createTable('tags', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    value: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
      comment: 'Internal identifier (no spaces/special chars)'
    },
    display: {
      type: 'varchar(255)',
      notNull: true,
      comment: 'Human-readable display name'
    },
    sort_order: {
      type: 'integer',
      notNull: true,
      default: 0
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Places table for business listings
  pgm.createTable('places', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('uuid_generate_v4()')
    },
    name: {
      type: 'varchar(255)',
      notNull: true
    },
    address: {
      type: 'varchar(500)'
    },
    phone: {
      type: 'varchar(10)',
      comment: 'Normalized to digits only'
    },
    url: {
      type: 'varchar(500)'
    },
    specials: {
      type: 'text',
      comment: 'Happy hour specials, stored with HTML line breaks'
    },
    categories: {
      type: 'text',
      comment: 'Product/service categories'
    },
    notes: {
      type: 'text',
      comment: 'Additional notes, stored with HTML line breaks'
    },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()')
    }
  });

  // Junction table for place-tag relationships
  pgm.createTable('place_tags', {
    place_id: {
      type: 'uuid',
      notNull: true,
      references: 'places',
      onDelete: 'CASCADE'
    },
    tag_id: {
      type: 'uuid',
      notNull: true,
      references: 'tags',
      onDelete: 'CASCADE'
    }
  });

  // Composite primary key for place_tags
  pgm.addConstraint('place_tags', 'place_tags_pkey', {
    primaryKey: ['place_id', 'tag_id']
  });

  // Indexes for better query performance
  pgm.createIndex('places', 'name');
  pgm.createIndex('places', 'created_at');
  pgm.createIndex('places', 'updated_at');
  pgm.createIndex('tags', 'sort_order');
  pgm.createIndex('tags', 'value');
  pgm.createIndex('place_tags', 'tag_id');
};

exports.down = (pgm) => {
  pgm.dropTable('place_tags');
  pgm.dropTable('places');
  pgm.dropTable('tags');
  pgm.dropTable('users');
  pgm.dropExtension('uuid-ossp');
};
