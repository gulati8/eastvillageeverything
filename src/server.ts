import express from 'express';
import cors from 'cors';
import path from 'path';
import session from 'express-session';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Session configuration (Redis store will be added later)
app.use(session({
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

// Placeholder routes (will be replaced with actual route files)
app.get('/', (req, res) => {
  if (req.subdomain === 'admin') {
    res.send('Admin interface - coming soon');
  } else {
    res.send('East Village Everything - coming soon');
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`  Public site: http://localhost:${PORT}`);
  console.log(`  Admin site:  http://admin.localhost:${PORT}`);
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
