import { query, withTransaction } from '../db.js';
import type { PoolClient } from 'pg';

export interface Place {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  url: string | null;
  specials: string | null;
  categories: string | null;
  notes: string | null;
  tags: string[]; // Array of tag values
  created_at: Date;
  updated_at: Date;
}

export interface PlaceInput {
  name: string;
  address?: string;
  phone?: string;
  url?: string;
  specials?: string;
  categories?: string;
  notes?: string;
  tags?: string[];
}

// Normalize phone to digits only
function normalizePhone(phone: string | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}

// Convert newlines to HTML <br/> tags for storage
function toHtmlBreaks(text: string | undefined): string | null {
  if (!text) return null;
  return text.replace(/\r?\n/g, '<br/>');
}

export class PlaceModel {
  /**
   * Find all places, optionally filtered by tag
   */
  static async findAll(options?: { tag?: string }): Promise<Place[]> {
    let sql = `
      SELECT
        p.id, p.name, p.address, p.phone, p.url,
        p.specials, p.categories, p.notes,
        p.created_at, p.updated_at,
        COALESCE(
          array_agg(t.value ORDER BY t.sort_order) FILTER (WHERE t.value IS NOT NULL),
          ARRAY[]::varchar[]
        ) as tags
      FROM places p
      LEFT JOIN place_tags pt ON p.id = pt.place_id
      LEFT JOIN tags t ON pt.tag_id = t.id
    `;

    const params: string[] = [];

    if (options?.tag) {
      sql += `
        WHERE p.id IN (
          SELECT pt2.place_id FROM place_tags pt2
          JOIN tags t2 ON pt2.tag_id = t2.id
          WHERE t2.value = $1
        )
      `;
      params.push(options.tag);
    }

    sql += `
      GROUP BY p.id
      ORDER BY p.name ASC
    `;

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
        COALESCE(
          array_agg(t.value ORDER BY t.sort_order) FILTER (WHERE t.value IS NOT NULL),
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
      // Insert the place
      const insertSql = `
        INSERT INTO places (name, address, phone, url, specials, categories, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, address, phone, url, specials, categories, notes, created_at, updated_at
      `;

      const placeResult = await client.query(insertSql, [
        data.name,
        data.address || null,
        normalizePhone(data.phone),
        data.url || null,
        toHtmlBreaks(data.specials),
        data.categories || null,
        toHtmlBreaks(data.notes)
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
        params.push(data.url || null);
      }
      if (data.specials !== undefined) {
        updates.push(`specials = $${paramIndex++}`);
        params.push(toHtmlBreaks(data.specials));
      }
      if (data.categories !== undefined) {
        updates.push(`categories = $${paramIndex++}`);
        params.push(data.categories || null);
      }
      if (data.notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(toHtmlBreaks(data.notes));
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
   * Set tags for a place (replaces existing tags)
   */
  private static async setTags(
    client: PoolClient,
    placeId: string,
    tagValues: string[]
  ): Promise<void> {
    // Remove existing tags
    await client.query('DELETE FROM place_tags WHERE place_id = $1', [placeId]);

    if (tagValues.length === 0) return;

    // Add new tags
    const insertSql = `
      INSERT INTO place_tags (place_id, tag_id)
      SELECT $1, id FROM tags WHERE value = ANY($2)
    `;
    await client.query(insertSql, [placeId, tagValues]);
  }
}

export default PlaceModel;
