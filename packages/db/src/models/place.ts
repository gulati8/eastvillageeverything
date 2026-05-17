import { query, withTransaction } from '../pool.js';
import type { PoolClient } from 'pg';
import type { Place } from '@eve/shared-types';

export type { Place };

export interface PlaceInput {
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  specials?: string;
  categories?: string;
  notes?: string;
  tags?: string[];
  pitch?: string;
  perfect?: string;
  insider?: string;
  crowd?: string;
  vibe?: string;
  crowd_level?: string;
  price_tier?: string;
  cross_street?: string;
  photo_url?: string;
  photo_credit?: string;
  neighborhood_id?: string | null;
}

// Normalize phone to digits only
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

// Validate URL scheme (only http/https allowed)
function validateUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

export class PlaceModel {
  /**
   * Find all places, optionally filtered by tag and/or free-text query.
   *
   * When `q` is provided and non-empty after trim, the query adds a LEFT JOIN
   * to `neighborhoods` and an OR'd condition group that covers:
   *   (a) The GIN-indexed expression on the places row itself — name, address,
   *       cross_street, categories, notes. The COALESCE expression here MUST
   *       remain byte-identical to the index DDL in
   *       migrations/1706457600008_places-search-trgm.js so the planner can use
   *       the trigram index.
   *   (b) neighborhoods.display (separate OR-branch — NOT in the indexed
   *       expression, as including it there would break the index alignment).
   *   (c) Tag value/display via subquery on place_tags + tags.
   *
   * `tag` and `q` are AND-composed via a conditions array.
   */
  static async findAll(options?: { tag?: string; q?: string; limit?: number; offset?: number }): Promise<Place[]> {
    const trimmedQ = options?.q?.trim() ?? '';
    const hasQ = trimmedQ.length > 0;

    let sql = `
      SELECT
        p.id, p.name, p.address, p.phone, p.url,
        p.specials, p.categories, p.notes,
        p.created_at, p.updated_at,
        p.lat, p.lng,
        p.pitch, p.perfect, p.insider, p.crowd, p.vibe,
        p.crowd_level, p.price_tier, p.cross_street, p.photo_url, p.photo_credit,
        p.neighborhood_id,
        p.google_place_id, p.hours_json, p.google_price_level, p.enrichment_status, p.enriched_at,
        COALESCE(
          array_agg(t.value ORDER BY pt.sort_order, t.sort_order) FILTER (WHERE t.value IS NOT NULL),
          ARRAY[]::varchar[]
        ) as tags
      FROM places p
      LEFT JOIN place_tags pt ON p.id = pt.place_id
      LEFT JOIN tags t ON pt.tag_id = t.id
    `;

    const params: string[] = [];
    const conditions: string[] = [];

    if (options?.tag) {
      params.push(options.tag);
      conditions.push(`p.id IN (
          SELECT pt2.place_id FROM place_tags pt2
          JOIN tags t2 ON pt2.tag_id = t2.id
          WHERE t2.value = $${params.length}
        )`);
    }

    if (hasQ) {
      // Add the neighborhoods join for the n.display OR-branch (branch b).
      sql += `
      LEFT JOIN neighborhoods n ON p.neighborhood_id = n.id`;

      // Escape LIKE metacharacters so user-supplied text is treated as literals.
      // Parameterisation stops SQL injection but ILIKE/LIKE still interpret '%'
      // and '_' inside the bound value as wildcards. We escape '\' first (the
      // chosen escape character), then '%', then '_', and tell Postgres about
      // the escape character via an explicit ESCAPE '\\' clause on each ILIKE.
      // The ESCAPE clause attaches to the right-hand pattern only — the
      // left-hand indexed expression (branch a) is unchanged and stays
      // byte-identical to the GIN index DDL in the migration.
      const escapedQ = trimmedQ
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      params.push(escapedQ);
      const qParam = `$${params.length}`;

      // Three OR-branches — deliberately NOT collapsed into one concatenation:
      //   (a) The indexed expression on places — must match the GIN index DDL
      //       exactly (same column order, same separator, same COALESCE defaults).
      //       The ESCAPE clause is on the pattern (right-hand side) only, so
      //       the indexed left-hand expression stays identical to the DDL.
      //   (b) neighborhoods.display — separate branch; including it in (a) would
      //       break index alignment with places_search_trgm_idx.
      //   (c) Tag value/display — subquery over the many-to-many join.
      conditions.push(`(
        (
          COALESCE(p.name,'') || ' ' ||
          COALESCE(p.address,'') || ' ' ||
          COALESCE(p.cross_street,'') || ' ' ||
          COALESCE(p.categories,'') || ' ' ||
          COALESCE(p.notes,'')
        ) ILIKE '%' || ${qParam} || '%' ESCAPE '\\'
        OR n.display ILIKE '%' || ${qParam} || '%' ESCAPE '\\'
        OR p.id IN (
          SELECT pt2.place_id FROM place_tags pt2
          JOIN tags t2 ON pt2.tag_id = t2.id
          WHERE t2.value ILIKE '%' || ${qParam} || '%' ESCAPE '\\'
             OR t2.display ILIKE '%' || ${qParam} || '%' ESCAPE '\\'
        )
      )`);
    }

    if (conditions.length > 0) {
      sql += `
      WHERE ${conditions.join(' AND ')}`;
    }

    // Add n.display to GROUP BY only when the neighborhood join is present.
    if (hasQ) {
      sql += `
      GROUP BY p.id, n.display`;
    } else {
      sql += `
      GROUP BY p.id`;
    }

    sql += `
      ORDER BY p.name ASC
    `;

    // Pagination is opt-in: callers must pass `limit` to slice the result.
    // When limit is provided we still clamp to [1, 200] to bound a single
    // request's payload size; offset is only applied when paired with limit.
    if (options?.limit !== undefined) {
      const limit = Math.min(Math.max(1, options.limit), 200);
      const offset = Math.max(0, options.offset ?? 0);
      sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(String(limit));
      params.push(String(offset));
    }

    const result = await query<Place>(sql, params);
    return result.rows;
  }

  /**
   * Find a place by ID
   */
  static async findById(id: string): Promise<Place | null> {
    const sql = `
      SELECT
        p.id, p.name, p.address, p.phone, p.url,
        p.specials, p.categories, p.notes,
        p.created_at, p.updated_at,
        p.lat, p.lng,
        p.pitch, p.perfect, p.insider, p.crowd, p.vibe,
        p.crowd_level, p.price_tier, p.cross_street, p.photo_url, p.photo_credit,
        p.neighborhood_id,
        p.google_place_id, p.hours_json, p.google_price_level, p.enrichment_status, p.enriched_at,
        COALESCE(
          array_agg(t.value ORDER BY pt.sort_order, t.sort_order) FILTER (WHERE t.value IS NOT NULL),
          ARRAY[]::varchar[]
        ) as tags
      FROM places p
      LEFT JOIN place_tags pt ON p.id = pt.place_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id
    `;

    const result = await query<Place>(sql, [id]);
    return result.rows[0] || null;
  }

  /**
   * Create a new place
   */
  static async create(data: PlaceInput): Promise<Place> {
    return withTransaction(async (client: PoolClient) => {
      let neighborhoodId = data.neighborhood_id;
      if (!neighborhoodId) {
        const defaultRow = await client.query<{ id: string }>(
          `SELECT id FROM neighborhoods WHERE is_default = true LIMIT 1`
        );
        neighborhoodId = defaultRow.rows[0]?.id;
        if (!neighborhoodId) {
          throw new Error('No default neighborhood configured');
        }
      }

      // Insert the place
      const insertSql = `
        INSERT INTO places (name, address, phone, url, specials, categories, notes,
          pitch, perfect, insider, crowd, vibe, crowd_level, price_tier,
          cross_street, photo_url, photo_credit, neighborhood_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18)
        RETURNING id
      `;

      const placeResult = await client.query(insertSql, [
        data.name,
        data.address || null,
        normalizePhone(data.phone),
        validateUrl(data.url),
        data.specials || null,
        data.categories || null,
        data.notes || null,
        data.pitch || null,
        data.perfect || null,
        data.insider || null,
        data.crowd || null,
        data.vibe || null,
        data.crowd_level || null,
        data.price_tier || null,
        data.cross_street || null,
        validateUrl(data.photo_url),
        data.photo_credit || null,
        neighborhoodId,
      ]);

      const place = placeResult.rows[0];

      // Add tag associations
      if (data.tags && data.tags.length > 0) {
        await PlaceModel.setTags(client, place.id, data.tags);
      }

      // Return the full place with tags
      return (await PlaceModel.findById(place.id))!;
    });
  }

  /**
   * Update an existing place
   */
  static async update(id: string, data: Partial<PlaceInput>): Promise<Place | null> {
    return withTransaction(async (client: PoolClient) => {
      // Build dynamic update query
      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        params.push(data.name);
      }
      if (data.address !== undefined) {
        updates.push(`address = $${paramIndex++}`);
        params.push(data.address || null);
      }
      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        params.push(normalizePhone(data.phone));
      }
      if (data.url !== undefined) {
        updates.push(`url = $${paramIndex++}`);
        params.push(validateUrl(data.url));
      }
      if (data.specials !== undefined) {
        updates.push(`specials = $${paramIndex++}`);
        params.push(data.specials || null);
      }
      if (data.categories !== undefined) {
        updates.push(`categories = $${paramIndex++}`);
        params.push(data.categories || null);
      }
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(data.notes || null);
      }
      if (data.pitch !== undefined) {
        updates.push(`pitch = $${paramIndex++}`);
        params.push(data.pitch || null);
      }
      if (data.perfect !== undefined) {
        updates.push(`perfect = $${paramIndex++}`);
        params.push(data.perfect || null);
      }
      if (data.insider !== undefined) {
        updates.push(`insider = $${paramIndex++}`);
        params.push(data.insider || null);
      }
      if (data.crowd !== undefined) {
        updates.push(`crowd = $${paramIndex++}`);
        params.push(data.crowd || null);
      }
      if (data.vibe !== undefined) {
        updates.push(`vibe = $${paramIndex++}`);
        params.push(data.vibe || null);
      }
      if (data.crowd_level !== undefined) {
        updates.push(`crowd_level = $${paramIndex++}`);
        params.push(data.crowd_level || null);
      }
      if (data.price_tier !== undefined) {
        updates.push(`price_tier = $${paramIndex++}`);
        params.push(data.price_tier || null);
      }
      if (data.cross_street !== undefined) {
        updates.push(`cross_street = $${paramIndex++}`);
        params.push(data.cross_street || null);
      }
      if (data.photo_url !== undefined) {
        updates.push(`photo_url = $${paramIndex++}`);
        params.push(validateUrl(data.photo_url));
      }
      if (data.photo_credit !== undefined) {
        updates.push(`photo_credit = $${paramIndex++}`);
        params.push(data.photo_credit || null);
      }
      if (data.neighborhood_id !== undefined && data.neighborhood_id !== null) {
        updates.push(`neighborhood_id = $${paramIndex++}`);
        params.push(data.neighborhood_id);
      }

      // Always update updated_at
      updates.push(`updated_at = NOW()`);

      if (updates.length > 1) { // More than just updated_at
        params.push(id);
        const sql = `
          UPDATE places
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING id
        `;

        const result = await client.query(sql, params);
        if (result.rowCount === 0) return null;
      }

      // Update tags if provided
      if (data.tags !== undefined) {
        await PlaceModel.setTags(client, id, data.tags);
      }

      return PlaceModel.findById(id);
    });
  }

  /**
   * Delete a place
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM places WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Set tags for a place (replaces existing tags). The order of tagValues
   * determines per-place sort_order (0, 1, 2…). The first tag drives the
   * meta-line headline on the mobile feed.
   */
  private static async setTags(
    client: PoolClient,
    placeId: string,
    tagValues: string[]
  ): Promise<void> {
    await client.query('DELETE FROM place_tags WHERE place_id = $1', [placeId]);

    for (let i = 0; i < tagValues.length; i++) {
      await client.query(
        `INSERT INTO place_tags (place_id, tag_id, sort_order)
         SELECT $1, t.id, $3 FROM tags t WHERE t.value = $2`,
        [placeId, tagValues[i], i]
      );
    }
  }
}

export default PlaceModel;
