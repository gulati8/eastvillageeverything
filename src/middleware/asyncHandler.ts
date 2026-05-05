import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route handler so rejected promises forward to the next
 * error-handling middleware instead of escaping the request lifecycle.
 *
 * Use for admin routes only — src/routes/api.ts already has explicit
 * try/catch on every handler.
 */
type AsyncHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(fn: AsyncHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
