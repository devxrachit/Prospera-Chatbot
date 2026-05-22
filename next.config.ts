import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // packages with native bindings or Node.js-only APIs must not be bundled
  serverExternalPackages: ['pg', 'bullmq', 'ioredis', 'pdf-parse'],
};

export default nextConfig;
