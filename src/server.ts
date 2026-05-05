import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';
import { csrfSync } from 'csrf-sync';
import rateLimit from 'express-rate-limit';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';
import publicRoutes from './routes/public.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client for sessions
const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

// Trust proxy (required for secure cookies behind reverse proxy like Caddy)
app.set('trust proxy', 1);

// Middleware
const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://admin.localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(process.cwd(), 'public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(process.cwd(), 'src/views'));

// Session configuration with Redis store
const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error('SESSION_SECRET environment variable is required');
}
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF protection (synchronizer token pattern — stored in session)
const { csrfSynchronisedProtection, generateToken } = csrfSync({
  getTokenFromRequest: (req) => req.body?._csrf || req.headers['x-csrf-token'],
});

// Apply CSRF to admin routes only (public API is stateless)
app.use('/admin', csrfSynchronisedProtection, (req: express.Request, res: express.Response, next: express.NextFunction) => {
  res.locals.csrfToken = generateToken(req);
  next();
});

// Subdomain routing middleware
app.use((req, res, next) => {
  const host = req.hostname;

  // Determine which subdomain we're on
  if (host.startsWith('admin.') || host === 'admin.localhost') {
    req.subdomain = 'admin';
  } else {
    req.subdomain = 'www';
  }

  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Rate limiting for the public API. Mobile app + any other caller share the bucket.
// Higher cap in dev to avoid tripping during Expo reload cycles.
const apiLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
});
app.use('/api', apiLimiter);

// Public API routes (no auth required)
app.use('/api', apiRoutes);

// Admin routes (auth handled per-route)
app.use('/admin', adminRoutes);

// Public site routes
app.use('/', (req, res, next) => {
  if (req.subdomain === 'admin') {
    res.redirect('/admin');
  } else {
    next();
  }
}, publicRoutes);

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.message);
  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }
  // Render HTML for admin browser navigations; JSON for everything else
  // (public API, admin AJAX endpoints under /admin/api).
  const isAdminHtml =
    req.path.startsWith('/admin') &&
    !req.path.startsWith('/admin/api') &&
    req.accepts(['html', 'json']) === 'html';

  if (isAdminHtml) {
    res.status(500).render('error', { message: 'Internal server error' });
    return;
  }
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  Public site: http://localhost:${PORT}`);
  console.log(`  Admin site:  http://admin.localhost:${PORT}`);
  console.log(`  Public API:  http://localhost:${PORT}/api`);
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      subdomain?: 'www' | 'admin';
    }
  }
}

export default app;
