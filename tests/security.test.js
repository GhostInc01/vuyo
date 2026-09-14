import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const consumerAEmail = `sec_consumer_a_${timestamp}@test.co.za`;
const consumerBEmail = `sec_consumer_b_${timestamp}@test.co.za`;
const bizAEmail = `sec_biz_a_${timestamp}@test.co.za`;
const bizBEmail = `sec_biz_b_${timestamp}@test.co.za`;
const adminEmail = `sec_admin_${timestamp}@test.co.za`;
const password = 'StrongPassword123!';

let consumerAToken = '';
let consumerAUser = null;

let consumerBToken = '';
let consumerBUser = null;

let bizAToken = '';
let bizAUser = null;
let bizAMerchant = null;

let bizBToken = '';
let bizBUser = null;
let bizBMerchant = null;

let adminToken = '';
let adminUser = null;

let orderA = null;
let bookingA = null;
let productA = null;
let promoA = null;
let conversationA = null;
let notifA = null;

before(async () => {
  // 1. Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 2. Setup Super Admin
  const adminHashed = await bcrypt.hash(password, 10);
  adminUser = await prisma.user.create({
    data: {
      id: `u-sec-admin-${timestamp}`,
      email: adminEmail,
      name: 'Super Admin Auditor',
      password: adminHashed,
      role: 'admin',
      status: 'active'
    }
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password })
  });
  const adminData = await adminLogin.json();
  adminToken = adminData.token;

  // 3. Setup Consumer A
  const cARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Alice',
      email: consumerAEmail,
      phone: '+27 82 111 0001',
      password,
      role: 'consumer'
    })
  });
  const cAData = await cARes.json();
  consumerAToken = cAData.token;
  consumerAUser = cAData.user;

  // 4. Setup Consumer B
  const cBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Bob',
      email: consumerBEmail,
      phone: '+27 82 222 0002',
      password,
      role: 'consumer'
    })
  });
  const cBData = await cBRes.json();
  consumerBToken = cBData.token;
  consumerBUser = cBData.user;

  // 5. Setup Business A
  const bARes = await fetch(`${baseUrl}/api/auth/register-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alpha Owner',
      email: bizAEmail,
      phone: '+27 82 333 0003',
      businessName: `Alpha Store ${timestamp}`,
      password
    })
  });
  const bAData = await bARes.json();
  bizAToken = bAData.token;
  bizAUser = bAData.user;
  bizAMerchant = bAData.business;

  // 6. Setup Business B
  const bBRes = await fetch(`${baseUrl}/api/auth/register-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Beta Owner',
      email: bizBEmail,
      phone: '+27 82 444 0004',
      businessName: `Beta Store ${timestamp}`,
      password
    })
  });
  const bBData = await bBRes.json();
  bizBToken = bBData.token;
  bizBUser = bBData.user;
  bizBMerchant = bBData.business;

  // 7. Create Product under Business A
  const prodRes = await fetch(`${baseUrl}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bizAToken}`
    },
    body: JSON.stringify({
      name: 'Alpha Security Widget',
      price: 150,
      category: 'Electronics',
      stockCount: 25
    })
  });
  productA = await prodRes.json();

  // 8. Create Order for Consumer A at Business A
  const ordRes = await fetch(`${baseUrl}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${consumerAToken}`
    },
    body: JSON.stringify({
      merchantId: bizAMerchant.id,
      businessName: bizAMerchant.name,
      customer: consumerAUser.name,
      phone: consumerAUser.phone,
      deliveryType: 'Delivery',
      lines: [{ productId: productA.id, name: productA.name, price: productA.price, qty: 1 }]
    })
  });
  orderA = await ordRes.json();

  // 9. Create Booking for Consumer A at Business A
  const bkgRes = await fetch(`${baseUrl}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${consumerAToken}`
    },
    body: JSON.stringify({
      merchantId: bizAMerchant.id,
      serviceId: productA.id,
      serviceName: 'Security Consultation',
      date: '2026-11-20',
      timeSlot: '10:00',
      servicePrice: 350,
      customerName: consumerAUser.name,
      phone: consumerAUser.phone
    })
  });
  bookingA = await bkgRes.json();

  // 10. Create Promotion for Business A
  const promoRes = await fetch(`${baseUrl}/api/business/promotions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${bizAToken}`
    },
    body: JSON.stringify({
      name: 'Alpha VIP Promo',
      code: `VIP${timestamp}`,
      discountType: 'percentage',
      discountValue: 15,
      startDate: '2026-01-01',
      endDate: '2026-12-31',
      usageLimit: 50,
      status: 'active'
    })
  });
  promoA = await promoRes.json();

  // 11. Create Conversation between Consumer A and Business A
  const convRes = await fetch(`${baseUrl}/api/conversations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${consumerAToken}`
    },
    body: JSON.stringify({
      merchantId: bizAMerchant.id,
      message: 'Private message regarding order'
    })
  });
  conversationA = await convRes.json();

  // 12. Create Private Notification for Consumer A
  notifA = await prisma.notification.create({
    data: {
      userId: consumerAUser.id,
      title: 'Private Security Alert',
      message: 'Your account login security verified',
      type: 'security'
    }
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Stage 17 — Comprehensive Security & Penetration Testing Suite', () => {

  // -------------------------------------------------------------
  // 1. AUTHENTICATION & PASSWORD HARDENING
  // -------------------------------------------------------------
  describe('1. Authentication & Password Security', () => {
    it('rejects registration with short password < 6 chars (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Pass',
          email: `short_${Date.now()}@test.co.za`,
          password: '123'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /password.*6/i);
    });

    it('rejects registration with invalid email format (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Bad Email',
          email: 'not-an-email',
          password: 'ValidPassword123!'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /email/i);
    });

    it('rejects authentication with invalid password (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: consumerAEmail,
          password: 'WrongPassword999!'
        })
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /invalid email or password/i);
    });

    it('blocks login for suspended user accounts (403 Forbidden)', async () => {
      const suspendedUser = await prisma.user.create({
        data: {
          id: `u-suspended-${Date.now()}`,
          email: `suspended_${Date.now()}@test.co.za`,
          name: 'Suspended Persona',
          password: await bcrypt.hash('Password123!', 10),
          role: 'consumer',
          status: 'suspended'
        }
      });

      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suspendedUser.email,
          password: 'Password123!'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /suspended|deactivated/i);
    });

    it('sanitizes user object: never leaks password or hash in login response', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: consumerAEmail, password })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.user.password, undefined);
      assert.equal(data.user.password_hash, undefined);
      assert.equal(data.user.hash, undefined);
    });

    it('rate limits excessive authentication attempts (429 Too Many Requests)', async () => {
      // Trigger the rate limiter endpoint configured with threshold 5
      let rateLimited = false;
      for (let i = 0; i < 7; i++) {
        const res = await fetch(`${baseUrl}/api/test/rate-limit`);
        if (res.status === 429) {
          rateLimited = true;
          const data = await res.json();
          assert.match(data.error, /Too many/i);
          assert.ok(res.headers.get('X-RateLimit-Limit'));
          break;
        }
      }
      assert.equal(rateLimited, true, 'Rate limiter must return 429 once request threshold is exceeded');
    });
  });

  // -------------------------------------------------------------
  // 2. UNRESTRICTED ENDPOINTS & UNAUTHENTICATED DATA LEAKS
  // -------------------------------------------------------------
  describe('2. Unauthenticated Access Protection (401 Unauthorized)', () => {
    it('rejects unauthenticated GET /api/orders (401)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    it('rejects unauthenticated GET /api/orders/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/orders/:id/status (401)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DELIVERED' })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated GET /api/bookings (401)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated GET /api/bookings/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/bookings/:id/status (401)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated GET /api/merchants/:id/analytics (401)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/analytics`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/merchants/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacked Merchant' })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated POST /api/products (401)', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rogue Product', price: 99 })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/products/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${productA.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: 1 })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated DELETE /api/products/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${productA.id}`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated POST /api/promotions (401)', async () => {
      const res = await fetch(`${baseUrl}/api/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: bizAMerchant.id, code: 'ROGUE', discountValue: 50 })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated DELETE /api/promotions/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/${promoA.id}`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated DELETE /api/notifications/:id (401)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notifA.id}`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/notifications/:id/read (401)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notifA.id}/read`, {
        method: 'PATCH'
      });
      assert.equal(res.status, 401);
    });
  });

  // -------------------------------------------------------------
  // 3. HORIZONTAL PRIVILEGE ESCALATION (CONSUMER A vs CONSUMER B)
  // -------------------------------------------------------------
  describe('3. Horizontal Privilege Escalation & IDOR (Consumer A vs Consumer B)', () => {
    it('prevents Consumer B from viewing Consumer A order details (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view your own orders/i);
    });

    it('ensures Consumer B order listing never includes Consumer A orders (Tenant Scoping)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.equal(list.some(o => o.id === orderA.id), false);
    });

    it('prevents Consumer B from cancelling or tampering with Consumer A order (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only manage your own orders/i);
    });

    it('prevents Consumer B from viewing Consumer A booking appointment (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view your own bookings/i);
    });

    it('ensures Consumer B booking listing never includes Consumer A bookings', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.equal(list.some(b => b.id === bookingA.id), false);
    });

    it('prevents Consumer B from modifying Consumer A booking (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only manage your own bookings/i);
    });

    it('prevents Consumer B from accessing Consumer A conversation thread (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${conversationA.id}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('prevents Consumer B from posting messages into Consumer A conversation (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${conversationA.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({ text: 'Injected message from Consumer B' })
      });
      assert.equal(res.status, 403);
    });

    it('prevents Consumer B from deleting Consumer A private notification (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notifA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only delete your own personal notifications/i);
    });

    it('prevents Consumer B from marking Consumer A private notification as read (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${notifA.id}/read`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /permission to mark this notification as read/i);
    });

    it('prevents Consumer B from querying Consumer A favourites via userId parameter (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?userId=${consumerAUser.id}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view your own favorites/i);
    });
  });

  // -------------------------------------------------------------
  // 4. CROSS-TENANT DATA ISOLATION (BUSINESS A vs BUSINESS B)
  // -------------------------------------------------------------
  describe('4. Cross-Tenant Data Isolation (Business A vs Business B)', () => {
    it('prevents Business B from viewing Business A order details (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view orders for your business/i);
    });

    it('prevents Business B from updating Business A order status (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot update another business's order/i);
    });

    it('prevents Business B from viewing Business A booking details (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view bookings for your business/i);
    });

    it('prevents Business B from updating Business A booking status (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot update another business's booking/i);
    });

    it('prevents Business B from modifying Business A product (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${productA.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({ price: 10 })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot modify another business's product/i);
    });

    it('prevents Business B from deleting Business A product (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/products/${productA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot delete another business's product/i);
    });

    it('prevents Business B from modifying Business A merchant profile (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({ tagline: 'Tampered by Competitor' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot modify another business's profile/i);
    });

    it('prevents Business B from accessing Business A analytics (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/analytics`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot view analytics for another business/i);
    });

    it('prevents Business B from deleting Business A promotion (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/${promoA.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /cannot delete another business's promotion/i);
    });

    it('prevents Business B from accessing Business A conversation thread (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${conversationA.id}`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });
  });

  // -------------------------------------------------------------
  // 5. VERTICAL PRIVILEGE ESCALATION (CONSUMER/BUSINESS vs ADMIN)
  // -------------------------------------------------------------
  describe('5. Vertical Privilege Escalation (Non-Admin vs Admin Endpoints)', () => {
    const adminEndpoints = [
      { method: 'GET', path: '/api/admin/dashboard' },
      { method: 'GET', path: '/api/admin/overview' },
      { method: 'GET', path: '/api/admin/users' },
      { method: 'GET', path: '/api/admin/businesses' },
      { method: 'GET', path: '/api/admin/approvals' },
      { method: 'GET', path: '/api/admin/categories' },
      { method: 'GET', path: '/api/admin/audit-logs' },
      { method: 'GET', path: '/api/admin/reports' },
      { method: 'GET', path: '/api/admin/settings' }
    ];

    for (const ep of adminEndpoints) {
      it(`blocks Consumer from calling ${ep.path} (403 Forbidden)`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: { Authorization: `Bearer ${consumerAToken}` }
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.error, /Super Admin/i);
      });

      it(`blocks Business from calling ${ep.path} (403 Forbidden)`, async () => {
        const res = await fetch(`${baseUrl}${ep.path}`, {
          method: ep.method,
          headers: { Authorization: `Bearer ${bizAToken}` }
        });
        assert.equal(res.status, 403);
        const data = await res.json();
        assert.match(data.error, /Super Admin/i);
      });
    }

    it('blocks non-admin from modifying system categories via POST /api/categories (403)', async () => {
      const res = await fetch(`${baseUrl}/api/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ name: 'Hacker Category', icon: 'zap' })
      });
      assert.equal(res.status, 403);
    });

    it('blocks non-admin from deleting system categories via DELETE /api/categories/:id (403)', async () => {
      const res = await fetch(`${baseUrl}/api/categories/cat-services`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('blocks Business user from self-approving or setting verified: true on their store (Sanitization)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          status: 'Approved',
          verified: true,
          rating: 5.0,
          tagline: 'Self Elevation Test'
        })
      });
      assert.equal(res.status, 200);
      const merchant = await prisma.merchant.findUnique({ where: { id: bizAMerchant.id } });
      // Status and verified must NOT have changed from initial Pending / false
      assert.equal(merchant.status, 'Pending');
      assert.equal(merchant.verified, false);
      assert.equal(merchant.tagline, 'Self Elevation Test');
    });

    it('blocks Consumer from elevating their role to admin via PATCH /api/auth/profile (Sanitization)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          role: 'admin',
          merchantId: bizAMerchant.id,
          name: 'Alice Hacked'
        })
      });
      assert.equal(res.status, 200);
      const user = await prisma.user.findUnique({ where: { id: consumerAUser.id } });
      assert.equal(user.role, 'consumer', 'Role must remain consumer');
      assert.equal(user.merchantId, null, 'merchantId must remain null');
      assert.equal(user.name, 'Alice Hacked');
    });
  });

  // -------------------------------------------------------------
  // 6. IDENTITY SPOOFING & IMPERSONATION
  // -------------------------------------------------------------
  describe('6. Identity Spoofing & Impersonation Prevention', () => {
    it('prevents review creation with spoofed userId without auth (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: consumerAUser.id,
          userName: 'Spoofed Consumer Alice',
          rating: 5,
          comment: 'Injected fake review',
          orderId: orderA.id
        })
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    it('prevents Business user from creating a review for another business (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Business self/competitor review',
          orderId: orderA.id
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only consumer accounts/i);
    });

    it('prevents reviews on non-completed orders (400 Bad Request)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Review before delivery',
          orderId: orderA.id
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /completed/i);
    });
  });

  // -------------------------------------------------------------
  // 7. STATE MACHINE INTEGRITY & ILLEGAL TRANSITIONS
  // -------------------------------------------------------------
  describe('7. State Machine Integrity & Status Transitions', () => {
    it('rejects invalid order status transition directly from PENDING to COMPLETED (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Invalid status transition/i);
    });

    it('rejects Consumer advancing order to fulfillment states like ACCEPTED (403)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Consumers can only cancel pending orders/i);
    });

    it('rejects invalid booking status transition directly from CONFIRMED to PENDING (400)', async () => {
      // First confirm the booking
      await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });

      // Attempt to move back to PENDING
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'PENDING' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Invalid status transition/i);
    });

    it('rejects transition from terminal state CANCELLED to CONFIRMED (400)', async () => {
      // Cancel booking
      await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });

      // Attempt resurrection
      const res = await fetch(`${baseUrl}/api/bookings/${bookingA.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Invalid status transition/i);
    });
  });

  // -------------------------------------------------------------
  // 8. INJECTION & XSS DEFENSE-IN-DEPTH
  // -------------------------------------------------------------
  describe('8. Injection & XSS Attack Resistance', () => {
    it('safely neutralizes SQL injection attempts in search query parameters', async () => {
      const maliciousQueries = [
        `' OR '1'='1`,
        `'; DROP TABLE "User"; --`,
        `" UNION SELECT * FROM "User" --`,
        `admin'--`
      ];

      for (const q of maliciousQueries) {
        const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(q)}`);
        assert.equal(res.status, 200, `Query "${q}" should not crash server or leak internal database error`);
        const data = await res.json();
        assert.ok(data);
      }

      // Verify User table is intact
      const count = await prisma.user.count();
      assert.ok(count > 0, 'User table must remain unaffected by SQL injection payloads');
    });

    it('neutralizes XSS payloads in profile updates without script execution', async () => {
      const xssPayload = `<script>alert('XSS-PWNED')</script>`;
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ name: xssPayload })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, xssPayload); // Persisted as plain text string, not executable HTML
    });
  });

  // -------------------------------------------------------------
  // 9. SECURITY HEADERS & COMPLIANCE
  // -------------------------------------------------------------
  describe('9. Security Headers & PCI-DSS Compliance', () => {
    it('disables X-Powered-By header to prevent fingerprinting', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.headers.get('x-powered-by'), null);
    });

    it('sets standard defensive security headers', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.equal(res.headers.get('x-xss-protection'), '1; mode=block');
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    it('strictly satisfies PCI-DSS: strips raw PAN and CVV credentials from payments', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          orderId: orderA.id,
          merchantId: bizAMerchant.id,
          amount: 150,
          method: 'Credit Card',
          cardNumber: '4111 1111 1111 1111',
          cvv: '123',
          pin: '9999',
          metadata: { cardHolder: 'Alice', cvv: '123' }
        })
      });
      assert.equal(res.status, 201);
      const payment = await res.json();
      assert.equal(payment.cardNumber, undefined);
      assert.equal(payment.cvv, undefined);
      assert.equal(payment.pin, undefined);
      assert.equal(payment.metadata.cvv, undefined);
    });
  });

});
