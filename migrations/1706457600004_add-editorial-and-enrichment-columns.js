/**
 * Add editorial and enrichment columns to the places table.
 *
 * Editorial columns (10): pitch, perfect, insider, crowd, vibe,
 * crowd_level, price_tier, cross_street, photo_url, photo_credit
 *
 * Enrichment columns (5): google_place_id (unique), hours_json (jsonb),
 * google_price_level, enrichment_status, enriched_at
 */

exports.up = (pgm) => {
  // Geo columns
  pgm.addColumn('places', {
    lat: {
      type: 'double precision',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    lng: {
      type: 'double precision',
      notNull: false
    }
  });

  // Editorial columns
  pgm.addColumn('places', {
    pitch: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    perfect: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    insider: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    crowd: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    vibe: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    crowd_level: {
      type: 'varchar(20)',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    price_tier: {
      type: 'varchar(3)',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    cross_street: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    photo_url: {
      type: 'text',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    photo_credit: {
      type: 'text',
      notNull: false
    }
  });

  // Enrichment columns
  pgm.addColumn('places', {
    google_place_id: {
      type: 'varchar(255)',
      notNull: false,
      unique: true
    }
  });

  pgm.addColumn('places', {
    hours_json: {
      type: 'jsonb',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    google_price_level: {
      type: 'integer',
      notNull: false
    }
  });

  pgm.addColumn('places', {
    enrichment_status: {
      type: 'varchar(20)',
      notNull: false,
      default: "'pending'"
    }
  });

  pgm.addColumn('places', {
    enriched_at: {
      type: 'timestamptz',
      notNull: false
    }
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('places', 'enriched_at');
  pgm.dropColumn('places', 'enrichment_status');
  pgm.dropColumn('places', 'google_price_level');
  pgm.dropColumn('places', 'hours_json');
  // Drop unique constraint implicitly removed when column is dropped
  pgm.dropColumn('places', 'google_place_id');
  pgm.dropColumn('places', 'photo_credit');
  pgm.dropColumn('places', 'photo_url');
  pgm.dropColumn('places', 'cross_street');
  pgm.dropColumn('places', 'price_tier');
  pgm.dropColumn('places', 'crowd_level');
  pgm.dropColumn('places', 'vibe');
  pgm.dropColumn('places', 'crowd');
  pgm.dropColumn('places', 'insider');
  pgm.dropColumn('places', 'perfect');
  pgm.dropColumn('places', 'pitch');
  pgm.dropColumn('places', 'lng');
  pgm.dropColumn('places', 'lat');
};
