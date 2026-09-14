import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const bizAEmail = `analytics_biz_a_${timestamp}@localbiz.co.za`;
const bizBEmail = `analytics_biz_b_${timestamp}@localbiz.co.za`;
const consumerEmail = `analytics_consumer_${timestamp}@localbiz.co.za`;
const adminEmail = `analytics_admin_${timestamp}@localbiz.co.za`;
const password = 'Password123!';

let bizAToken = '';
let bizAMerchantId = `biz-anal-a-${timestamp}`;
let bizBToken = '';
let bizBMerchantId = `biz-anal-b-${timestamp}`;
let consumerToken = '';
let adminToken = '';

let orderA1, orderA2, orderACancelled, orderB1;
let bookingA1, bookingA2, bookingB1;

before(async () => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 1. Register Business A
  const bizARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Owner',
      email: bizAEmail,
      phone: '+27 82 111 0001',
      password,
      role: 'business',
      businessName: `Analytics Boutique A ${timestamp}`,
      businessCategory: 'Cosmetics',
      businessDescription: 'Quality cosmetics and perfumes',
      address: 'Alberton North'
    })
  });
  const bizAData = await bizARes.json();
  bizAToken = bizAData.token;
  bizAMerchantId = bizAData.business.id;

  // 2. Register Business B
  const bizBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Bob Plumber',
      email: bizBEmail,
      phone: '+27 82 222 0002',
      password,
      role: 'business',
      businessName: `Analytics Hardware B ${timestamp}`,
      businessCategory: 'Plumbing',
      businessDescription: 'Certified plumbing service',
      address: 'Meyersdal'
    })
  });
  const bizBData = await bizBRes.json();
  bizBToken = bizBData.token;
  bizBMerchantId = bizBData.business.id;

  // 3. Register Consumer
  const conRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Charlie Consumer',
      email: consumerEmail,
      phone: '+27 82 333 0003',
      password,
      role: 'consumer'
    })
  });
  const conData = await conRes.json();
  consumerToken = conData.token;

  // 4. Login as Admin
  const admRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@localbiz.co.za',
      password: 'admin123'
    })
  });
  const admData = await admRes.json();
  adminToken = admData.token;

  // 5. Seed Orders for Merchant A:
  // Order A1: Total R300, 2 lines, Status: Completed
  orderA1 = await prisma.order.create({
    data: {
      id: `ORD-A1-${timestamp}`,
      merchantId: bizAMerchantId,
      businessName: `Analytics Boutique A ${timestamp}`,
      customer: 'Charlie Consumer',
      phone: '+27 82 333 0003',
      address: '10 Kingfisher Ave',
      placedAt: '2026-09-10',
      status: 'Completed',
      subtotal: 270,
      deliveryFee: 30,
      total: 300,
      createdAt: new Date('2026-09-10T10:00:00.000Z'),
      lines: {
        create: [
          { name: 'Red Lipstick Deluxe', qty: 2, price: 100 },
          { name: 'Moisture Face Wash', qty: 1, price: 70 }
        ]
      }
    }
  });

  // Order A2: Total R200, 1 line, Status: Delivered
  orderA2 = await prisma.order.create({
    data: {
      id: `ORD-A2-${timestamp}`,
      merchantId: bizAMerchantId,
      businessName: `Analytics Boutique A ${timestamp}`,
      customer: 'Dana Buyer',
      phone: '+27 82 444 0004',
      address: '22 Voortrekker Rd',
      placedAt: '2026-09-11',
      status: 'Delivered',
      subtotal: 200,
      total: 200,
      createdAt: new Date('2026-09-11T12:00:00.000Z'),
      lines: {
        create: [
          { name: 'Red Lipstick Deluxe', qty: 2, price: 100 }
        ]
      }
    }
  });

  // Order A Cancelled: Total R500 (Should NOT be included in revenue)
  orderACancelled = await prisma.order.create({
    data: {
      id: `ORD-A-CANCEL-${timestamp}`,
      merchantId: bizAMerchantId,
      businessName: `Analytics Boutique A ${timestamp}`,
      customer: 'Cancelled Order Guy',
      phone: '+27 82 555 0005',
      address: 'Nowhere',
      placedAt: '2026-09-11',
      status: 'Cancelled',
      subtotal: 500,
      total: 500,
      createdAt: new Date('2026-09-11T13:00:00.000Z'),
      lines: {
        create: [
          { name: 'Expensive Perfume', qty: 1, price: 500 }
        ]
      }
    }
  });

  // Order B1: Total R150 for Merchant B
  orderB1 = await prisma.order.create({
    data: {
      id: `ORD-B1-${timestamp}`,
      merchantId: bizBMerchantId,
      businessName: `Analytics Hardware B ${timestamp}`,
      customer: 'Frank Customer',
      phone: '+27 82 666 0006',
      address: '5 Pipe Lane',
      placedAt: '2026-09-11',
      status: 'Completed',
      subtotal: 150,
      total: 150,
      createdAt: new Date('2026-09-11T14:00:00.000Z'),
      lines: {
        create: [
          { name: 'Brass Valve Replacement', qty: 1, price: 150 }
        ]
      }
    }
  });

  // 6. Seed Bookings for Merchant A & B
  bookingA1 = await prisma.booking.create({
    data: {
      merchantId: bizAMerchantId,
      customerName: 'Charlie Consumer',
      phone: '+27 82 333 0003',
      serviceName: 'Makeup Consultation',
      servicePrice: 150,
      date: '2026-09-10',
      timeSlot: '11:00 AM',
      status: 'CONFIRMED',
      createdAt: new Date('2026-09-10T09:00:00.000Z')
    }
  });

  bookingA2 = await prisma.booking.create({
    data: {
      merchantId: bizAMerchantId,
      customerName: 'Grace Client',
      phone: '+27 82 777 0007',
      serviceName: 'Makeup Consultation',
      servicePrice: 150,
      date: '2026-09-11',
      timeSlot: '14:00 PM',
      status: 'COMPLETED',
      createdAt: new Date('2026-09-11T09:00:00.000Z')
    }
  });

  bookingB1 = await prisma.booking.create({
    data: {
      merchantId: bizBMerchantId,
      customerName: 'Bob Resident',
      phone: '+27 82 888 0008',
      serviceName: 'Geyser Flush',
      servicePrice: 400,
      date: '2026-09-11',
      timeSlot: '10:00 AM',
      status: 'CONFIRMED',
      createdAt: new Date('2026-09-11T08:00:00.000Z')
    }
  });
});

after(async () => {
  if (server) await new Promise((res) => server.close(res));
});

describe('Stage 16 — Reporting & Analytics Verification Suite', () => {

  // -------------------------------------------------------------
  // 1. Authentication & Multi-Tenant Authorization Guardrails
  // -------------------------------------------------------------
  describe('1. Authentication & Security Guardrails', () => {
    it('rejects unauthenticated request to /api/business/analytics with 401', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics`);
      assert.equal(res.status, 401);
      const body = await res.json();
      assert.match(body.error, /authentication required/i);
    });

    it('rejects consumer user from accessing /api/business/analytics with 403 Forbidden', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics`, {
        headers: { Authorization: `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('prevents Merchant A from accessing Merchant B analytics by query param (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?merchantId=${bizBMerchantId}`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 403);
      const body = await res.json();
      assert.match(body.error, /cannot access analytics of another business/i);
    });

    it('rejects consumer and merchant from accessing /api/admin/analytics with 403 Forbidden', async () => {
      const res1 = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${consumerToken}` }
      });
      assert.equal(res1.status, 403);

      const res2 = await fetch(`${baseUrl}/api/admin/analytics`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res2.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 2. Business Analytics Aggregation & Precision
  // -------------------------------------------------------------
  describe('2. Business Analytics Aggregation & Precision', () => {
    it('calculates exact order revenue, bookings revenue, and total revenue excluding cancelled orders', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      // Expected for Merchant A:
      // Orders: A1 (300) + A2 (200) = 500 (Cancelled order 500 must be excluded)
      // Bookings: A1 (150) + A2 (150) = 300
      // Total Revenue: 500 + 300 = 800
      assert.equal(data.summary.orderRevenue, 500);
      assert.equal(data.summary.serviceRevenue, 300);
      assert.equal(data.summary.revenue, 800);
      assert.equal(data.summary.ordersCount, 2);
      assert.equal(data.summary.bookingsCount, 2);
    });

    it('calculates exact Average Order Value (AOV) = orderRevenue / ordersCount', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      // AOV = 500 / 2 = 250
      assert.equal(data.summary.averageOrderValue, 250);
    });

    it('aggregates unique customers accurately across orders and bookings', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      // Customers for Merchant A:
      // Order A1: Charlie Consumer
      // Order A2: Dana Buyer
      // Booking A1: Charlie Consumer (Duplicate, should count once)
      // Booking A2: Grace Client
      // Total distinct customers = 3
      assert.equal(data.summary.customersCount, 3);
    });

    it('returns top products ranked by units sold and revenue', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.topProducts));
      assert.ok(data.topProducts.length >= 2);

      // Red Lipstick Deluxe was in both A1 (qty 2) and A2 (qty 2) = 4 units sold
      const lipstick = data.topProducts.find(p => p.name === 'Red Lipstick Deluxe');
      assert.ok(lipstick);
      assert.equal(lipstick.unitsSold, 4);
      assert.equal(lipstick.revenue, 400);

      // Moisture Face Wash in A1 (qty 1) = 1 unit sold
      const wash = data.topProducts.find(p => p.name === 'Moisture Face Wash');
      assert.ok(wash);
      assert.equal(wash.unitsSold, 1);
      assert.equal(wash.revenue, 70);

      // Top product rank 1 should be the one with higher units sold
      assert.equal(data.topProducts[0].name, 'Red Lipstick Deluxe');
    });

    it('returns top services ranked by bookings count and revenue', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.topServices));
      assert.ok(data.topServices.length >= 1);

      const makeup = data.topServices.find(s => s.name === 'Makeup Consultation');
      assert.ok(makeup);
      assert.equal(makeup.bookingsCount, 2);
      assert.equal(makeup.revenue, 300);
    });

    it('returns daily, weekly, monthly, and annual sales breakdowns', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.salesBreakdown);
      assert.ok(Array.isArray(data.salesBreakdown.daily));
      assert.ok(Array.isArray(data.salesBreakdown.weekly));
      assert.ok(Array.isArray(data.salesBreakdown.monthly));
      assert.ok(Array.isArray(data.salesBreakdown.annual));

      // 2026-09-10: Order A1 (300)
      const day10 = data.salesBreakdown.daily.find(d => d.date === '2026-09-10');
      assert.ok(day10);
      assert.equal(day10.revenue, 300);
      assert.equal(day10.orders, 1);

      // 2026-09-11: Order A2 (200)
      const day11 = data.salesBreakdown.daily.find(d => d.date === '2026-09-11');
      assert.ok(day11);
      assert.equal(day11.revenue, 200);
      assert.equal(day11.orders, 1);
    });
  });

  // -------------------------------------------------------------
  // 3. Date Filtering Engine
  // -------------------------------------------------------------
  describe('3. Date Filtering Engine', () => {
    it('filters metrics by custom date range: includes only orders in range', async () => {
      // Filter for 2026-09-10 only
      const res = await fetch(`${baseUrl}/api/business/analytics?period=custom&startDate=2026-09-10&endDate=2026-09-10`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.summary.orderRevenue, 300);
      assert.equal(data.summary.ordersCount, 1);
    });

    it('filters metrics by custom date range: excludes orders before startDate', async () => {
      // Filter for 2026-09-11 only (order A1 on 2026-09-10 should be excluded)
      const res = await fetch(`${baseUrl}/api/business/analytics?period=custom&startDate=2026-09-11&endDate=2026-09-11`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.summary.orderRevenue, 200);
      assert.equal(data.summary.ordersCount, 1);
    });

    it('returns zero revenue and orders when date range has no activity', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=custom&startDate=2025-01-01&endDate=2025-01-02`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.summary.orderRevenue, 0);
      assert.equal(data.summary.ordersCount, 0);
      assert.equal(data.summary.averageOrderValue, 0);
    });

    it('supports standard presets: today, 7d, 30d, month, year', async () => {
      const presets = ['today', '7d', '30d', 'month', 'year'];
      for (const preset of presets) {
        const res = await fetch(`${baseUrl}/api/business/analytics?period=${preset}`, {
          headers: { Authorization: `Bearer ${bizAToken}` }
        });
        assert.equal(res.status, 200, `Preset ${preset} failed`);
        const data = await res.json();
        assert.equal(data.period, preset);
        assert.ok(typeof data.summary.revenue === 'number');
      }
    });
  });

  // -------------------------------------------------------------
  // 4. Admin Platform Analytics & Growth Metrics
  // -------------------------------------------------------------
  describe('4. Super Admin Platform Analytics & Governance', () => {
    it('returns platform-wide metrics across all businesses and entities', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics?period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.summary);
      assert.ok(data.summary.totalRevenue > 0);
      assert.ok(data.summary.totalOrders > 0);
      assert.ok(data.summary.totalBookings > 0);
      assert.ok(data.summary.totalUsers > 0);
      assert.ok(data.summary.totalBusinesses > 0);
      assert.ok(data.summary.totalCategories > 0);
    });

    it('returns top performing businesses ranked by total gross revenue', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics?period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.topBusinesses));
      assert.ok(data.topBusinesses.length >= 2);

      // Verify businesses are strictly sorted descending by totalRevenue
      for (let i = 0; i < data.topBusinesses.length - 1; i++) {
        assert.ok(
          data.topBusinesses[i].totalRevenue >= data.topBusinesses[i + 1].totalRevenue,
          `Expected index ${i} (${data.topBusinesses[i].totalRevenue}) >= index ${i+1} (${data.topBusinesses[i+1].totalRevenue})`
        );
      }

      // Verify merchant ranking metrics structure
      const topBiz = data.topBusinesses[0];
      assert.equal(topBiz.rank, 1);
      assert.ok(topBiz.id);
      assert.ok(topBiz.name);
      assert.ok(topBiz.orderCount >= 1);
      assert.ok(topBiz.totalRevenue > 0);
      assert.ok(typeof topBiz.shareOfRevenue === 'number');
    });

    it('returns platform top products across all merchants', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics?period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.topProducts));
      assert.ok(data.topProducts.length >= 1);
      assert.ok(data.topProducts[0].unitsSold >= 1);
    });

    it('returns demographic breakdowns for users by role and businesses by category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics?period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.usersByRole);
      assert.ok(typeof data.usersByRole.consumer === 'number');
      assert.ok(typeof data.usersByRole.business === 'number');
      assert.ok(typeof data.usersByRole.admin === 'number');

      assert.ok(data.businessesByCategory);
      assert.ok(typeof data.businessesByCategory.Cosmetics === 'number');
      assert.ok(typeof data.businessesByCategory.Plumbing === 'number');
    });

    it('calculates platform growth metrics between periods', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics?period=30d`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.growth);
      assert.ok(typeof data.growth.revenueGrowthPercent === 'number');
      assert.ok(typeof data.growth.ordersGrowthPercent === 'number');
      assert.ok(typeof data.growth.bookingsGrowthPercent === 'number');
      assert.ok(typeof data.growth.usersGrowthPercent === 'number');
    });

    it('preserves backward compatibility for /api/admin/reports endpoint', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reports`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(typeof data.totalGmv === 'number');
      assert.ok(typeof data.totalOrders === 'number');
      assert.ok(typeof data.totalBookings === 'number');
      assert.ok(typeof data.totalUsers === 'number');
      assert.ok(typeof data.totalMerchants === 'number');
      assert.ok(Array.isArray(data.monthlyBreakdown));
      assert.ok(Array.isArray(data.topMerchants));
    });
  });

  // -------------------------------------------------------------
  // 5. Report Export Architecture (CSV & JSON)
  // -------------------------------------------------------------
  describe('5. Report Export Architecture', () => {
    it('exports business sales summary in valid CSV format with attachment headers', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics/export?type=sales-summary&format=csv&period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /text\/csv/i);
      assert.match(res.headers.get('content-disposition') || '', /attachment; filename="sales-summary-/i);

      const csv = await res.text();
      assert.ok(csv.includes('Period,Orders Count,Gross Revenue (ZAR),Avg Order Value (ZAR)'));
      assert.ok(csv.includes('2026-09-10'));
      assert.ok(csv.includes('2026-09-11'));
    });

    it('exports business top products report in CSV format', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics/export?type=top-products&format=csv&period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const csv = await res.text();
      assert.ok(csv.includes('Rank,Product ID,Product Name,Units Sold,Revenue (ZAR)'));
      assert.ok(csv.includes('Red Lipstick Deluxe'));
    });

    it('exports business itemized orders report in CSV format', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics/export?type=orders&format=csv&period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const csv = await res.text();
      assert.ok(csv.includes('Order ID,Date,Customer,Phone,Address,Status,Payment Method'));
      assert.ok(csv.includes(orderA1.id));
      assert.ok(csv.includes('Charlie Consumer'));
    });

    it('exports business sales summary in JSON format', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics/export?type=sales-summary&format=json&period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      assert.match(res.headers.get('content-type') || '', /application\/json/i);

      const json = await res.json();
      assert.equal(json.merchantId, bizAMerchantId);
      assert.ok(json.summary);
      assert.ok(json.salesBreakdown);
    });

    it('exports admin platform overview in CSV format', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics/export?type=platform-overview&format=csv&period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const csv = await res.text();
      assert.ok(csv.includes('Metric,Value'));
      assert.ok(csv.includes('Total Platform Revenue (ZAR)'));
      assert.ok(csv.includes('Total Orders'));
    });

    it('exports admin platform merchant rankings in CSV format', async () => {
      const res = await fetch(`${baseUrl}/api/admin/analytics/export?type=businesses&format=csv&period=all`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const csv = await res.text();
      assert.ok(csv.includes('Rank,Business ID,Business Name,Category,Suburb,Order Count,Total Revenue (ZAR),Platform Share (%)'));
      assert.ok(csv.includes(bizAMerchantId));
    });

    it('rejects unauthorized export attempts with 401 and 403', async () => {
      const unauthRes = await fetch(`${baseUrl}/api/business/analytics/export?type=sales-summary`);
      assert.equal(unauthRes.status, 401);

      const consumerExportRes = await fetch(`${baseUrl}/api/admin/analytics/export?type=platform-overview`, {
        headers: { Authorization: `Bearer ${consumerToken}` }
      });
      assert.equal(consumerExportRes.status, 403);
    });
  });

  // -------------------------------------------------------------
  // 6. Database Aggregation & Payload Efficiency Compliance
  // -------------------------------------------------------------
  describe('6. Database Aggregation & Payload Efficiency', () => {
    it('verifies analytics response contains summarized aggregations, not raw transaction dump', async () => {
      const res = await fetch(`${baseUrl}/api/business/analytics?period=all`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      // Ensure that raw order models with heavy lines/users/reviews are NOT returned in the main analytics payload
      assert.equal(data.orders, undefined);
      assert.equal(data.bookings, undefined);
      assert.ok(data.summary);
      assert.ok(data.topProducts.length <= 10);
      assert.ok(data.topServices.length <= 10);
    });
  });
});
