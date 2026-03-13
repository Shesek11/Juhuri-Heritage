/**
 * Custom Next.js standalone server for production deployment on xCloud.
 *
 * Based on the default standalone server.js but adds:
 * - Static file serving for /uploads/ directory
 * - Custom port (5000)
 * - Graceful shutdown
 *
 * IMPORTANT: This file replaces the auto-generated .next/standalone/server.js
 * during deployment. It must use the standalone API (startServer), NOT the
 * dev API (next({ dev })), because standalone mode has no source files.
 */

const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');
const fs = require('fs');

// Set production mode and working directory
process.env.NODE_ENV = 'production';
process.chdir(__dirname);

const port = parseInt(process.env.PORT || '5000', 10);
const hostname = process.env.HOSTNAME || '0.0.0.0';

// Load the Next.js standalone config
const nextConfig = require('./.next/required-server-files.json').config;
process.env.__NEXT_PRIVATE_STANDALONE_CONFIG = JSON.stringify(nextConfig);

const next = require('next');
const app = next({
  dev: false,
  dir: __dirname,
  hostname,
  port,
  conf: nextConfig,
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);

      // Serve uploaded files from /uploads/ directory
      if (parsedUrl.pathname && parsedUrl.pathname.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, parsedUrl.pathname);
        if (fs.existsSync(filePath)) {
          const ext = path.extname(filePath).toLowerCase();
          const mimeTypes = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp',
            '.svg': 'image/svg+xml',
            '.mp3': 'audio/mpeg',
            '.wav': 'audio/wav',
            '.webm': 'audio/webm',
          };
          res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          fs.createReadStream(filePath).pipe(res);
          return;
        }
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling request:', err);
      res.statusCode = 500;
      res.end('Internal Server Error');
    }
  });

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('Shutting down...');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 30000);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
});
