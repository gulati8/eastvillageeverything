import { readFileSync } from 'fs';
import pg from 'pg';

const { Pool } = pg;

interface HerokuPlace {
  key: string;
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  specials?: string;
  categories?: string;
  notes?: string;
  tags?: string[];
  updated_at?: string;
}

interface HerokuTag {
  order: string;
  value: string;
  display: string;
}

async function importData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    // Read data files
    const placesData: HerokuPlace[] = JSON.parse(readFileSync('/tmp/places.json', 'utf-8'));
    const tagsData: HerokuTag[] = JSON.parse(readFileSync('/tmp/tags.json', 'utf-8'));

    console.log(`Importing ${tagsData.length} tags...`);

    // Import tags
    for (const tag of tagsData) {
      await pool.query(
        `INSERT INTO tags (value, display, sort_order)
         VALUES ($1, $2, $3)
         ON CONFLICT (value) DO UPDATE SET display = $2, sort_order = $3`,
        [tag.value, tag.display, parseInt(tag.order) || 0]
      );
    }
    console.log('Tags imported.');

    console.log(`Importing ${placesData.length} places...`);

    // Import places
    for (const place of placesData) {
      // Insert or update place
      const result = await pool.query(
        `INSERT INTO places (id, name, address, phone, url, specials, categories, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = $2, address = $3, phone = $4, url = $5,
           specials = $6, categories = $7, notes = $8
         RETURNING id`,
        [
          place.key,
          place.name || '',
          place.address || '',
          place.phone || '',
          place.url || '',
          place.specials || '',
          place.categories || '',
          place.notes || ''
        ]
      );

      const placeId = result.rows[0].id;

      // Clear existing tags for this place
      await pool.query('DELETE FROM place_tags WHERE place_id = $1', [placeId]);

      // Add tags
      if (place.tags && place.tags.length > 0) {
        for (const tagValue of place.tags) {
          // Get tag ID
          const tagResult = await pool.query(
            'SELECT id FROM tags WHERE value = $1',
            [tagValue]
          );
          if (tagResult.rows[0]) {
            await pool.query(
              'INSERT INTO place_tags (place_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [placeId, tagResult.rows[0].id]
            );
          }
        }
      }
    }

    console.log('Places imported.');

    // Verify
    const placeCount = await pool.query('SELECT COUNT(*) FROM places');
    const tagCount = await pool.query('SELECT COUNT(*) FROM tags');
    console.log(`Done! ${placeCount.rows[0].count} places, ${tagCount.rows[0].count} tags in database.`);

  } finally {
    await pool.end();
  }
}

importData().catch(console.error);
