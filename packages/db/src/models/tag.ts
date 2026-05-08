import { query, withTransaction } from '../pool.js';
import type { PoolClient } from 'pg';
import type { Tag, StructuredTagRows } from '@eve/shared-types';

export type { Tag, StructuredTagRows };

export interface TagInput {
  value: string;
  display: string;
  sort_order: number;
}

export class TagModel {
  static async findAll(): Promise<Tag[]> {
    const result = await query<Tag>(`
      SELECT id, value, display, sort_order, created_at, updated_at
      FROM tags
      ORDER BY sort_order ASC, value ASC
    `);
    return result.rows;
  }

  static async findAllStructured(): Promise<StructuredTagRows> {
    return { parents: [], standalone: await TagModel.findAll() };
  }

  static async findById(id: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, created_at, updated_at FROM tags WHERE id = $1',
      [id],
    );
    return result.rows[0] || null;
  }

  static async findByValue(value: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, created_at, updated_at FROM tags WHERE value = $1',
      [value],
    );
    return result.rows[0] || null;
  }

  static async create(data: TagInput): Promise<Tag> {
    const result = await query<Tag>(
      `INSERT INTO tags (value, display, sort_order)
       VALUES ($1, $2, $3)
       RETURNING id, value, display, sort_order, created_at, updated_at`,
      [data.value, data.display, data.sort_order],
    );

    return result.rows[0];
  }

  static async update(id: string, data: Partial<TagInput>): Promise<Tag | null> {
    const oldTag = await TagModel.findById(id);
    if (!oldTag) return null;

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
      return oldTag;
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    const result = await query<Tag>(
      `UPDATE tags
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, value, display, sort_order, created_at, updated_at`,
      params,
    );

    return result.rows[0] || null;
  }

  static async delete(id: string): Promise<boolean> {
    await query('DELETE FROM place_tags WHERE tag_id = $1', [id]);
    const result = await query('DELETE FROM tags WHERE id = $1', [id]);

    return (result.rowCount ?? 0) > 0;
  }

  static async findPlacesByTagId(tagId: string): Promise<{ id: string; name: string }[]> {
    const result = await query<{ id: string; name: string }>(
      `SELECT p.id, p.name
       FROM places p
       JOIN place_tags pt ON p.id = pt.place_id
       WHERE pt.tag_id = $1
       ORDER BY p.name ASC`,
      [tagId],
    );
    return result.rows;
  }

  static async getPotentialParents(): Promise<Tag[]> {
    return [];
  }

  static async bulkSave(tags: TagInput[]): Promise<Tag[]> {
    return withTransaction(async (client: PoolClient) => {
      const existingResult = await client.query<Tag>('SELECT * FROM tags');
      const existingByValue = new Map(existingResult.rows.map((tag) => [tag.value, tag]));
      const newValues = new Set(tags.map((tag) => tag.value));

      const toDelete = existingResult.rows.filter((tag) => !newValues.has(tag.value));
      if (toDelete.length > 0) {
        await client.query(
          'DELETE FROM tags WHERE id = ANY($1)',
          [toDelete.map((tag) => tag.id)],
        );
      }

      for (const tag of tags) {
        const existing = existingByValue.get(tag.value);
        if (existing) {
          await client.query(
            `UPDATE tags
             SET display = $1, sort_order = $2, updated_at = NOW()
             WHERE id = $3`,
            [tag.display, tag.sort_order, existing.id],
          );
        } else {
          await client.query(
            `INSERT INTO tags (value, display, sort_order)
             VALUES ($1, $2, $3)`,
            [tag.value, tag.display, tag.sort_order],
          );
        }
      }

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
