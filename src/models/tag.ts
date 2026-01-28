import { query, withTransaction } from '../db.js';
import type { PoolClient } from 'pg';

export interface Tag {
  id: string;
  value: string;
  display: string;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

export interface TagInput {
  value: string;
  display: string;
  sort_order: number;
}

export class TagModel {
  /**
   * Find all tags, sorted by sort_order
   */
  static async findAll(): Promise<Tag[]> {
    const result = await query<Tag>(`
      SELECT id, value, display, sort_order, created_at, updated_at
      FROM tags
      ORDER BY sort_order ASC, value ASC
    `);
    return result.rows;
  }

  /**
   * Find a tag by ID
   */
  static async findById(id: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, created_at, updated_at FROM tags WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a tag by value
   */
  static async findByValue(value: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, created_at, updated_at FROM tags WHERE value = $1',
      [value]
    );
    return result.rows[0] || null;
  }

  /**
   * Create a new tag
   */
  static async create(data: TagInput): Promise<Tag> {
    const result = await query<Tag>(
      `INSERT INTO tags (value, display, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, value, display, sort_order, created_at, updated_at`,
      [data.value, data.display, data.sort_order]
    );
    return result.rows[0];
  }

  /**
   * Update an existing tag
   */
  static async update(id: string, data: Partial<TagInput>): Promise<Tag | null> {
    const updates: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (data.value !== undefined) {
      updates.push(`value = $${paramIndex++}`);
      params.push(data.value);
    }
    if (data.display !== undefined) {
      updates.push(`display = $${paramIndex++}`);
      params.push(data.display);
    }
    if (data.sort_order !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      params.push(data.sort_order);
    }

    if (updates.length === 0) {
      return TagModel.findById(id);
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query<Tag>(
      `UPDATE tags
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, value, display, sort_order, created_at, updated_at`,
      params
    );

    return result.rows[0] || null;
  }

  /**
   * Delete a tag
   */
  static async delete(id: string): Promise<boolean> {
    const result = await query('DELETE FROM tags WHERE id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Bulk save tags - creates new, updates existing, deletes removed
   * This matches the Rails behavior where you save all tags at once
   */
  static async bulkSave(tags: TagInput[]): Promise<Tag[]> {
    return withTransaction(async (client: PoolClient) => {
      // Get existing tags
      const existingResult = await client.query<Tag>('SELECT * FROM tags');
      const existingByValue = new Map(existingResult.rows.map(t => [t.value, t]));

      // Track which values we're keeping
      const newValues = new Set(tags.map(t => t.value));

      // Delete tags that are no longer present
      const toDelete = existingResult.rows.filter(t => !newValues.has(t.value));
      if (toDelete.length > 0) {
        await client.query(
          'DELETE FROM tags WHERE id = ANY($1)',
          [toDelete.map(t => t.id)]
        );
      }

      // Upsert each tag
      for (const tag of tags) {
        const existing = existingByValue.get(tag.value);
        if (existing) {
          // Update existing tag
          await client.query(
            `UPDATE tags
             SET display = $1, sort_order = $2, updated_at = NOW()
             WHERE id = $3`,
            [tag.display, tag.sort_order, existing.id]
          );
        } else {
          // Insert new tag
          await client.query(
            `INSERT INTO tags (value, display, sort_order)
             VALUES ($1, $2, $3)`,
            [tag.value, tag.display, tag.sort_order]
          );
        }
      }

      // Return all tags in order
      const result = await client.query<Tag>(`
        SELECT id, value, display, sort_order, created_at, updated_at
        FROM tags
        ORDER BY sort_order ASC, value ASC
      `);
      return result.rows;
    });
  }
}

export default TagModel;
