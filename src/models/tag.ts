import { query, withTransaction } from '../db.js';
import type { PoolClient } from 'pg';
import type { Tag, TagWithChildren, StructuredTags, TagWithChildrenRow, StructuredTagRows } from '@eve/shared-types';

export type { Tag, TagWithChildren, StructuredTags, TagWithChildrenRow, StructuredTagRows };

export interface TagInput {
  value: string;
  display: string;
  sort_order: number;
  parent_tag_id?: string | null;
  is_primary?: boolean;
  tint?: string | null;
  accent?: string | null;
  fallback_image_url?: string | null;
}

export class TagModel {
  /**
   * Find all tags, sorted by sort_order
   */
  static async findAll(): Promise<Tag[]> {
    const result = await query<Tag>(`
      SELECT id, value, display, sort_order, parent_tag_id, has_children,
             is_primary, tint, accent, fallback_image_url,
             created_at, updated_at
      FROM tags
      ORDER BY sort_order ASC, value ASC
    `);
    return result.rows;
  }

  /**
   * Find all tags structured for UI display
   * Returns parent tags with their children, plus standalone tags
   */
  static async findAllStructured(): Promise<StructuredTagRows> {
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
    const parents: TagWithChildrenRow[] = parentTags.map(parent => ({
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
      'SELECT id, value, display, sort_order, parent_tag_id, has_children, is_primary, tint, accent, fallback_image_url, created_at, updated_at FROM tags WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  /**
   * Find a tag by value
   */
  static async findByValue(value: string): Promise<Tag | null> {
    const result = await query<Tag>(
      'SELECT id, value, display, sort_order, parent_tag_id, has_children, is_primary, tint, accent, fallback_image_url, created_at, updated_at FROM tags WHERE value = $1',
      [value]
    );
    return result.rows[0] || null;
  }

  /**
   * Throw if the proposed parent_tag_id would violate the 2-level nesting cap.
   * The cap rule: a tag's parent must itself be a top-level tag (parent_tag_id IS NULL).
   *
   * Pass `null` or `undefined` to skip the check (no parent, top-level tag).
   * Throws Error with message starting with "Nesting limited" on violation.
   *
   * TODO(phase-2): Add a server-side Jest unit test for this method once a
   * Jest config exists for the server (no jest setup in Phase 1). See
   * tests/unit/models/tag.nesting.test.ts (to be created).
   */
  private static async assertCanBeParent(parentTagId: string): Promise<void> {
    const parent = await TagModel.findById(parentTagId);
    if (!parent) {
      throw new Error(`Nesting limited: parent tag ${parentTagId} not found`);
    }
    if (parent.parent_tag_id !== null) {
      throw new Error('Nesting limited to 2 levels: chosen parent already has a parent');
    }
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
    if (data.parent_tag_id) {
      await TagModel.assertCanBeParent(data.parent_tag_id);
    }

    const result = await query<Tag>(
      `INSERT INTO tags (value, display, sort_order, parent_tag_id,
                         is_primary, tint, accent, fallback_image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, value, display, sort_order, parent_tag_id, has_children,
                 is_primary, tint, accent, fallback_image_url,
                 created_at, updated_at`,
      [
        data.value,
        data.display,
        data.sort_order,
        data.parent_tag_id || null,
        data.is_primary ?? false,
        data.tint ?? null,
        data.accent ?? null,
        data.fallback_image_url ?? null,
      ]
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

    // Prevent self-parenting
    if (data.parent_tag_id === id) {
      throw new Error('Nesting limited: a tag cannot be its own parent');
    }

    // Enforce 2-level nesting cap: the proposed parent must be a top-level tag
    if (data.parent_tag_id !== undefined && data.parent_tag_id !== null) {
      await TagModel.assertCanBeParent(data.parent_tag_id);
    }

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
    if (data.is_primary !== undefined) {
      updates.push(`is_primary = $${paramIndex++}`);
      params.push(data.is_primary);
    }
    if (data.tint !== undefined) {
      updates.push(`tint = $${paramIndex++}`);
      params.push(data.tint || null);
    }
    if (data.accent !== undefined) {
      updates.push(`accent = $${paramIndex++}`);
      params.push(data.accent || null);
    }
    if (data.fallback_image_url !== undefined) {
      updates.push(`fallback_image_url = $${paramIndex++}`);
      params.push(data.fallback_image_url || null);
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
       RETURNING id, value, display, sort_order, parent_tag_id, has_children,
                 is_primary, tint, accent, fallback_image_url,
                 created_at, updated_at`,
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
   * Get tags that can be parents (top-level tags, excluding a specific tag and its children).
   * Used for parent dropdown in tag form.
   *
   * The `WHERE parent_tag_id IS NULL` clause enforces the 2-level nesting cap:
   * tags that already have a parent are not eligible to become parents themselves.
   * Server-side enforcement of the same rule lives in TagModel.assertCanBeParent.
   */
  static async getPotentialParents(excludeTagId?: string): Promise<Tag[]> {
    let sql = `
      SELECT id, value, display, sort_order, parent_tag_id, has_children,
             is_primary, tint, accent, fallback_image_url,
             created_at, updated_at
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
        SELECT id, value, display, sort_order, parent_tag_id, has_children,
               is_primary, tint, accent, fallback_image_url,
               created_at, updated_at
        FROM tags
        ORDER BY sort_order ASC, value ASC
      `);
      return result.rows;
    });
  }
}

export default TagModel;
