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
  const { parents, standalone } = await TagModel.findAllStructured();
  res.render('admin/places/form', {
    place: null,
    parents,
    standalone,
    user: req.user,
    errors: []
  });
});

// Create place
router.post('/places', async (req: Request, res: Response) => {
  const { name, address, phone, url, specials, categories, notes, tags,
    pitch, perfect, insider, crowd, vibe, crowd_level, price_tier,
    cross_street, photo_url, photo_credit
  } = req.body;

  const errors: string[] = [];
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (errors.length > 0) {
    const { parents, standalone } = await TagModel.findAllStructured();
    return res.render('admin/places/form', {
      place: req.body,
      parents,
      standalone,
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
    tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
    pitch: pitch?.trim() || undefined,
    perfect: perfect?.trim() || undefined,
    insider: insider?.trim() || undefined,
    crowd: crowd?.trim() || undefined,
    vibe: vibe?.trim() || undefined,
    crowd_level: crowd_level?.trim() || undefined,
    price_tier: price_tier?.trim() || undefined,
    cross_street: cross_street?.trim() || undefined,
    photo_url: photo_url?.trim() || undefined,
    photo_credit: photo_credit?.trim() || undefined
  });

  res.redirect('/admin/places');
});

// Edit place form
router.get('/places/:id/edit', async (req: Request, res: Response) => {
  const place = await PlaceModel.findById(getParamId(req.params.id));
  if (!place) {
    return res.status(404).send('Place not found');
  }

  const { parents, standalone } = await TagModel.findAllStructured();

  res.render('admin/places/form', {
    place,
    parents,
    standalone,
    user: req.user,
    errors: []
  });
});

// Update place
router.post('/places/:id', async (req: Request, res: Response) => {
  const { name, address, phone, url, specials, categories, notes, tags,
    pitch, perfect, insider, crowd, vibe, crowd_level, price_tier,
    cross_street, photo_url, photo_credit
  } = req.body;

  const errors: string[] = [];
  if (!name || name.trim() === '') {
    errors.push('Name is required');
  }

  if (errors.length > 0) {
    const { parents, standalone } = await TagModel.findAllStructured();
    return res.render('admin/places/form', {
      place: { id: getParamId(req.params.id), ...req.body },
      parents,
      standalone,
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
    tags: Array.isArray(tags) ? tags : tags ? [tags] : [],
    pitch: pitch?.trim() || undefined,
    perfect: perfect?.trim() || undefined,
    insider: insider?.trim() || undefined,
    crowd: crowd?.trim() || undefined,
    vibe: vibe?.trim() || undefined,
    crowd_level: crowd_level?.trim() || undefined,
    price_tier: price_tier?.trim() || undefined,
    cross_street: cross_street?.trim() || undefined,
    photo_url: photo_url?.trim() || undefined,
    photo_credit: photo_credit?.trim() || undefined
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
  const structuredTags = await TagModel.findAllStructured();
  res.render('admin/tags/index', {
    parents: structuredTags.parents,
    standalone: structuredTags.standalone,
    user: req.user
  });
});

// New tag form
router.get('/tags/new', async (req: Request, res: Response) => {
  const potentialParents = await TagModel.getPotentialParents();
  res.render('admin/tags/form', {
    tag: null,
    potentialParents,
    user: req.user,
    errors: []
  });
});

// Create tag
router.post('/tags', async (req: Request, res: Response) => {
  const { value, display, sort_order, parent_tag_id } = req.body;

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
    const potentialParents = await TagModel.getPotentialParents();
    return res.render('admin/tags/form', {
      tag: req.body,
      potentialParents,
      user: req.user,
      errors
    });
  }

  await TagModel.create({
    value: value.trim(),
    display: display.trim(),
    sort_order: parseInt(sort_order, 10) || 0,
    parent_tag_id: parent_tag_id || null
  });

  res.redirect('/admin/tags');
});

// Edit tag form
router.get('/tags/:id/edit', async (req: Request, res: Response) => {
  const tagId = getParamId(req.params.id);
  const tag = await TagModel.findById(tagId);
  if (!tag) {
    return res.status(404).send('Tag not found');
  }

  // Get potential parents, excluding self and children
  const potentialParents = await TagModel.getPotentialParents(tagId);

  res.render('admin/tags/form', {
    tag,
    potentialParents,
    user: req.user,
    errors: []
  });
});

// Update tag
router.post('/tags/:id', async (req: Request, res: Response) => {
  const { value, display, sort_order, parent_tag_id } = req.body;
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
    const potentialParents = await TagModel.getPotentialParents(tagId);
    return res.render('admin/tags/form', {
      tag: { id: tagId, ...req.body },
      potentialParents,
      user: req.user,
      errors
    });
  }

  const updated = await TagModel.update(tagId, {
    value: value.trim(),
    display: display.trim(),
    sort_order: parseInt(sort_order, 10) || 0,
    parent_tag_id: parent_tag_id || null
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

// JSON endpoint used by tags/index.ejs drag-drop reorder.
// CSRF-protected via the token round-tripped through the EJS template
// (`<%= csrfToken %>`) and sent as `x-csrf-token` header by the fetch caller.
router.patch('/api/tags/:id', async (req: Request, res: Response) => {
  const { value, display, sort_order, parent_tag_id } = req.body;
  const tag = await TagModel.update(getParamId(req.params.id), {
    ...(value !== undefined && { value }),
    ...(display !== undefined && { display }),
    ...(sort_order !== undefined && { sort_order: parseInt(sort_order, 10) || 0 }),
    ...(parent_tag_id !== undefined && { parent_tag_id: parent_tag_id || null }),
  });
  if (!tag) {
    return res.status(404).json({ error: 'Tag not found' });
  }
  res.json(tag);
});

export default router;
