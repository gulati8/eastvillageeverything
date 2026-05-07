import type { PoolClient } from 'pg';
import { query, withTransaction } from '../pool.js';
import type { Neighborhood } from '@eve/shared-types';

export interface NeighborhoodInput {
  value: string;
  display: string;
  sort_order?: number;
  is_default?: boolean;
}

const SELECT_COLUMNS = `
  id, value, display, sort_order, is_default, created_at, updated_at
`.trim();

export const NeighborhoodModel = {
  async findAll(): Promise<Neighborhood[]> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods ORDER BY sort_order, display`
    );
    return result.rows;
  },

  async findById(id: string): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE id = $1`,
      [id]
    );
    return result.rows[0] ?? null;
  },

  async findByValue(value: string): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE value = $1`,
      [value]
    );
    return result.rows[0] ?? null;
  },

  async findDefault(): Promise<Neighborhood | null> {
    const result = await query<Neighborhood>(
      `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE is_default = true LIMIT 1`
    );
    return result.rows[0] ?? null;
  },

  async countPlacesUsing(id: string): Promise<number> {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM places WHERE neighborhood_id = $1`,
      [id]
    );
    return parseInt(result.rows[0]?.count ?? '0', 10);
  },

  async create(data: NeighborhoodInput): Promise<Neighborhood> {
    return withTransaction(async (client: PoolClient) => {
      if (data.is_default) {
        await client.query(`UPDATE neighborhoods SET is_default = false WHERE is_default = true`);
      }
      const result = await client.query<Neighborhood>(
        `INSERT INTO neighborhoods (value, display, sort_order, is_default)
         VALUES ($1, $2, $3, $4)
         RETURNING ${SELECT_COLUMNS}`,
        [data.value, data.display, data.sort_order ?? 0, data.is_default ?? false]
      );
      return result.rows[0];
    });
  },

  async update(id: string, data: Partial<NeighborhoodInput>): Promise<Neighborhood | null> {
    return withTransaction(async (client: PoolClient) => {
      if (data.is_default === true) {
        await client.query(
          `UPDATE neighborhoods SET is_default = false WHERE is_default = true AND id <> $1`,
          [id]
        );
      }
      const updates: string[] = [];
      const params: unknown[] = [];
      let i = 1;
      if (data.value !== undefined) { updates.push(`value = $${i++}`); params.push(data.value); }
      if (data.display !== undefined) { updates.push(`display = $${i++}`); params.push(data.display); }
      if (data.sort_order !== undefined) { updates.push(`sort_order = $${i++}`); params.push(data.sort_order); }
      if (data.is_default !== undefined) { updates.push(`is_default = $${i++}`); params.push(data.is_default); }
      if (updates.length === 0) {
        const result = await client.query<Neighborhood>(
          `SELECT ${SELECT_COLUMNS} FROM neighborhoods WHERE id = $1`,
          [id]
        );
        return result.rows[0] ?? null;
      }
      updates.push(`updated_at = now()`);
      params.push(id);
      const result = await client.query<Neighborhood>(
        `UPDATE neighborhoods SET ${updates.join(', ')} WHERE id = $${i} RETURNING ${SELECT_COLUMNS}`,
        params
      );
      return result.rows[0] ?? null;
    });
  },

  async delete(id: string): Promise<void> {
    const def = await this.findDefault();
    if (def && def.id === id) {
      throw new Error('Cannot delete the default neighborhood. Set another as default first.');
    }
    const placeCount = await this.countPlacesUsing(id);
    if (placeCount > 0) {
      throw new Error(`Cannot delete: ${placeCount} place(s) are assigned to this neighborhood. Reassign them first.`);
    }
    await query(`DELETE FROM neighborhoods WHERE id = $1`, [id]);
  },
};
