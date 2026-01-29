import { Router, Request, Response } from 'express';
import { PlaceModel, TagModel, UserModel } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Helper to safely get a single param value
function getParamId(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

// =====================================================
// Authentication Routes
// =====================================================

// Login page
router.get('/login', (req: Request, res: Response) => {
  if (req.session?.userId) {
    return res.redirect('/admin/places');
  }
  res.render('admin/login', { error: null });
});

// Login handler
router.post('/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.render('admin/login', { error: 'Email and password are required' });
  }

  const user = await UserModel.authenticate(email, password);
  if (!user) {
    return res.render('admin/login', { error: 'Invalid email or password' });
  }

  // Set session
  req.session.userId = user.id;
  req.session.user = user;

  res.redirect('/admin/places');
});

// Logout handler
router.post('/logout', (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err);
    }
    res.redirect('/admin/login');
  });
});

// =====================================================
// Protected Routes (require authentication)
// =====================================================

// Apply auth middleware to all routes below
router.use(requireAuth);

// Admin home - redirect to places
router.get('/', (req: Request, res: Response) => {
  res.redirect('/admin/places');
});

// =====================================================
// Places CRUD
// =====================================================

// List places
router.get('/places', async (req: Request, res: Response) => {
  const sortBy = (req.query.sort_by as string) || 'name';
  const sortOrder = (req.query.sort_order as string) || 'asc';

  let places = await PlaceModel.findAll();

  // Sort places
  places = places.sort((a, b) => {
    let aVal: string | Date;
    let bVal: string | Date;

    switch (sortBy) {
      case 'created_at':
        aVal = a.created_at;
        bVal = b.created_at;
        break;
      case 'updated_at':
        aVal = a.updated_at;
        bVal = b.updated_at;
        break;
      default:
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  res.render('admin/places/index', {
    places,
    sortBy,
    sortOrder,
    user: req.user
  });
});

// New place form
router.get('/places/new', async (req: Request, res: Response) => {
  const tags = await TagModel.findAll();
  res.render('admin/places/form', {
    place: null,
    tags,
    user: req.user,
    errors: []
  });
});

// Create place
router.post('/places', async (req: Request, res: Response) => {
  const { name, address, phone, url, specials, categories, notes, tags } = req.body;

  const errors: string[] = [];
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (errors.length > 0) {
    const allTags = await TagModel.findAll();
    return res.render('admin/places/form', {
      place: req.body,
      tags: allTags,
      user: req.user,
      errors
    });
  }

  await PlaceModel.create({
    name: name.trim(),
    address: address?.trim(),
    phone: phone?.trim(),
    url: url?.trim(),
    specials: specials?.trim(),
    categories: categories?.trim(),
    notes: notes?.trim(),
    tags: Array.isArray(tags) ? tags : tags ? [tags] : []
  });

  res.redirect('/admin/places');
});

// Edit place form
router.get('/places/:id/edit', async (req: Request, res: Response) => {
  const place = await PlaceModel.findById(getParamId(req.params.id));
  if (!place) {
    return res.status(404).send('Place not found');
  }

  const tags = await TagModel.findAll();

  // Convert HTML breaks back to newlines for editing
  const editablePlace = {
    ...place,
    specials: place.specials?.replace(/<br\s*\/?>/gi, '\n') || '',
    notes: place.notes?.replace(/<br\s*\/?>/gi, '\n') || ''
  };

  res.render('admin/places/form', {
    place: editablePlace,
    tags,
    user: req.user,
    errors: []
  });
});

// Update place
router.post('/places/:id', async (req: Request, res: Response) => {
  const { name, address, phone, url, specials, categories, notes, tags } = req.body;

  const errors: string[] = [];
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (errors.length > 0) {
    const allTags = await TagModel.findAll();
    return res.render('admin/places/form', {
      place: { id: getParamId(req.params.id), ...req.body },
      tags: allTags,
      user: req.user,
      errors
    });
  }

  const updated = await PlaceModel.update(getParamId(req.params.id), {
    name: name.trim(),
    address: address?.trim(),
    phone: phone?.trim(),
    url: url?.trim(),
    specials: specials?.trim(),
    categories: categories?.trim(),
    notes: notes?.trim(),
    tags: Array.isArray(tags) ? tags : tags ? [tags] : []
  });

  if (!updated) {
    return res.status(404).send('Place not found');
  }

  res.redirect('/admin/places');
});

// Delete place
router.post('/places/:id/delete', async (req: Request, res: Response) => {
  await PlaceModel.delete(getParamId(req.params.id));
  res.redirect('/admin/places');
});

// =====================================================
// Tags CRUD
// =====================================================

// List tags
router.get('/tags', async (req: Request, res: Response) => {
  const tags = await TagModel.findAll(); // Already sorted by sort_order
  res.render('admin/tags/index', {
    tags,
    user: req.user
  });
});

// New tag form
router.get('/tags/new', (req: Request, res: Response) => {
  res.render('admin/tags/form', {
    tag: null,
    user: req.user,
    errors: []
  });
});

// Create tag
router.post('/tags', async (req: Request, res: Response) => {
  const { value, display, sort_order } = req.body;

  const errors: string[] = [];
  if (!value || value.trim() === '') {
    errors.push('Value is required');
  }
  if (!display || display.trim() === '') {
    errors.push('Display name is required');
  }
  if (value && !/^[a-z0-9-]+$/.test(value.trim())) {
    errors.push('Value must contain only lowercase letters, numbers, and hyphens');
  }

  // Check for duplicate value
  if (value) {
    const existing = await TagModel.findByValue(value.trim());
    if (existing) {
      errors.push('A tag with this value already exists');
    }
  }

  if (errors.length > 0) {
    return res.render('admin/tags/form', {
      tag: req.body,
      user: req.user,
      errors
    });
  }

  await TagModel.create({
    value: value.trim(),
    display: display.trim(),
    sort_order: parseInt(sort_order, 10) || 0
  });

  res.redirect('/admin/tags');
});

// Edit tag form
router.get('/tags/:id/edit', async (req: Request, res: Response) => {
  const tag = await TagModel.findById(getParamId(req.params.id));
  if (!tag) {
    return res.status(404).send('Tag not found');
  }

  res.render('admin/tags/form', {
    tag,
    user: req.user,
    errors: []
  });
});

// Update tag
router.post('/tags/:id', async (req: Request, res: Response) => {
  const { value, display, sort_order } = req.body;
  const tagId = getParamId(req.params.id);

  const errors: string[] = [];
  if (!value || value.trim() === '') {
    errors.push('Value is required');
  }
  if (!display || display.trim() === '') {
    errors.push('Display name is required');
  }
  if (value && !/^[a-z0-9-]+$/.test(value.trim())) {
    errors.push('Value must contain only lowercase letters, numbers, and hyphens');
  }

  // Check for duplicate value (excluding current tag)
  if (value) {
    const existing = await TagModel.findByValue(value.trim());
    if (existing && existing.id !== tagId) {
      errors.push('A tag with this value already exists');
    }
  }

  if (errors.length > 0) {
    return res.render('admin/tags/form', {
      tag: { id: tagId, ...req.body },
      user: req.user,
      errors
    });
  }

  const updated = await TagModel.update(tagId, {
    value: value.trim(),
    display: display.trim(),
    sort_order: parseInt(sort_order, 10) || 0
  });

  if (!updated) {
    return res.status(404).send('Tag not found');
  }

  res.redirect('/admin/tags');
});

// Delete tag confirmation page
router.get('/tags/:id/delete', async (req: Request, res: Response) => {
  const tag = await TagModel.findById(getParamId(req.params.id));
  if (!tag) {
    return res.status(404).send('Tag not found');
  }

  // Find places that use this tag
  const affectedPlaces = await TagModel.findPlacesByTagId(tag.id);

  res.render('admin/tags/delete', {
    tag,
    affectedPlaces,
    user: req.user
  });
});

// Delete tag (confirmed)
router.post('/tags/:id/delete', async (req: Request, res: Response) => {
  await TagModel.delete(getParamId(req.params.id));
  res.redirect('/admin/tags');
});

// =====================================================
// Admin API endpoints (for potential AJAX use)
// =====================================================

// Get current user
router.get('/api/me', (req: Request, res: Response) => {
  res.json(req.user);
});

// Places API
router.get('/api/places', async (req: Request, res: Response) => {
  const places = await PlaceModel.findAll();
  res.json(places);
});

router.get('/api/places/:id', async (req: Request, res: Response) => {
  const place = await PlaceModel.findById(getParamId(req.params.id));
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json(place);
});

router.post('/api/places', async (req: Request, res: Response) => {
  const place = await PlaceModel.create(req.body);
  res.status(201).json(place);
});

router.put('/api/places/:id', async (req: Request, res: Response) => {
  const place = await PlaceModel.update(getParamId(req.params.id), req.body);
  if (!place) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.json(place);
});

router.delete('/api/places/:id', async (req: Request, res: Response) => {
  const deleted = await PlaceModel.delete(getParamId(req.params.id));
  if (!deleted) {
    return res.status(404).json({ error: 'Place not found' });
  }
  res.status(204).send();
});

// Tags API
router.get('/api/tags', async (req: Request, res: Response) => {
  const tags = await TagModel.findAll();
  res.json(tags);
});

router.get('/api/tags/:id', async (req: Request, res: Response) => {
  const tag = await TagModel.findById(getParamId(req.params.id));
  if (!tag) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.json(tag);
});

router.patch('/api/tags/:id', async (req: Request, res: Response) => {
  const tag = await TagModel.update(getParamId(req.params.id), req.body);
  if (!tag) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.json(tag);
});

router.delete('/api/tags/:id', async (req: Request, res: Response) => {
  const deleted = await TagModel.delete(getParamId(req.params.id));
  if (!deleted) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.status(204).send();
});

export default router;
