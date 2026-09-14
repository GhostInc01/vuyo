/**
 * LocalBiz Production PM2 Ecosystem Configuration
 *
 * Usage:
 *   pm2 start ecosystem.config.cjs --env production
 *   pm2 status
 *   pm2 logs
 *   pm2 reload localbiz-platform --update-env
 */

module.exports = {
  apps: [
    {
      name: 'localbiz-platform',
      script: 'server.js',
      instances: 1, // Single instance recommended for SQLite WAL concurrency
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        TRUST_PROXY: 1
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/pm2-error.log',
      out_file: 'logs/pm2-out.log',
      merge_logs: true,
      kill_timeout: 5000, // Time before sending SIGKILL after SIGTERM
      wait_ready: true,
      listen_timeout: 10000
    }
  ]
};
