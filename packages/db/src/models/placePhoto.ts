import type { PoolClient } from 'pg';
import type { PlacePhoto } from '@eve/shared-types';
import { query, withTransaction } from '../pool.js';

export type { PlacePhoto };

export interface PlacePhotoInput {
  url: string;
  thumb_url?: string | null;
  hero_url?: string | null;
  credit?: string | null;
}

const COLUMNS = 'id, place_id, url, thumb_url, hero_url, credit, position, created_at';

/** Absolute http(s) URL or null. Same rule as `PlaceModel`'s `validateUrl`. */
function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

function normalizeCredit(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Photos of a place, ordered by `position` (0 first). Every write runs in a
 * transaction, locks the place row so concurrent writes to one place
 * serialise, and ends by mirroring the position-0 row into the legacy
 * `places.photo_*` columns (see migrations/1706457600011_add-place-photos.js).
 */
export class PlacePhotoModel {
  /** All photos of a place, first (position 0) to last. */
  static async listForPlace(placeId: string): Promise<PlacePhoto[]> {
    const result = await query<PlacePhoto>(
      `SELECT ${COLUMNS} FROM place_photos WHERE place_id = $1 ORDER BY position ASC`,
      [placeId]
    );
    return result.rows;
  }

  /** Append a photo at `max(position) + 1` (0 for the first). Throws when the place does not exist. */
  static async add(placeId: string, data: PlacePhotoInput): Promise<PlacePhoto> {
    const url = httpUrl(data.url);
    if (!url) {
      throw new Error('Photo url must be an absolute http(s) URL');
    }
    return withTransaction(async (client) => {
      await PlacePhotoModel.lockPlace(client, placeId);
      const result = await client.query<PlacePhoto>(
        `INSERT INTO place_photos (place_id, url, thumb_url, hero_url, credit, position)
         SELECT $1, $2, $3, $4, $5, COALESCE(MAX(position) + 1, 0)
         FROM place_photos WHERE place_id = $1
         RETURNING ${COLUMNS}`,
        [placeId, url, httpUrl(data.thumb_url), httpUrl(data.hero_url), normalizeCredit(data.credit)]
      );
      await PlacePhotoModel.mirrorFirst(client, placeId);
      return result.rows[0];
    });
  }

  /**
   * Delete a photo and renumber the place's remaining photos from 0.
   * Returns the place id, or null when no photo had that id.
   */
  static async remove(id: string): Promise<string | null> {
    return withTransaction(async (client) => {
      const owner = await client.query<{ place_id: string }>(
        `SELECT place_id FROM place_photos WHERE id = $1`,
        [id]
      );
      const placeId = owner.rows[0]?.place_id;
      if (!placeId) return null;
      await PlacePhotoModel.lockPlace(client, placeId);
      await client.query(`DELETE FROM place_photos WHERE id = $1`, [id]);
      await client.query(
        `UPDATE place_photos p
         SET position = r.rn
         FROM (
           SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 AS rn
           FROM place_photos WHERE place_id = $1
         ) r
         WHERE p.id = r.id AND p.position <> r.rn`,
        [placeId]
      );
      await PlacePhotoModel.mirrorFirst(client, placeId);
      return placeId;
    });
  }

  /**
   * Move a photo to position 0 and shift the photos that were before it up by
   * one. Returns the moved row, or null when no photo had that id.
   */
  static async makeFirst(id: string): Promise<PlacePhoto | null> {
    return withTransaction(async (client) => {
      const current = await client.query<{ place_id: string; position: number }>(
        `SELECT place_id, position FROM place_photos WHERE id = $1`,
        [id]
      );
      const row = current.rows[0];
      if (!row) return null;
      await PlacePhotoModel.lockPlace(client, row.place_id);
      if (row.position !== 0) {
        // The unique (place_id, position) constraint is deferred, so the two
        // updates may overlap mid-transaction; it is checked at COMMIT.
        await client.query(
          `UPDATE place_photos SET position = position + 1 WHERE place_id = $1 AND position < $2`,
          [row.place_id, row.position]
        );
        await client.query(`UPDATE place_photos SET position = 0 WHERE id = $1`, [id]);
      }
      await PlacePhotoModel.mirrorFirst(client, row.place_id);
      const moved = await client.query<PlacePhoto>(
        `SELECT ${COLUMNS} FROM place_photos WHERE id = $1`,
        [id]
      );
      return moved.rows[0] ?? null;
    });
  }

  /** Set (or clear, with blank) a photo's credit. Returns the row, or null when no photo had that id. */
  static async setCredit(id: string, credit: string | null): Promise<PlacePhoto | null> {
    return withTransaction(async (client) => {
      const result = await client.query<PlacePhoto>(
        `UPDATE place_photos SET credit = $2 WHERE id = $1 RETURNING ${COLUMNS}`,
        [id, normalizeCredit(credit)]
      );
      const row = result.rows[0];
      if (!row) return null;
      await PlacePhotoModel.mirrorFirst(client, row.place_id);
      return row;
    });
  }

  /** Lock the place row for the transaction; throws when the place does not exist. */
  private static async lockPlace(client: PoolClient, placeId: string): Promise<void> {
    const place = await client.query<{ id: string }>(
      `SELECT id FROM places WHERE id = $1 FOR UPDATE`,
      [placeId]
    );
    if (place.rowCount === 0) {
      throw new Error('Place not found');
    }
  }

  /**
   * Copy the position-0 photo (or nulls when the place has none) into the
   * legacy `places.photo_url`, `photo_thumb_url`, `photo_hero_url` and
   * `photo_credit` columns, which the 1.0.0 app, the photo proxy and the EJS
   * admin still read.
   */
  private static async mirrorFirst(client: PoolClient, placeId: string): Promise<void> {
    await client.query(
      `UPDATE places p
       SET photo_url = f.url,
           photo_thumb_url = f.thumb_url,
           photo_hero_url = f.hero_url,
           photo_credit = f.credit,
           updated_at = NOW()
       FROM (SELECT $1::uuid AS id) k
       LEFT JOIN place_photos f ON f.place_id = k.id AND f.position = 0
       WHERE p.id = k.id`,
      [placeId]
    );
  }
}

export default PlacePhotoModel;
