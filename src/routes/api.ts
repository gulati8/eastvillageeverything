import { Router, Request, Response } from 'express';
import { PlaceModel, TagModel } from '../models/index.js';

const router = Router();

/**
 * Public API routes (no authentication required)
 * These endpoints are consumed by the public website
 */

// GET /api/places - List all places, optionally filtered by tag
router.get('/places', async (req: Request, res: Response) => {
  const tag = req.query.tag as string | undefined;

  try {
    const places = await PlaceModel.findAll({ tag });

    // Transform to match the Rails API response format
    const response = places.map(place => ({
      key: place.id,
      name: place.name,
      address: place.address,
      phone: place.phone,
      url: place.url,
      specials: place.specials,
      categories: place.categories,
      notes: place.notes,
      tags: place.tags,
      created_at: place.created_at,
      updated_at: place.updated_at
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching places:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/tags - List all tags
router.get('/tags', async (req: Request, res: Response) => {
  try {
    const tags = await TagModel.findAll();

    // Transform to match the Rails API response format
    const response = tags.map(tag => ({
      value: tag.value,
      display: tag.display,
      order: String(tag.sort_order)
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
