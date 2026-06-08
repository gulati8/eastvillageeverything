const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath,
  // Read workspace packages from source — no built dist required for admin dev.
  transpilePackages: ['@eve/db', '@eve/design-tokens', '@eve/shared-types', '@eve/storage'],
  experimental: {
    // Server actions accept multipart up to bodySizeLimit for the photo upload.
    serverActions: { bodySizeLimit: '12mb' },
    // NOTE: nodeMiddleware was dropped — in Next.js 15.1.0 this key is
    // unrecognized; Node-runtime middleware is the default. No config needed.
  },
};

export default nextConfig;
