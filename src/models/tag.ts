import { query, withTransaction } from '../db.js';
import type { PoolClient } from 'pg';

export interface Tag {
  id: string;
  value: string;
  display: string;
  sort_order: number;
  parent_tag_id: string | null;
  has_children: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TagInput {
  value: string;
  display: string;
  sort_order: number;
  parent_tag_id?: string | null;
}

export interface TagWithChildren extends Tag {
  children: Tag[];
}

export interface StructuredTags {
  parents: TagWithChildren[];
  standalone: Tag[];
}

export class TagModel {
  /**
   * Find all tags, sorted by sort_order
   */
  static async findAll(): Promise<Tag[]> {
    const result = await query<Tag>(`
      SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at
      FROM tags
      ORDER BY sort_order ASC, value ASC
    `);
    return result.rows;
  }

  /**
   * Find all tags structured for UI display
   * Returns parent tags with their children, plus standalone tags
   */
  static async findAllStructured(): Promise<StructuredTags> {
    const allTags = await TagModel.findAll();

    // Separate parents (has_children = true) from children and standalone
    const parentTags = allTags.filter(t => t.has_children);
    const childTags = allTags.filter(t => t.parent_tag_id !== null);
    const standaloneTags = allTags.filter(t => !t.has_children && t.parent_tag_id === null);

    // Build parent -> children map
    const childrenByParent = new Map<string, Tag[]>();
    for (const child of childTags) {
      const parentId = child.parent_tag_id!;
      if (!childrenByParent.has(parentId)) {
        childrenByParent.set(parentId, []);
      }
      childrenByParent.get(parentId)!.push(child);
    }

    // Build result with children nested under parents
    const parents: TagWithChildren[] = parentTags.map(parent => ({
      ...parent,
      children: childrenByParent.get(parent.id) || []
    }));

    return { parents, standalone: standaloneTags };
  }

  /**
   * Find a tag by ID
   */
  static async findById(id: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at FROM tags WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a tag by value
   */
  static async findByValue(value: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at FROM tags WHERE value = $1',
      [value]
    );
    return result.rows[0] || null;
  }

  /**
   * Update the has_children flag for a tag based on whether it has children
   */
  private static async updateHasChildren(tagId: string): Promise<void> {
    await query(`
      UPDATE tags SET has_children = EXISTS(
        SELECT 1 FROM tags WHERE parent_tag_id = $1
      ) WHERE id = $1
    `, [tagId]);
  }

  /**
   * Create a new tag
   */
  static async create(data: TagInput): Promise<Tag> {
    const result = await query<Tag>(
      `INSERT INTO tags (value, display, sort_order, parent_tag_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at`,
      [data.value, data.display, data.sort_order, data.parent_tag_id || null]
    );

    // Update parent's has_children flag if this tag has a parent
    if (data.parent_tag_id) {
      await TagModel.updateHasChildren(data.parent_tag_id);
    }

    return result.rows[0];
  }

  /**
   * Update an existing tag
   */
  static async update(id: string, data: Partial<TagInput>): Promise<Tag | null> {
    // Get old tag to track parent changes
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
    if (data.parent_tag_id !== undefined) {
      updates.push(`parent_tag_id = $${paramIndex++}`);
      params.push(data.parent_tag_id || null);
    }

    if (updates.length === 0) {
      return oldTag;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    const result = await query<Tag>(
      `UPDATE tags
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at`,
      params
    );

    // Update has_children for old and new parent if parent changed
    if (data.parent_tag_id !== undefined) {
      const oldParentId = oldTag.parent_tag_id;
      const newParentId = data.parent_tag_id || null;

      if (oldParentId !== newParentId) {
        if (oldParentId) {
          await TagModel.updateHasChildren(oldParentId);
        }
        if (newParentId) {
          await TagModel.updateHasChildren(newParentId);
        }
      }
    }

    return result.rows[0] || null;
  }

  /**
   * Delete a tag and remove it from all places
   */
  static async delete(id: string): Promise<boolean> {
    // Get the tag first to know its parent
    const tag = await TagModel.findById(id);
    if (!tag) return false;

    const parentId = tag.parent_tag_id;

    // First remove the tag from all place_tags associations
    await query('DELETE FROM place_tags WHERE tag_id = $1', [id]);
    // Then delete the tag itself (CASCADE will delete children too)
    const result = await query('DELETE FROM tags WHERE id = $1', [id]);

    // Update parent's has_children flag if this tag had a parent
    if (parentId) {
      await TagModel.updateHasChildren(parentId);
    }

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Find all places that have this tag
   */
  static async findPlacesByTagId(tagId: string): Promise<{ id: string; name: string }[]> {
    const result = await query<{ id: string; name: string }>(
      `SELECT p.id, p.name
       FROM places p
       JOIN place_tags pt ON p.id = pt.place_id
       WHERE pt.tag_id = $1
       ORDER BY p.name ASC`,
      [tagId]
    );
    return result.rows;
  }

  /**
   * Get tags that can be parents (top-level tags, excluding a specific tag and its children)
   * Used for parent dropdown in tag form
   */
  static async getPotentialParents(excludeTagId?: string): Promise<Tag[]> {
    let sql = `
      SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at
      FROM tags
      WHERE parent_tag_id IS NULL
    `;
    const params: string[] = [];

    if (excludeTagId) {
      // Exclude the tag itself and any of its children (to prevent cycles)
      sql += ` AND id != $1 AND id NOT IN (
        SELECT id FROM tags WHERE parent_tag_id = $1
      )`;
      params.push(excludeTagId);
    }

    sql += ` ORDER BY sort_order ASC, value ASC`;

    const result = await query<Tag>(sql, params);
    return result.rows;
  }

  /**
   * Bulk save tags - creates new, updates existing, deletes removed
   * Note: This does not handle parent_tag_id changes - use individual update for that
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
            `INSERT INTO tags (value, display, sort_order, parent_tag_id)
             VALUES ($1, $2, $3, $4)`,
            [tag.value, tag.display, tag.sort_order, tag.parent_tag_id || null]
          );
        }
      }

      // Return all tags in order
      const result = await client.query<Tag>(`
        SELECT id, value, display, sort_order, parent_tag_id, has_children, created_at, updated_at
        FROM tags
        ORDER BY sort_order ASC, value ASC
      `);
      return result.rows;
    });
  }
}

export default TagModel;
