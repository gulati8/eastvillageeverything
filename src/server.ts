import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';
import RedisStore from 'connect-redis';
import { Redis } from 'ioredis';

import apiRoutes from './routes/api.js';
import adminRoutes from './routes/admin.js';

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

// Middleware
app.use(cors({
  origin: true, // Allow all origins (configure for production)
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
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

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

// Public API routes (no auth required)
app.use('/api', apiRoutes);

// Admin routes (auth handled per-route)
app.use('/admin', adminRoutes);

// Public site routes
app.get('/', (req, res) => {
  if (req.subdomain === 'admin') {
    res.redirect('/admin');
  } else {
    // Will be replaced with actual public site template
    res.send('East Village Everything - coming soon');
  }
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
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
