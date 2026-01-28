/**
 * Data Migration Script
 *
 * Migrates data from Heroku Redis to local Postgres.
 *
 * Usage:
 *   HEROKU_REDIS_URL=redis://... DATABASE_URL=postgres://... npx tsx scripts/migrate-data.ts
 *
 * Or with Heroku CLI:
 *   HEROKU_REDIS_URL=$(heroku config:get REDIS_URL -a YOUR_APP) DATABASE_URL=... npx tsx scripts/migrate-data.ts
 */

import { Redis } from 'ioredis';
import { Pool } from 'pg';

interface RedisPlace {
  key: string;
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  specials?: string;
  categories?: string;
  notes?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

interface RedisTag {
  value: string;
  display: string;
  order: string;
}

async function migrate() {
  const herokuRedisUrl = process.env.HEROKU_REDIS_URL;
  const databaseUrl = process.env.DATABASE_URL;

  if (!herokuRedisUrl) {
    console.error('Error: HEROKU_REDIS_URL environment variable is required');
    console.log('\nUsage:');
    console.log('  HEROKU_REDIS_URL=redis://... DATABASE_URL=postgres://... npx tsx scripts/migrate-data.ts');
    console.log('\nOr get the URL from Heroku:');
    console.log('  heroku config:get REDIS_URL -a your-app-name');
    process.exit(1);
  }

  if (!databaseUrl) {
    console.error('Error: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('Connecting to Heroku Redis...');
  const redis = new Redis(herokuRedisUrl, {
    tls: herokuRedisUrl.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined
  });

  console.log('Connecting to Postgres...');
  const pg = new Pool({ connectionString: databaseUrl });

  try {
    // Fetch tags from Redis
    console.log('\nFetching tags from Redis...');
    const tagsJson = await redis.get('eve:tags');
    const tags: RedisTag[] = tagsJson ? JSON.parse(tagsJson) : [];
    console.log(`  Found ${tags.length} tags`);

    // Fetch places from Redis
    console.log('\nFetching places from Redis...');
    const placeKeys = await redis.keys('eve:places:*');
    console.log(`  Found ${placeKeys.length} places`);

    const places: RedisPlace[] = [];
    for (const key of placeKeys) {
      const placeJson = await redis.get(key);
      if (placeJson) {
        places.push(JSON.parse(placeJson));
      }
    }

    // Begin transaction
    const client = await pg.connect();
    try {
      await client.query('BEGIN');

      // Clear existing data (optional - comment out if you want to preserve)
      console.log('\nClearing existing data...');
      await client.query('DELETE FROM place_tags');
      await client.query('DELETE FROM places');
      await client.query('DELETE FROM tags');

      // Insert tags
      console.log('\nInserting tags...');
      const tagIdMap = new Map<string, string>();

      for (const tag of tags) {
        const result = await client.query(
          `INSERT INTO tags (value, display, sort_order)
           VALUES ($1, $2, $3)
           RETURNING id`,
          [tag.value, tag.display, parseInt(tag.order, 10) || 0]
        );
        tagIdMap.set(tag.value, result.rows[0].id);
        console.log(`  + Tag: ${tag.display} (${tag.value})`);
      }

      // Insert places
      console.log('\nInserting places...');
      for (const place of places) {
        const result = await client.query(
          `INSERT INTO places (name, address, phone, url, specials, categories, notes, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id`,
          [
            place.name,
            place.address || null,
            place.phone || null,
            place.url || null,
            place.specials || null,
            place.categories || null,
            place.notes || null,
            place.created_at ? new Date(place.created_at) : new Date(),
            place.updated_at ? new Date(place.updated_at) : new Date()
          ]
        );

        const placeId = result.rows[0].id;
        console.log(`  + Place: ${place.name}`);

        // Insert place-tag associations
        if (place.tags && place.tags.length > 0) {
          for (const tagValue of place.tags) {
            const tagId = tagIdMap.get(tagValue);
            if (tagId) {
              await client.query(
                'INSERT INTO place_tags (place_id, tag_id) VALUES ($1, $2)',
                [placeId, tagId]
              );
            } else {
              console.log(`    Warning: Unknown tag "${tagValue}" for place "${place.name}"`);
            }
          }
        }
      }

      await client.query('COMMIT');
      console.log('\n✓ Migration complete!');
      console.log(`  Tags: ${tags.length}`);
      console.log(`  Places: ${places.length}`);

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('\nMigration failed:', err);
    process.exit(1);
  } finally {
    await redis.quit();
    await pg.end();
  }
}

migrate();
