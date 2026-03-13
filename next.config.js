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
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://accounts.google.com https://apis.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://images.unsplash.com https://ui-avatars.com https://*.tile.openstreetmap.org https://www.google-analytics.com https://lh3.googleusercontent.com",
              "connect-src 'self' https://www.google-analytics.com https://generativelanguage.googleapis.com https://accounts.google.com",
              "frame-src https://accounts.google.com",
              "media-src 'self' blob:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
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
