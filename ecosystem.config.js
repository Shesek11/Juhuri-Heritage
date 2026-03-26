// PM2 Ecosystem Configuration
// Usage: pm2 start ecosystem.config.js
module.exports = {
  apps: [{
    name: 'nodejs-jun-juhuri.com',
    script: 'server.js',
    cwd: '/var/www/jun-juhuri.com',
    env: {
      PORT: 5000,
      NODE_ENV: 'production',
    },
    // Restart policy
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000,
    autorestart: true,
    // Memory limit: restart if exceeds 512MB
    max_memory_restart: '512M',
    // Logging
    error_file: '/var/www/jun-juhuri.com/logs/pm2-error.log',
    out_file: '/var/www/jun-juhuri.com/logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    // Log rotation (requires pm2-logrotate module)
    // pm2 install pm2-logrotate
    // pm2 set pm2-logrotate:max_size 10M
    // pm2 set pm2-logrotate:retain 7
  }],
};
