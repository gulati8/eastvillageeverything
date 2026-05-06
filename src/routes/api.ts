import { Router, Request, Response } from 'express';
import { PlaceModel, TagModel } from '../models/index.js';
import type { PlacesListResponse, PlaceDetailResponse, TagsFlatResponse, TagsStructuredResponse, TagSummary } from '@eve/shared-types';

const router = Router();

/**
 * Public API routes (no authentication required)
 * These endpoints are consumed by the public website
 */

// GET /api/places - List all places, optionally filtered by tag
router.get('/places', async (req: Request, res: Response) => {
  const tag = typeof req.query.tag === 'string' ? req.query.tag : undefined;
  const limitRaw = typeof req.query.limit === 'string' ? parseInt(req.query.limit, 10) : NaN;
  const offsetRaw = typeof req.query.offset === 'string' ? parseInt(req.query.offset, 10) : NaN;
  const limit = Number.isFinite(limitRaw) ? limitRaw : undefined;
  const offset = Number.isFinite(offsetRaw) ? offsetRaw : undefined;

  try {
    const places = await PlaceModel.findAll({ tag, limit, offset });

    // Transform to match the Rails API response format
    const response: PlacesListResponse = places.map(place => ({
      key: place.id,
      name: place.name,
      address: place.address,
      phone: place.phone,
      url: place.url,
      specials: place.specials,
      categories: place.categories,
      notes: place.notes,
      tags: place.tags,
      lat: place.lat,
      lng: place.lng,
      created_at: place.created_at instanceof Date ? place.created_at.toISOString() : String(place.created_at),
      updated_at: place.updated_at instanceof Date ? place.updated_at.toISOString() : String(place.updated_at),
      pitch: place.pitch ?? null,
      crowd_level: place.crowd_level ?? null,
      price_tier: place.price_tier ?? null,
      photo_url: place.photo_url ?? null,
      hours_json: place.hours_json ?? null,
      cross_street: place.cross_street ?? null,
      primary_tag_id: place.primary_tag_id ?? null,
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/places/:id - Get a single place by ID
router.get('/places/:id', async (req: Request, res: Response) => {
  try {
    const place = await PlaceModel.findById(req.params.id as string);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }
    const response: PlaceDetailResponse = {
      key: place.id,
      name: place.name,
      address: place.address,
      phone: place.phone,
      url: place.url,
      specials: place.specials,
      categories: place.categories,
      notes: place.notes,
      tags: place.tags ?? [],
      created_at: place.created_at instanceof Date ? place.created_at.toISOString() : String(place.created_at),
      updated_at: place.updated_at instanceof Date ? place.updated_at.toISOString() : String(place.updated_at),
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      pitch: place.pitch ?? null,
      perfect: place.perfect ?? null,
      insider: place.insider ?? null,
      crowd: place.crowd ?? null,
      vibe: place.vibe ?? null,
      crowd_level: place.crowd_level ?? null,
      price_tier: place.price_tier ?? null,
      cross_street: place.cross_street ?? null,
      primary_tag_id: place.primary_tag_id ?? null,
      photo_url: place.photo_url ?? null,
      photo_credit: place.photo_credit ?? null,
      google_place_id: place.google_place_id ?? null,
      hours_json: place.hours_json ?? null,
      google_price_level: place.google_price_level ?? null,
      enrichment_status: place.enrichment_status ?? null,
      enriched_at: place.enriched_at instanceof Date ? place.enriched_at.toISOString() : (place.enriched_at ?? null),
    };
    res.json(response);
  } catch (err: any) {
    // Postgres invalid uuid throws code 22P02 — treat as 404, not 500
    if (err && err.code === '22P02') {
      return res.status(404).json({ error: 'Place not found' });
    }
    console.error('Error fetching place by id:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tags - List all tags; ?structured=1 returns hierarchical shape
router.get('/tags', async (req: Request, res: Response) => {
  try {
    if (req.query.structured === '1') {
      const structuredRows = await TagModel.findAllStructured();
      const response: TagsStructuredResponse = {
        parents: structuredRows.parents.map(p => ({
          value: p.value,
          display: p.display,
          order: String(p.sort_order),
          is_primary: p.is_primary,
          tint: p.tint,
          accent: p.accent,
          fallback_image_url: p.fallback_image_url,
          children: p.children.map(c => ({
            value: c.value,
            display: c.display,
            order: String(c.sort_order),
            is_primary: c.is_primary,
            tint: c.tint,
            accent: c.accent,
            fallback_image_url: c.fallback_image_url,
          })),
        })),
        standalone: structuredRows.standalone.map(s => ({
          value: s.value,
          display: s.display,
          order: String(s.sort_order),
          is_primary: s.is_primary,
          tint: s.tint,
          accent: s.accent,
          fallback_image_url: s.fallback_image_url,
        })),
      };
      return res.json(response);
    }

    // Project to trimmed API shape — existing consumers depend on { value, display, order } exactly
    const rows = await TagModel.findAll();
    const response: TagsFlatResponse = rows.map((t): TagSummary => ({
      value: t.value,
      display: t.display,
      order: String(t.sort_order),
      is_primary: t.is_primary,
      tint: t.tint,
      accent: t.accent,
      fallback_image_url: t.fallback_image_url,
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
