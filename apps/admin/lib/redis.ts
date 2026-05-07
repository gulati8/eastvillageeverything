import Redis from 'ioredis';

const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
let client: Redis | null = null;

export function redis(): Redis {
  if (!client) {
    client = new Redis(url);
    client.on('error', (err) => console.error('redis error in admin:', err));
  }
  return client;
}
