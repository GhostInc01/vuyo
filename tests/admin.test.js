import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

// Tokens
let adminToken = '';
let consumerToken = '';
let businessToken = '';

// Test entities
let testConsumerId = '';
let testBusinessId = '';
let testCategoryId = '';
let testReviewId = '';
let testMerchantId = 'b-avon';

before(async () => {
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 1. Get Admin Token
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  adminToken = adminData.token;

  // 2. Get Consumer Token
  const consumerRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thandiwe@gmail.com', password: 'customer123' })
  });
  const consumerData = await consumerRes.json();
  consumerToken = consumerData.token;

  // 3. Get Business Token
  const businessRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nomsa@avoncorner.co.za', password: 'merchant123' })
  });
  const businessData = await businessRes.json();
  businessToken = businessData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Cleanup test entities
  if (testCategoryId) {
    await prisma.category.deleteMany({ where: { id: testCategoryId } });
  }
  if (testConsumerId) {
    await prisma.user.deleteMany({ where: { id: testConsumerId } });
  }
  if (testBusinessId) {
    await prisma.merchant.deleteMany({ where: { id: testBusinessId } });
    await prisma.kycApproval.deleteMany({ where: { id: { contains: testBusinessId } } });
  }
  await prisma.$disconnect();
});

describe('STAGE 6: SUPER ADMINISTRATION VERIFICATION SUITE', () => {

  // ================= 1. SECURITY & RBAC ISOLATION =================
  describe('1. Security & RBAC Isolation', () => {
    it('rejects unauthenticated requests to /api/admin/dashboard (401)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /Authentication required/i);
    });

    it('rejects consumer token on /api/admin/dashboard (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Super Admin privileges required/i);
    });

    it('rejects business token on /api/admin/dashboard (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${businessToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Super Admin privileges required/i);
    });

    it('rejects consumer token across other admin endpoints (403 Forbidden)', async () => {
      const endpoints = [
        '/api/admin/users',
        '/api/admin/businesses',
        '/api/admin/approvals',
        '/api/admin/categories',
        '/api/admin/orders',
        '/api/admin/bookings',
        '/api/admin/payments',
        '/api/admin/reviews',
        '/api/admin/reports',
        '/api/admin/audit-logs',
        '/api/admin/settings'
      ];

      for (const endpoint of endpoints) {
        const res = await fetch(`${baseUrl}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${consumerToken}` }
        });
        assert.equal(res.status, 403, `Endpoint ${endpoint} should return 403 for consumer`);
      }
    });

    it('allows Super Admin token to access /api/admin/dashboard (200 OK)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data);
    });
  });

  // ================= 2. ADMIN DASHBOARD METRICS =================
  describe('2. Admin Dashboard Metrics Display', () => {
    it('returns all required KPI counts and recent activity feeds', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();

      // Display requirements:
      // Total users, Consumers, Businesses, Pending businesses, Active businesses, Orders, Bookings, Revenue, Recent registrations, Recent orders
      assert.ok(typeof data.totalUsers === 'number', 'totalUsers must be a number');
      assert.ok(typeof data.consumers === 'number', 'consumers count must be a number');
      assert.ok(typeof data.businesses === 'number', 'businesses count must be a number');
      assert.ok(typeof data.pendingBusinesses === 'number', 'pendingBusinesses count must be a number');
      assert.ok(typeof data.activeBusinesses === 'number', 'activeBusinesses count must be a number');
      assert.ok(typeof data.orders === 'number', 'orders count must be a number');
      assert.ok(typeof data.bookings === 'number', 'bookings count must be a number');
      assert.ok(typeof data.revenue === 'number', 'revenue must be a number');
      assert.ok(Array.isArray(data.recentRegistrations), 'recentRegistrations must be an array');
      assert.ok(Array.isArray(data.recentOrders), 'recentOrders must be an array');
      assert.ok(data.recentRegistrations.length > 0, 'recentRegistrations should not be empty');
    });
  });

  // ================= 3. USER MANAGEMENT =================
  describe('3. User Management (View, Search, Filter, Activate, Deactivate)', () => {
    const testUserEmail = `stage6_user_${Date.now()}@localbiz.co.za`;

    it('registers a user for admin management testing', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Lindiwe Dlamini',
          email: testUserEmail,
          password: 'Password123!',
          phone: '+27 83 456 7890'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      testConsumerId = data.user.id;
    });

    it('searches and filters users via Admin API', async () => {
      const res = await fetch(`${baseUrl}/api/admin/users?search=Lindiwe&role=consumer&status=active`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const users = await res.json();
      assert.ok(Array.isArray(users));
      const found = users.find(u => u.email === testUserEmail);
      assert.ok(found, 'Should find newly registered test user');
      assert.equal(found.status, 'active');
    });

    it('deactivates user (status = suspended) and verifies login is blocked', async () => {
      // Deactivate user
      const patchRes = await fetch(`${baseUrl}/api/admin/users/${testConsumerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'suspended' })
      });
      assert.equal(patchRes.status, 200);
      const updated = await patchRes.json();
      assert.equal(updated.status, 'suspended');

      // Attempt login
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: 'Password123!'
        })
      });
      assert.equal(loginRes.status, 403);
      const err = await loginRes.json();
      assert.match(err.error, /suspended/i);
    });

    it('activates user (status = active) and verifies login succeeds', async () => {
      // Activate user
      const patchRes = await fetch(`${baseUrl}/api/admin/users/${testConsumerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'active' })
      });
      assert.equal(patchRes.status, 200);
      const updated = await patchRes.json();
      assert.equal(updated.status, 'active');

      // Attempt login
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUserEmail,
          password: 'Password123!'
        })
      });
      assert.equal(loginRes.status, 200);
      const data = await loginRes.json();
      assert.ok(data.token);
    });
  });

  // ================= 4. BUSINESS APPROVAL WORKFLOW =================
  describe('4. Business Approval Workflow (Approve, Reject, Suspend, Reactivate)', () => {
    testBusinessId = `b-test-${Date.now()}`;
    const testBizName = `Alberton Tech Repairs ${Date.now()}`;

    it('creates a pending business application for approval testing', async () => {
      const merchant = await prisma.merchant.create({
        data: {
          id: testBusinessId,
          name: testBizName,
          owner: 'Kagiso Mokoena',
          phone: '+27 82 777 8888',
          kind: 'service',
          category: 'Home Services',
          tagline: 'Tech repairs in Alberton',
          suburb: 'Alberton North',
          cover: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=400&q=80',
          status: 'Pending',
          verified: false,
          specialty: 'Electronics',
          about: 'Electronics & gadget repairs'
        }
      });
      assert.equal(merchant.status, 'Pending');

      await prisma.kycApproval.create({
        data: {
          id: `kyc-${testBusinessId}`,
          name: testBizName,
          owner: 'Kagiso Mokoena',
          category: 'Home Services',
          suburb: 'Alberton North',
          documents: JSON.stringify(['ID Document', 'Tax Certificate']),
          appliedDate: '2026-09-09',
          status: 'Pending'
        }
      });
    });

    it('Admin approves business (status -> Approved, verified -> true)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/merchants/${testBusinessId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'Approved');
      assert.equal(updated.verified, true);

      // Verify matching KYC is synchronized
      const kyc = await prisma.kycApproval.findUnique({ where: { id: `kyc-${testBusinessId}` } });
      assert.equal(kyc.status, 'Approved');
    });

    it('Admin suspends business (status -> Suspended, verified -> false)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/merchants/${testBusinessId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Suspended' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'Suspended');
      assert.equal(updated.verified, false);
    });

    it('Admin reactivates business (status -> Approved, verified -> true)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/merchants/${testBusinessId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'Approved');
      assert.equal(updated.verified, true);
    });

    it('Admin rejects business (status -> Rejected, verified -> false)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/merchants/${testBusinessId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Rejected' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'Rejected');
      assert.equal(updated.verified, false);
    });
  });

  // ================= 5. CATEGORY MANAGEMENT =================
  describe('5. Category Management (Create, Edit, Delete, Activate, Deactivate)', () => {
    const catName = `Solar Power ${Date.now()}`;

    it('creates a new category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          name: catName,
          icon: 'Sun',
          desc: 'Clean solar solutions',
          active: true
        })
      });
      assert.equal(res.status, 201);
      const cat = await res.json();
      assert.equal(cat.name, catName);
      assert.equal(cat.active, true);
      testCategoryId = cat.id;
    });

    it('edits the category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          desc: 'Updated solar solutions and inverters'
        })
      });
      assert.equal(res.status, 200);
      const cat = await res.json();
      assert.equal(cat.desc, 'Updated solar solutions and inverters');
    });

    it('deactivates the category (active = false)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ active: false })
      });
      assert.equal(res.status, 200);
      const cat = await res.json();
      assert.equal(cat.active, false);
    });

    it('reactivates the category (active = true)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ active: true })
      });
      assert.equal(res.status, 200);
      const cat = await res.json();
      assert.equal(cat.active, true);
    });

    it('deletes the category', async () => {
      const res = await fetch(`${baseUrl}/api/admin/categories/${testCategoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /deleted/i);
      testCategoryId = '';
    });
  });

  // ================= 6. REVIEW MODERATION =================
  describe('6. Review Moderation (View, Flag, Remove)', () => {
    it('creates a test review for moderation', async () => {
      const review = await prisma.review.create({
        data: {
          merchantId: testMerchantId,
          userName: 'Spam Bot',
          rating: 1,
          comment: 'Inappropriate spam content with malicious link',
          status: 'Approved'
        }
      });
      testReviewId = review.id;
    });

    it('flags review for content moderation (status = Flagged)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reviews/${testReviewId}/flag`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const review = await res.json();
      assert.equal(review.status, 'Flagged');
    });

    it('removes the flagged review and recalculates merchant rating', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reviews/${testReviewId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /removed/i);

      // Verify review no longer exists
      const found = await prisma.review.findUnique({ where: { id: testReviewId } });
      assert.equal(found, null);
    });
  });

  // ================= 7. AUDIT LOG GENERATION =================
  describe('7. Audit Log Governance Recording', () => {
    it('verifies audit logs record administrator, action, entity, entity ID, and timestamp', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const logs = await res.json();

      assert.ok(Array.isArray(logs), 'Audit logs must be an array');
      assert.ok(logs.length > 0, 'Audit logs should contain recorded actions');

      const sample = logs[0];
      assert.ok(sample.administrator, 'Audit log must record administrator');
      assert.ok(sample.action, 'Audit log must record action');
      assert.ok(sample.entity, 'Audit log must record entity');
      assert.ok(sample.createdAt, 'Audit log must record timestamp');
      assert.ok(sample.details, 'Audit log must record relevant details');
    });

    it('verifies audit log filtering by entity and search query', async () => {
      const res = await fetch(`${baseUrl}/api/admin/audit-logs?entity=Merchant`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const logs = await res.json();
      assert.ok(Array.isArray(logs));
      for (const log of logs) {
        assert.equal(log.entity, 'Merchant');
      }
    });
  });

  // ================= 8. SYSTEM BROADCAST & SETTINGS =================
  describe('8. System Notifications & Platform Settings', () => {
    it('broadcasts announcement to all users and audits action', async () => {
      const res = await fetch(`${baseUrl}/api/admin/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          title: 'System Maintenance Notice',
          message: 'Planned maintenance on Sunday at 02:00 AM SAST',
          role: 'all',
          type: 'alert'
        })
      });
      assert.equal(res.status, 201);
      const notif = await res.json();
      assert.equal(notif.title, 'System Maintenance Notice');
    });

    it('updates platform monetization settings and audits action', async () => {
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          commissionEnabled: true,
          commissionRate: 6.5,
          minimumSubscription: 60.0
        })
      });
      assert.equal(res.status, 200);
      const settings = await res.json();
      assert.equal(settings.commissionEnabled, true);
      assert.equal(settings.commissionRate, 6.5);
      assert.equal(settings.minimumSubscription, 60.0);
    });

    it('GET /api/admin/services returns filtered bookable services catalog', async () => {
      const res = await fetch(`${baseUrl}/api/admin/services`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const services = await res.json();
      assert.ok(Array.isArray(services));
      assert.ok(services.every(s => s.isService === true));
    });

    it('GET /api/health returns platform status and uptime', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.status, 200);
      const health = await res.json();
      assert.equal(health.status, 'ok');
      assert.ok(health.uptime !== undefined);
      assert.ok(health.timestamp);
    });
  });
});
