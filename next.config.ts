import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Strict mode for catching React issues early
  reactStrictMode: true,

  // Allow HMR from local network IPs in development
  allowedDevOrigins: ['10.138.146.5', 'localhost:3000', '127.0.0.1:3000'],

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
