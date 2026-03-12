/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',

  // Allow importing from root-level dirs (components/, contexts/, services/, etc.)
  // until they are fully moved into src/
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  images: {
    remotePatterns: [
      { hostname: 'images.unsplash.com' },
      { hostname: 'ui-avatars.com' },
      { hostname: '*.tile.openstreetmap.org' },
    ],
  },

  // Security headers (replaces Helmet from Express)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value:
              'geolocation=(self), camera=(), microphone=(self), payment=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },

  // Trailing slash redirect (301 /path/ → /path)
  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
    ];
  },

  // Content Security Policy applied at middleware level for nonce support
  // Static CSP directives can be added here if needed
};

module.exports = nextConfig;
