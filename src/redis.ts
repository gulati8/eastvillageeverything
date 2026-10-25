import { Redis } from 'ioredis';

/**
 * Shared Redis client for the Express server: the session store and the
 * Google photo proxy cache (`src/routes/api.ts`) both use it.
 */
export const redisClient = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

redisClient.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});
