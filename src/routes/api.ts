import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { PlaceModel, TagModel, NeighborhoodModel } from '@eve/db';
import type { Place, PlacesListResponse, PlaceDetailResponse, TagsFlatResponse, TagsStructuredResponse, TagSummary, NeighborhoodSummary } from '@eve/shared-types';
import { redisClient } from '../redis.js';

const router = Router();

// ---------------------------------------------------------------------------
// Google photo proxy
//
// Google's terms do not allow copying Place photos into our bucket, so when a
// place has no admin-uploaded photo but enrichment found a Google photo, the
// API points all three photo fields at `/api/places/:id/photo?size=...`. That
// route fetches the bytes from Google server-side, caches them in Redis for
// 7 days (within Google's 30-day cap; never written to @eve/storage) and
// serves them with a 1-day browser cache.
// ---------------------------------------------------------------------------

const PHOTO_SIZES = { thumb: 400, hero: 1200, orig: 1600 } as const;
type PhotoSize = keyof typeof PHOTO_SIZES;
const PHOTO_CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;
const PHOTO_PROXY_PATH = /^\/places\/[^/]+\/photo\/?$/;

/** True for the photo proxy path relative to the `/api` mount (used to exempt it from the shared limiter). */
export function isPhotoProxyPath(path: string): boolean {
  return PHOTO_PROXY_PATH.test(path);
}

// 20 thumbnails per list screen would exhaust the shared 100/min API bucket,
// so the proxy has its own, larger per-IP limiter.
const photoLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});

/** Absolute origin of this API as the client reached it (trust proxy is on, so this is https behind Caddy). */
function publicBaseUrl(req: Request): string {
  return `${req.protocol}://${req.get('host')}`;
}

interface PhotoFields {
  photo_url: string | null;
  photo_thumb_url: string | null;
  photo_hero_url: string | null;
  photo_attribution: string | null;
}

/**
 * Photo fields for a response. Admin uploads win; otherwise a Google photo is
 * served through the proxy so the mobile app needs no special handling.
 */
function photoFields(place: Place, req: Request): PhotoFields {
  if (place.photo_url || !place.google_photo_name) {
    return {
      photo_url: place.photo_url ?? null,
      photo_thumb_url: place.photo_thumb_url ?? null,
      photo_hero_url: place.photo_hero_url ?? null,
      photo_attribution: null,
    };
  }
  const proxy = (size: PhotoSize) =>
    `${publicBaseUrl(req)}/api/places/${encodeURIComponent(place.id)}/photo?size=${size}`;
  return {
    photo_url: proxy('orig'),
    photo_thumb_url: proxy('thumb'),
    photo_hero_url: proxy('hero'),
    photo_attribution: place.google_photo_attribution ?? null,
  };
}

function sendPhoto(res: Response, body: Buffer, contentType: string): void {
  res.set('Content-Type', contentType);
  res.set('Content-Length', String(body.length));
  res.set('Cache-Control', 'public, max-age=86400');
  res.end(body);
}

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
    // The list shape has no attribution field; only the three URLs are spread in.
    const listPhotoFields = (place: Place, r: Request) => {
      const { photo_attribution: _attribution, ...urls } = photoFields(place, r);
      return urls;
    };

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
      // The list row's italic line prefers `perfect` over tag labels (mobile PlaceRow).
      perfect: place.perfect ?? null,
      crowd_level: place.crowd_level ?? null,
      price_tier: place.price_tier ?? null,
      ...listPhotoFields(place, req),
      hours_json: place.hours_json ?? null,
      cross_street: place.cross_street ?? null,
      neighborhood_id: place.neighborhood_id,
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
      neighborhood_id: place.neighborhood_id,
      ...photoFields(place, req),
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

// GET /api/places/:id/photo?size=thumb|hero|orig - Photo proxy (see header comment)
router.get('/places/:id/photo', photoLimiter, async (req: Request, res: Response) => {
  const sizeRaw = typeof req.query.size === 'string' ? req.query.size : 'orig';
  if (!Object.prototype.hasOwnProperty.call(PHOTO_SIZES, sizeRaw)) {
    return res.status(400).json({ error: 'size must be thumb, hero or orig' });
  }
  const size = sizeRaw as PhotoSize;
  const id = req.params.id as string;

  try {
    const place = await PlaceModel.findById(id);
    if (!place) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Admin upload: send the client to the stored URL for the requested size.
    if (place.photo_url) {
      const target =
        size === 'thumb' ? place.photo_thumb_url ?? place.photo_url
        : size === 'hero' ? place.photo_hero_url ?? place.photo_url
        : place.photo_url;
      return res.redirect(302, target);
    }

    if (!place.google_photo_name) {
      return res.status(404).json({ error: 'No photo' });
    }

    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) {
      console.error('GOOGLE_PLACES_API_KEY is not set; cannot proxy Google photo');
      return res.status(503).json({ error: 'Photo unavailable' });
    }

    const cacheKey = `gphoto:${size}:${place.google_photo_name}`;
    const typeKey = `${cacheKey}:type`;
    const [cachedBody, cachedType] = await Promise.all([
      redisClient.getBuffer(cacheKey),
      redisClient.get(typeKey),
    ]);
    if (cachedBody && cachedType) {
      console.log(`photo cache hit place=${place.id} size=${size}`);
      return sendPhoto(res, cachedBody, cachedType);
    }
    console.log(`photo cache miss place=${place.id} size=${size}`);

    // The media endpoint 302s to the image; fetch follows it, and the key stays
    // on the first hop only. Never log the URL.
    const upstream = await fetch(
      `https://places.googleapis.com/v1/${place.google_photo_name}/media?maxWidthPx=${PHOTO_SIZES[size]}&key=${encodeURIComponent(apiKey)}`,
      { signal: AbortSignal.timeout(10_000) }
    );
    const contentType = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !contentType.startsWith('image/')) {
      console.error(`Google photo fetch failed place=${place.id} size=${size} status=${upstream.status} type=${contentType || 'none'}`);
      return res.status(502).json({ error: 'Photo unavailable' });
    }
    const body = Buffer.from(await upstream.arrayBuffer());

    await redisClient
      .multi()
      .set(cacheKey, body, 'EX', PHOTO_CACHE_TTL_SECONDS)
      .set(typeKey, contentType, 'EX', PHOTO_CACHE_TTL_SECONDS)
      .exec();

    return sendPhoto(res, body, contentType);
  } catch (err: any) {
    if (err && err.code === '22P02') {
      return res.status(404).json({ error: 'Place not found' });
    }
    console.error(`Error proxying photo place=${id} size=${size}:`, err);
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
          children: p.children.map(c => ({
            value: c.value,
            display: c.display,
            order: String(c.sort_order),
          })),
        })),
        standalone: structuredRows.standalone.map(s => ({
          value: s.value,
          display: s.display,
          order: String(s.sort_order),
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
    }));

    res.json(response);
  } catch (error) {
    console.error('Error fetching tags:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/neighborhoods', async (_req: Request, res: Response) => {
  try {
    const rows = await NeighborhoodModel.findAll();
    const response: NeighborhoodSummary[] = rows.map((n) => ({
      id: n.id,
      value: n.value,
      display: n.display,
      is_default: n.is_default,
      order: String(n.sort_order),
    }));
    res.json(response);
  } catch (err) {
    console.error('GET /api/neighborhoods failed', err);
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
