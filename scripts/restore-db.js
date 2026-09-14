/**
 * LocalBiz Database Restore & Disaster Recovery Utility
 *
 * Restores a SQLite database from a specified backup snapshot or
 * the latest available backup, with pre-flight checksum verification
 * and automatic safety snapshot creation.
 *
 * Usage:
 *   node scripts/restore-db.js [path-to-backup.db]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function performRestore() {
  console.log('====================================================');
  console.log('         LOCALBIZ DATABASE RESTORE UTILITY          ');
  console.log('====================================================');

  const backupDir = path.join(rootDir, 'backups');
  const targetDbPath = path.join(rootDir, 'prisma', 'dev.db');

  let selectedBackupPath = process.argv[2];

  // If no argument supplied, locate the latest backup in backups/
  if (!selectedBackupPath) {
    if (!fs.existsSync(backupDir)) {
      throw new Error(`Backups directory does not exist: ${backupDir}`);
    }
    const backupFiles = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('localbiz-backup-') && f.endsWith('.db'))
      .sort()
      .reverse();

    if (backupFiles.length === 0) {
      throw new Error('No backup files found in backups/ directory.');
    }

    selectedBackupPath = path.join(backupDir, backupFiles[0]);
    console.log(`[Auto-Detected] Restoring from latest backup: ${path.basename(selectedBackupPath)}`);
  } else {
    selectedBackupPath = path.resolve(process.cwd(), selectedBackupPath);
  }

  if (!fs.existsSync(selectedBackupPath)) {
    throw new Error(`Specified backup file does not exist: ${selectedBackupPath}`);
  }

  // 1. Verify Checksum if manifest exists
  console.log('[1/5] Verifying backup snapshot integrity...');
  const manifestPath = selectedBackupPath.replace(/\.db$/, '.json');
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const fileBuffer = fs.readFileSync(selectedBackupPath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    const computedSha = hashSum.digest('hex');

    if (computedSha !== manifest.sha256) {
      throw new Error(`Checksum mismatch! Manifest SHA: ${manifest.sha256}, Actual: ${computedSha}`);
    }
    console.log('      SHA-256 Checksum verified matched manifest:', computedSha);
  } else {
    console.log('      No JSON manifest found; skipping pre-computed checksum check.');
  }

  // 2. Safety snapshot of current database
  if (fs.existsSync(targetDbPath)) {
    console.log('[2/5] Creating pre-restore safety snapshot of current database...');
    const preRestoreName = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const preRestorePath = path.join(backupDir, preRestoreName);
    fs.copyFileSync(targetDbPath, preRestorePath);
    console.log(`      Current database preserved at: ${preRestorePath}`);
  }

  // 3. Clean up existing WAL and SHM files to avoid journal corruption
  console.log('[3/5] Cleaning up transient WAL and SHM journal files...');
  const walPath = `${targetDbPath}-wal`;
  const shmPath = `${targetDbPath}-shm`;
  try {
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
  } catch (err) {
    if (err.code === 'EBUSY' || err.code === 'EPERM') {
      throw new Error(
        `Cannot restore database while the server is running!\n` +
        `The file is locked by an active Node/PM2 process.\n` +
        `Please stop the server before restoring: "pm2 stop localbiz-platform" or terminate the node process, then retry.`
      );
    }
    throw err;
  }

  // 4. Overwrite dev.db with backup
  console.log('[4/5] Restoring database file from snapshot...');
  fs.copyFileSync(selectedBackupPath, targetDbPath);

  // 5. Connect via Prisma to verify database readability and schema integrity
  console.log('[5/5] Connecting to restored database to verify integrity...');
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRawUnsafe('SELECT 1;');
    const [userCount, merchantCount, productCount, orderCount, bookingCount] = await Promise.all([
      prisma.user.count(),
      prisma.merchant.count(),
      prisma.product.count(),
      prisma.order.count(),
      prisma.booking.count()
    ]);

    console.log('\n====================================================');
    console.log('              RESTORE COMPLETED SUCCESSFULLY        ');
    console.log('====================================================');
    console.log('  Restored From:', selectedBackupPath);
    console.log('  Database Path:', targetDbPath);
    console.log('  Active Volume:', {
      users: userCount,
      merchants: merchantCount,
      products: productCount,
      orders: orderCount,
      bookings: bookingCount
    });
    console.log('====================================================\n');
  } finally {
    await prisma.$disconnect();
  }
}

performRestore().catch((err) => {
  console.error('\n[RESTORE FAILED]:', err.message);
  process.exit(1);
});
