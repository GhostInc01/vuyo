# LocalBiz — Production Deployment Handbook

## 1. System Architecture & Overview

LocalBiz is an enterprise-grade hyperlocal community commerce web platform engineered for high-concurrency, low-latency, and multi-tenant marketplace operations.

```
                  ┌─────────────────────────────────────────┐
                  │          End Users / Browsers           │
                  └────────────────────┬────────────────────┘
                                       │ HTTPS (443)
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Edge / Reverse Proxy (Nginx)      │
                  │   - SSL/TLS Termination (Let's Encrypt) │
                  │   - Gzip / Brotli Compression           │
                  │   - Rate Limiting & DDOS Protection     │
                  └─────────┬─────────────────────┬─────────┘
                            │                     │
                Static SPA  │                     │ API Reverse Proxy
             (/assets, etc) │                     │ (http://127.0.0.1:3000)
                            ▼                     ▼
                  ┌───────────────────┐  ┌──────────────────┐
                  │  Vite Production  │  │  Node.js Express │
                  │    Build Bundle   │  │   Application    │
                  │     (dist/)       │  │ (PM2 Supervisor) │
                  └───────────────────┘  └────────┬─────────┘
                                                  │
                                                  ▼
                                       ┌────────────────────┐
                                       │  Prisma 5.22 ORM   │
                                       │  - Connection Pool │
                                       │  - WAL Concurrency │
                                       └──────────┬─────────┘
                                                  │
                                                  ▼
                                       ┌────────────────────┐
                                       │ SQLite (dev.db) or │
                                       │ PostgreSQL / MySQL │
                                       └────────────────────┘
```

---

## 2. Server Prerequisites

### Minimum Hardware Recommendations
- **CPU**: 2 Cores (x86_64 or ARM64)
- **RAM**: 2 GB (4 GB recommended for database caching and build jobs)
- **Disk**: 20 GB SSD / NVMe
- **Operating System**: Ubuntu 22.04 LTS / Debian 12 / AlmaLinux 9 / Windows Server 2022

### Software Dependencies
- **Node.js**: `v20.x` or `v22.x` (LTS recommended)
- **Package Manager**: `npm` v10+
- **Process Manager**: `pm2` (`npm install -g pm2`)
- **Reverse Proxy**: `nginx` (`apt install nginx -y`)
- **SSL Certificate Manager**: `certbot` & `python3-certbot-nginx`

---

## 3. Installation & Setup

### Step 1: Clone Repository
```bash
git clone https://github.com/your-org/localbiz.git /var/www/localbiz
cd /var/www/localbiz
```

### Step 2: Install Production Dependencies
```bash
npm ci --omit=dev
```
*(Note: If running database migrations and builds on the production node, install full dependencies with `npm ci`).*

---

## 4. Environment Configuration

Copy the production environment configuration template:
```bash
cp .env.example .env
chmod 600 .env
```

Edit `.env` with production secrets:
```ini
# Application Runtime
NODE_ENV=production
PORT=3000

# Database Connection URI
# SQLite (Single Node / Embedded):
DATABASE_URL="file:./dev.db"

# Or for hosted PostgreSQL:
# DATABASE_URL="postgresql://localbiz_user:YourStrongPassword@127.0.0.1:5432/localbiz_prod?schema=public&connection_limit=20"

# Cryptographic Authentication Keys (64-char hex)
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="e4f6a18d9b2c3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f"
JWT_EXPIRES_IN="7d"

# Reverse Proxy Hops (Nginx = 1)
TRUST_PROXY=1

# CORS Allowed Origins (Comma-separated)
CORS_ORIGIN="https://localbiz.co.za,https://admin.localbiz.co.za"

# Sliding Window Rate Limiter
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100

# Logging Level
LOG_LEVEL="info"

# Initial Super Admin Bootstrapping
ADMIN_EMAIL="admin@localbiz.co.za"
ADMIN_PASSWORD="YourEnterpriseAdminPassword123!"

# Payment Gateway Settings
PAYMENT_GATEWAY_ENV="production"
PAYMENT_WEBHOOK_SECRET="whsec_3b7a8f9c1d2e4f5a6b7c8d9e0f1a2b3c"
```

---

## 5. Database Setup & Migration

### Generate Prisma Client
```bash
npx prisma generate
```

### Apply Database Migrations
For production deployment with zero downtime:
```bash
# Push schema changes or apply migration files
npx prisma db push --skip-generate
```

### High-Performance Storage Engine Verification
LocalBiz automatically initializes SQLite with high-concurrency WAL mode and memory page caches:
- `PRAGMA journal_mode = WAL;` (Enables concurrent lock-free reads while writes occur)
- `PRAGMA synchronous = NORMAL;` (Ensures data integrity during power failures without blocking I/O)
- `PRAGMA cache_size = -64000;` (Allocates 64 MB RAM cache)
- `PRAGMA temp_store = MEMORY;`
- `PRAGMA mmap_size = 30000000000;`

---

## 6. Frontend Production Build

Compile the React single-page application into optimized static assets:
```bash
npm run build
```

This compiles client bundles into `/dist`:
- `index.html`: Pre-rendered entry point with CSP directives.
- `assets/index-*.js`: Code-split core consumer shell (~240 kB).
- `assets/vendor-react-*.js`: Isolated React 18 dependencies (~133 kB).
- `assets/vendor-icons-*.js`: Isolated Lucide UI icon set (~40 kB).
- `assets/MerchantHub-*.js`: Lazy-loaded business management hub (~127 kB).
- `assets/AdminHub-*.js`: Lazy-loaded super admin console (~88 kB).
- `assets/index-*.css`: Purged Tailwind production styling (~60 kB).

---

## 7. Process Management with PM2

LocalBiz includes a production process supervisor configuration (`ecosystem.config.cjs`).

### Start the Application
```bash
pm2 start ecosystem.config.cjs --env production
```

### Manage the Service
```bash
# View process status and memory footprint
pm2 status

# Monitor live CPU, memory, and event loop latency
pm2 monit

# View real-time structured logs
pm2 logs localbiz-platform

# Reload zero-downtime with updated environment variables
pm2 reload localbiz-platform --update-env

# Persist PM2 across system reboots
pm2 save
pm2 startup
```

---

## 8. Reverse Proxy (Nginx) & SSL/TLS Configuration

Create an Nginx server block at `/etc/nginx/sites-available/localbiz`:

```nginx
# HTTP - Redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name localbiz.co.za www.localbiz.co.za;
    return 301 https://$host$request_uri;
}

# HTTPS - Production Web & API Gateway
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name localbiz.co.za www.localbiz.co.za;

    # SSL Certificates (managed via Certbot)
    ssl_certificate /etc/letsencrypt/live/localbiz.co.za/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/localbiz.co.za/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Defense-in-Depth Security Headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

    # Static Assets & Long-Term Caching
    location /assets/ {
        alias /var/www/localbiz/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
        access_log off;
    }

    # API Proxy & Reverse Gateway
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # SPA Fallback
    location / {
        root /var/www/localbiz/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable site and reload Nginx:
```bash
ln -s /etc/nginx/sites-available/localbiz /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

Obtain SSL certificate with Certbot:
```bash
certbot --nginx -d localbiz.co.za -d www.localbiz.co.za
```

---

## 9. Backup & Disaster Recovery

LocalBiz provides automated backup and restore utilities in `/scripts`.

### 9.1 Automated Live Database Backup
Run the backup script:
```bash
node scripts/backup-db.js
```
**Process executed by `backup-db.js`:**
1. Flushes SQLite write-ahead log journals to disk (`PRAGMA wal_checkpoint(TRUNCATE)`).
2. Verifies entity volume integrity (Users, Merchants, Products, Orders, Bookings, Reviews).
3. Creates a timestamped snapshot: `backups/localbiz-backup-<timestamp>.db`.
4. Computes cryptographic SHA-256 integrity checksum.
5. Writes manifest metadata: `backups/localbiz-backup-<timestamp>.json`.

### 9.2 Automated Cron Backup Job
Add to system crontab (`crontab -e`):
```cron
# Run backup daily at 02:00 UTC
0 2 * * * cd /var/www/localbiz && /usr/bin/node scripts/backup-db.js >> /var/log/localbiz-backup.log 2>&1
```

### 9.3 Database Restore Procedure
To restore the platform to a verified backup snapshot:
```bash
# 1. Stop the application server to release database file locks
pm2 stop localbiz-platform

# 2. Execute restore utility (auto-detects latest backup, or provide file path)
node scripts/restore-db.js backups/localbiz-backup-2026-09-11T17-50-03-916Z.db

# 3. Restart the application server
pm2 start localbiz-platform
```
**Safety features of `restore-db.js`:**
- Validates SHA-256 checksum against manifest before applying.
- Creates pre-restore safety snapshot of the active database before overwriting.
- Cleans up transient `.db-wal` and `.db-shm` files to prevent corrupted transactions.
- Executes pre-flight Prisma verification queries before marking restore complete.

---

## 10. Rollback Procedures

### Application Rollback
If a newly deployed code version exhibits issues:
```bash
# 1. Checkout previous stable release or Git tag
git checkout v2.0.0

# 2. Re-install dependencies & rebuild frontend
npm ci --omit=dev
npm run build

# 3. Reload PM2 worker zero-downtime
pm2 reload localbiz-platform --update-env
```

### Database Schema Rollback
If a database migration must be reverted:
```bash
# 1. Stop application
pm2 stop localbiz-platform

# 2. Restore pre-migration backup snapshot
node scripts/restore-db.js backups/pre-restore-2026-09-11T17-50-35-509Z.db

# 3. Restart application
pm2 start localbiz-platform
```

---

## 11. Monitoring & Health Probes

### Health Check Endpoint
LocalBiz exposes a health probe at `GET /api/health`:
```bash
curl -I https://localbiz.co.za/api/health
```
**Response Format:**
```json
{
  "status": "ok",
  "environment": "production",
  "uptime": 86400,
  "timestamp": "2026-09-11T17:50:00.000Z",
  "database": {
    "status": "connected",
    "engine": "sqlite"
  }
}
```
If the database connection fails, the probe returns HTTP `503 Service Unavailable` with `status: "degraded"`, allowing load balancers (AWS ALB, Cloudflare, Traefik) to take corrective action.

### Uptime Monitoring Integration
Configure external monitoring (e.g. UptimeRobot, Datadog, Pingdom, BetterStack):
- **URL**: `https://localbiz.co.za/api/health`
- **Expected Status**: `200`
- **Check Interval**: `60s`
- **Timeout**: `5s`
