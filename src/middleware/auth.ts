import { Request, Response, NextFunction } from 'express';
import { UserPublic } from '../models/user.js';

// Extend Express Session
declare module 'express-session' {
  interface SessionData {
    userId?: string;
    user?: UserPublic;
  }
}

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      user?: UserPublic;
    }
  }
}

/**
 * Middleware to require authentication
 * Redirects to login page if not authenticated
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId && req.session?.user) {
    req.user = req.session.user;
    next();
  } else {
    // For API requests, return 401
    if (req.path.startsWith('/admin/api/')) {
      res.status(401).json({ error: 'Authentication required' });
    } else {
      // For page requests, redirect to login
      res.redirect('/admin/login');
    }
  }
}

/**
 * Middleware to attach user to request if authenticated (but don't require it)
 */
export function attachUser(req: Request, res: Response, next: NextFunction): void {
  if (req.session?.userId && req.session?.user) {
    req.user = req.session.user;
  }
  next();
}

/**
 * Helper to check if request is authenticated
 */
export function isAuthenticated(req: Request): boolean {
  return !!req.session?.userId;
}

export default { requireAuth, attachUser, isAuthenticated };
