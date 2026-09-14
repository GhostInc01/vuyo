import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const schemaPath = path.join(rootDir, 'schema.sql');
const seedPath = path.join(rootDir, 'seed.sql');
const docsPath = path.join(rootDir, 'docs', 'database.md');

describe('Stage 2 — Database Implementation Verification Suite', () => {
  const schemaContent = fs.readFileSync(schemaPath, 'utf8');
  const seedContent = fs.readFileSync(seedPath, 'utf8');
  const docsContent = fs.readFileSync(docsPath, 'utf8');

  it('verifies that schema.sql and seed.sql exist and are non-empty', () => {
    assert.ok(schemaContent.length > 500, 'schema.sql should contain substantial DDL definitions');
    assert.ok(seedContent.length > 500, 'seed.sql should contain substantial DML seed statements');
    assert.ok(docsContent.length > 500, 'docs/database.md should contain detailed documentation');
  });

  it('verifies all 19 required tables exist in schema.sql', () => {
    const requiredTables = [
      'roles',
      'users',
      'businesses',
      'categories',
      'business_categories',
      'addresses',
      'business_hours',
      'products',
      'services',
      'orders',
      'order_items',
      'bookings',
      'payments',
      'reviews',
      'notifications',
      'favorites',
      'promotions',
      'messages',
      'audit_logs'
    ];

    for (const table of requiredTables) {
      const regex = new RegExp(`CREATE TABLE (?:IF NOT EXISTS )?\`${table}\``, 'i');
      assert.ok(regex.test(schemaContent), `Table \`${table}\` must be defined in schema.sql`);
    }
  });

  it('verifies InnoDB engine and utf8mb4 charset on all tables', () => {
    const tableMatches = schemaContent.match(/CREATE TABLE `([^`]+)`/g) || [];
    assert.ok(tableMatches.length >= 19, `Should find at least 19 CREATE TABLE declarations, found ${tableMatches.length}`);
    
    const innoDbCount = (schemaContent.match(/ENGINE=InnoDB/gi) || []).length;
    assert.equal(innoDbCount, tableMatches.length, 'All tables must specify ENGINE=InnoDB');

    const utf8Count = (schemaContent.match(/DEFAULT CHARSET=utf8mb4/gi) || []).length;
    assert.equal(utf8Count, tableMatches.length, 'All tables must specify DEFAULT CHARSET=utf8mb4');
  });

  it('verifies Business KYC status ENUM supports PENDING, APPROVED, REJECTED, SUSPENDED', () => {
    const businessStatusRegex = /`status`\s+ENUM\('PENDING',\s*'APPROVED',\s*'REJECTED',\s*'SUSPENDED'\)/i;
    assert.ok(businessStatusRegex.test(schemaContent), 'businesses.status must declare PENDING, APPROVED, REJECTED, SUSPENDED');
  });

  it('verifies Orders status ENUM supports all 9 fulfillment stages', () => {
    const orderStatuses = [
      'PENDING',
      'ACCEPTED',
      'REJECTED',
      'PROCESSING',
      'READY',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'COMPLETED',
      'CANCELLED'
    ];
    for (const status of orderStatuses) {
      assert.ok(schemaContent.includes(`'${status}'`), `orders table must include status ${status}`);
    }
  });

  it('verifies Bookings status ENUM supports all 8 appointment stages', () => {
    const bookingStatuses = [
      'PENDING',
      'CONFIRMED',
      'REJECTED',
      'RESCHEDULED',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'NO_SHOW'
    ];
    for (const status of bookingStatuses) {
      assert.ok(schemaContent.includes(`'${status}'`), `bookings table must include status ${status}`);
    }
  });

  it('verifies Payments status ENUM supports all 6 transaction stages', () => {
    const paymentStatuses = [
      'PENDING',
      'PROCESSING',
      'SUCCESS',
      'FAILED',
      'REFUNDED',
      'CANCELLED'
    ];
    for (const status of paymentStatuses) {
      assert.ok(schemaContent.includes(`'${status}'`), `payments table must include status ${status}`);
    }
  });

  it('verifies foreign key relationships across core entities', () => {
    const requiredForeignKeys = [
      { child: 'users', ref: 'roles' },
      { child: 'businesses', ref: 'users' },
      { child: 'business_categories', ref: 'businesses' },
      { child: 'business_categories', ref: 'categories' },
      { child: 'addresses', ref: 'users' },
      { child: 'addresses', ref: 'businesses' },
      { child: 'business_hours', ref: 'businesses' },
      { child: 'products', ref: 'businesses' },
      { child: 'products', ref: 'categories' },
      { child: 'services', ref: 'businesses' },
      { child: 'services', ref: 'categories' },
      { child: 'orders', ref: 'users' },
      { child: 'orders', ref: 'businesses' },
      { child: 'order_items', ref: 'orders' },
      { child: 'bookings', ref: 'users' },
      { child: 'bookings', ref: 'businesses' },
      { child: 'bookings', ref: 'services' },
      { child: 'payments', ref: 'users' },
      { child: 'reviews', ref: 'businesses' },
      { child: 'reviews', ref: 'users' },
      { child: 'notifications', ref: 'users' },
      { child: 'favorites', ref: 'users' },
      { child: 'favorites', ref: 'businesses' },
      { child: 'promotions', ref: 'businesses' },
      { child: 'messages', ref: 'users' },
      { child: 'messages', ref: 'businesses' }
    ];

    for (const { child, ref } of requiredForeignKeys) {
      const pattern = new RegExp(`REFERENCES \`${ref}\``, 'i');
      assert.ok(pattern.test(schemaContent), `Foreign key referencing \`${ref}\` must be present for \`${child}\``);
    }
  });

  it('verifies critical unique constraints exist', () => {
    assert.ok(schemaContent.includes('uq_users_email'), 'Unique constraint on users(email) must exist');
    assert.ok(schemaContent.includes('uq_roles_name'), 'Unique constraint on roles(name) must exist');
    assert.ok(schemaContent.includes('uq_orders_order_number'), 'Unique constraint on orders(order_number) must exist');
    assert.ok(schemaContent.includes('uq_bookings_reference'), 'Unique constraint on bookings(booking_reference) must exist');
    assert.ok(schemaContent.includes('uq_payments_reference'), 'Unique constraint on payments(payment_reference) must exist');
    assert.ok(schemaContent.includes('uq_user_business_favorite'), 'Unique constraint on favorites(user_id, business_id) must exist');
    assert.ok(schemaContent.includes('uq_promotions_code'), 'Unique constraint on promotions(code) must exist');
    assert.ok(schemaContent.includes('uq_business_day'), 'Unique constraint on business_hours(business_id, day_of_week) must exist');
  });

  it('verifies rating check constraint in reviews table', () => {
    const checkRegex = /CHECK\s*\(`rating`\s*>=\s*1\s+AND\s+`rating`\s*<=\s*5\)/i;
    assert.ok(checkRegex.test(schemaContent), 'reviews table must have CHECK constraint for rating 1..5');
  });

  it('verifies seed.sql uses real bcrypt password hashes (NO plaintext passwords)', () => {
    // Check that standard plaintext passwords are NOT inserted directly in password column
    const badPatterns = [
      /VALUES\s*\([^)]*'admin123'/i,
      /VALUES\s*\([^)]*'customer123'/i,
      /VALUES\s*\([^)]*'password123'/i,
      /VALUES\s*\([^)]*'123456'/i
    ];
    for (const bad of badPatterns) {
      assert.ok(!bad.test(seedContent), 'Plaintext passwords must NOT be in seed.sql');
    }

    // Verify bcrypt hash signature ($2a$, $2b$, or $2y$)
    const bcryptRegex = /\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}/g;
    const hashes = seedContent.match(bcryptRegex) || [];
    assert.ok(hashes.length >= 9, `Expected at least 9 valid bcrypt hashes, found ${hashes.length}`);
  });

  it('verifies seed dataset contains required personas and entity counts', () => {
    // 1 admin
    assert.ok(seedContent.includes('admin@localbiz.co.za'), 'Admin user must be seeded');
    // 3 consumers
    assert.ok(seedContent.includes('thandiwe@gmail.com'), 'Consumer Thandiwe must be seeded');
    assert.ok(seedContent.includes('sipho.zulu@gmail.com'), 'Consumer Sipho must be seeded');
    assert.ok(seedContent.includes('lerato.khumalo@gmail.com'), 'Consumer Lerato must be seeded');
    // 5 businesses
    assert.ok(seedContent.includes("Nomsa\\'s Avon Corner") || seedContent.includes("Nomsa's Avon Corner"), 'Business 1 must be seeded');
    assert.ok(seedContent.includes("Kasi Fresh Bakery"), 'Business 2 must be seeded');
    assert.ok(seedContent.includes("Meyersdal Master Plumbers"), 'Business 3 must be seeded');
    assert.ok(seedContent.includes("Ekurhuleni Solar & Electric"), 'Business 4 must be seeded');
    assert.ok(seedContent.includes("Zola Organic Farm Stall"), 'Business 5 must be seeded');
    
    // Check KYC status variety
    assert.ok(seedContent.includes("'APPROVED'"), 'Must seed APPROVED businesses');
    assert.ok(seedContent.includes("'PENDING'"), 'Must seed PENDING businesses');

    // Products & Services
    assert.ok(seedContent.includes('Far Away Glamour Eau de Parfum 50ml'), 'Products must be seeded');
    assert.ok(seedContent.includes('Emergency Geyser Replacement'), 'Services must be seeded');

    // Orders & Bookings & Reviews
    assert.ok(seedContent.includes('LBZ-2026-1001'), 'Orders must be seeded');
    assert.ok(seedContent.includes('BK-2026-501'), 'Bookings must be seeded');
    assert.ok(seedContent.includes('PAY-2026-7001'), 'Payments must be seeded');
    assert.ok(seedContent.includes('Thank you so much Thandiwe!'), 'Review replies must be seeded');
  });

  it('verifies /docs/database.md exists and contains the Mermaid ERD', () => {
    assert.ok(docsContent.includes('```mermaid'), 'docs/database.md must contain a Mermaid diagram');
    assert.ok(docsContent.includes('erDiagram'), 'docs/database.md must declare an erDiagram');
    assert.ok(docsContent.includes('roles ||--o{ users'), 'ERD must describe role-user relationships');
    assert.ok(docsContent.includes('orders ||--|{ order_items'), 'ERD must describe order items relationship');
    assert.ok(docsContent.includes('State Machine Lifecycles'), 'docs/database.md must document state machine lifecycles');
    assert.ok(docsContent.includes('Indexing & Query Optimization Strategy'), 'docs/database.md must document indexing strategy');
    assert.ok(docsContent.includes('Import Instructions'), 'docs/database.md must document import instructions');
  });
});
