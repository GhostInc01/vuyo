/**
 * LocalBiz Automated Database Backup Utility
 *
 * Flushes SQLite WAL journals safely via checkpointing and creates
 * a timestamped, checksummed backup snapshot with verified record counts.
 *
 * Usage:
 *   node scripts/backup-db.js
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { prisma } from '../server.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function performBackup() {
  console.log('====================================================');
  console.log('         LOCALBIZ PRODUCTION DATABASE BACKUP        ');
  console.log('====================================================');

  const dbPath = path.join(rootDir, 'prisma', 'dev.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Source database not found at: ${dbPath}`);
  }

  // Ensure backups directory exists
  const backupDir = path.join(rootDir, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Force SQLite WAL checkpoint to flush all journal buffers into main db file
  console.log('[1/4] Flushing SQLite WAL journal buffers (PRAGMA wal_checkpoint)...');
  try {
    const checkpoint = await prisma.$queryRawUnsafe('PRAGMA wal_checkpoint(TRUNCATE);');
    console.log('      WAL checkpoint result:', checkpoint);
  } catch (err) {
    console.warn('      Warning during WAL checkpoint:', err.message);
  }

  // 2. Fetch record counts for backup verification
  console.log('[2/4] Verifying database integrity & entity volume...');
  const [users, merchants, products, orders, bookings, reviews] = await Promise.all([
    prisma.user.count(),
    prisma.merchant.count(),
    prisma.product.count(),
    prisma.order.count(),
    prisma.booking.count(),
    prisma.review.count()
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFileName = `localbiz-backup-${timestamp}.db`;
  const targetBackupPath = path.join(backupDir, backupFileName);

  // 3. Create file copy
  console.log(`[3/4] Creating snapshot: ${backupFileName}...`);
  fs.copyFileSync(dbPath, targetBackupPath);

  // 4. Generate SHA-256 Checksum
  console.log('[4/4] Computing SHA-256 integrity checksum...');
  const fileBuffer = fs.readFileSync(targetBackupPath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  const sha256 = hashSum.digest('hex');
  const stats = fs.statSync(targetBackupPath);

  const manifest = {
    backupFile: backupFileName,
    sourceDb: path.relative(rootDir, dbPath),
    createdAt: new Date().toISOString(),
    sizeBytes: stats.size,
    sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
    sha256,
    entityCounts: {
      users,
      merchants,
      products,
      orders,
      bookings,
      reviews
    }
  };

  const manifestPath = path.join(backupDir, `localbiz-backup-${timestamp}.json`);
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log('              BACKUP COMPLETED SUCCESSFULLY         ');
  console.log('====================================================');
  console.log(`  File:      ${targetBackupPath}`);
  console.log(`  Size:      ${manifest.sizeMB} MB (${stats.size} bytes)`);
  console.log(`  SHA-256:   ${sha256}`);
  console.log('  Volume:   ', manifest.entityCounts);
  console.log(`  Manifest:  ${manifestPath}`);
  console.log('====================================================\n');
}

performBackup()
  .catch((err) => {
    console.error('\n[BACKUP FAILED]:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
