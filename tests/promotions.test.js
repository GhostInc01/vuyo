import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma, promotionService } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const consumerEmail = `promo-consumer-${timestamp}@test.co.za`;
const bizAEmail = `promo-biz-a-${timestamp}@test.co.za`;
const bizBEmail = `promo-biz-b-${timestamp}@test.co.za`;
const adminEmail = `promo-admin-${timestamp}@test.co.za`;
const defaultPassword = 'Password123!';

let consumerToken = '';
let consumerUser = null;

let bizAToken = '';
let bizAUser = null;
let merchantA = null;

let bizBToken = '';
let bizBUser = null;
let merchantB = null;

let adminToken = '';
let adminUser = null;

let testProductA = null;

before(async () => {
  // 1. Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 2. Register Consumer
  const cRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Thandiwe Consumer',
      email: consumerEmail,
      password: defaultPassword,
      role: 'consumer'
    })
  });
  const cData = await cRes.json();
  consumerToken = cData.token;
  consumerUser = cData.user;

  // 3. Register Business A
  const bARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sipho Baker',
      email: bizAEmail,
      password: defaultPassword,
      role: 'business',
      businessName: `Sipho Bakery ${timestamp}`,
      businessCategory: 'Food & Dining',
      address: '10 Main Road, Alberton'
    })
  });
  const bAData = await bARes.json();
  bizAToken = bAData.token;
  bizAUser = bAData.user;
  merchantA = bAData.business || bAData.merchant;

  // 4. Register Business B
  const bBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nandi Florist',
      email: bizBEmail,
      password: defaultPassword,
      role: 'business',
      businessName: `Nandi Flowers ${timestamp}`,
      businessCategory: 'Retail',
      address: '25 Voortrekker Ave, Alberton'
    })
  });
  const bBData = await bBRes.json();
  bizBToken = bBData.token;
  bizBUser = bBData.user;
  merchantB = bBData.business || bBData.merchant;

  // 5. Authenticate Admin (admin@localbiz.co.za / admin123)
  const aRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;

  // 6. Create a product for Merchant A
  testProductA = await prisma.product.create({
    data: {
      id: `prod-promo-${timestamp}`,
      merchantId: merchantA.id,
      name: `Artisan Sourdough ${timestamp}`,
      price: 100,
      stockCount: 50,
      inStock: true,
      category: 'Bakery',
      image: 'https://images.unsplash.com/bread.jpg',
      desc: 'Freshly baked artisan sourdough loaf'
    }
  });
});

after(async () => {
  // Cleanup test records
  try {
    if (testProductA) {
      await prisma.orderLine.deleteMany({ where: { productId: testProductA.id } }).catch(() => {});
      await prisma.product.delete({ where: { id: testProductA.id } }).catch(() => {});
    }
    await prisma.promotion.deleteMany({
      where: { merchantId: { in: [merchantA?.id, merchantB?.id].filter(Boolean) } }
    }).catch(() => {});
    await prisma.order.deleteMany({
      where: { merchantId: { in: [merchantA?.id, merchantB?.id].filter(Boolean) } }
    }).catch(() => {});
    await prisma.merchant.deleteMany({
      where: { id: { in: [merchantA?.id, merchantB?.id].filter(Boolean) } }
    }).catch(() => {});
    await prisma.user.deleteMany({
      where: { email: { in: [consumerEmail, bizAEmail, bizBEmail, adminEmail] } }
    }).catch(() => {});
  } catch (e) {
    // ignore
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Stage 15 — Business Promotions Test Suite', () => {
  let promoPercentId = null;
  let promoFixedId = null;
  let promoLimitedId = null;

  // -------------------------------------------------------------
  // 1. PROMOTION CREATION & VALIDATION
  // -------------------------------------------------------------
  describe('1. Promotion Creation & Data Validation', () => {
    it('creates a percentage discount promotion with full fields', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          name: 'Spring 20% Off Sale',
          code: `SPRING20_${timestamp}`,
          description: 'Get 20% off all artisan loaves',
          discountType: 'PERCENTAGE',
          discountValue: 20,
          minSpend: 150,
          startDate: new Date().toISOString(),
          endDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          usageLimit: 100,
          status: 'ACTIVE'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.name, 'Spring 20% Off Sale');
      assert.equal(data.code, `SPRING20_${timestamp}`);
      assert.equal(data.discountType, 'PERCENTAGE');
      assert.equal(data.discountValue, 20);
      assert.equal(data.discountPercent, 20); // backward-compatible alias
      assert.equal(data.minSpend, 150);
      assert.equal(data.usageLimit, 100);
      assert.equal(data.usageCount, 0);
      assert.equal(data.status, 'ACTIVE');
      assert.equal(data.active, true);
      assert.equal(data.merchantId, merchantA.id);
      promoPercentId = data.id;
    });

    it('creates a fixed amount discount promotion', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          name: 'R50 Welcome Voucher',
          code: `WELCOME50_${timestamp}`,
          description: 'Save R50 on your order',
          discountType: 'FIXED',
          discountValue: 50,
          minSpend: 200,
          status: 'ACTIVE'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.discountType, 'FIXED');
      assert.equal(data.discountValue, 50);
      assert.equal(data.code, `WELCOME50_${timestamp}`);
      promoFixedId = data.id;
    });

    it('rejects duplicate promotion code for the same business', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          name: 'Duplicate Code Attempt',
          code: `SPRING20_${timestamp}`,
          discountType: 'PERCENTAGE',
          discountValue: 15
        })
      });

      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /already exists/i);
    });

    it('allows another business to use the same code name without collision', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({
          name: 'Nandi Spring Deal',
          code: `SPRING20_${timestamp}`, // Same code as Merchant A, but on Merchant B
          discountType: 'PERCENTAGE',
          discountValue: 20
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.merchantId, merchantB.id);
      assert.equal(data.code, `SPRING20_${timestamp}`);
    });

    it('rejects promotion with invalid discount percentage (>100 or <=0)', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          code: `INVALID_${timestamp}`,
          discountType: 'PERCENTAGE',
          discountValue: 150 // Invalid
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot exceed 100%|between 1 and 100/i);
    });

    it('rejects promotion with endDate earlier than startDate', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          code: `BAD_DATES_${timestamp}`,
          discountType: 'FIXED',
          discountValue: 25,
          startDate: '2026-10-10',
          endDate: '2026-09-01' // Before startDate
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Start date cannot be after end date|End date must be on or after start date/i);
    });
  });

  // -------------------------------------------------------------
  // 2. MULTI-TENANCY & BUSINESS SECURITY
  // -------------------------------------------------------------
  describe('2. Multi-Tenancy & Business Security Isolation', () => {
    it('prevents Business B from modifying Business A promotion (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({
          name: 'Hacked Promo Name'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('prevents Business B from toggling status of Business A promotion (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({
          status: 'INACTIVE'
        })
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('prevents Business B from deleting Business A promotion (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${bizBToken}`
        }
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('prevents unauthenticated access to business promotion management', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`);
      assert.equal(res.status, 401);
    });
  });

  // -------------------------------------------------------------
  // 3. BUSINESS LIFECYCLE MANAGEMENT (EDIT, ACTIVATE, DEACTIVATE, DELETE)
  // -------------------------------------------------------------
  describe('3. Business Promotion Lifecycle Controls', () => {
    it('lists promotions belonging to the authenticated merchant', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });

      assert.equal(res.status, 200);
      const promos = await res.json();
      assert.ok(Array.isArray(promos));
      assert.ok(promos.some(p => p.id === promoPercentId));
      assert.ok(promos.every(p => p.merchantId === merchantA.id));
    });

    it('edits promotion properties', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          name: 'Updated Spring Sale 25%',
          discountValue: 25,
          minSpend: 180
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, 'Updated Spring Sale 25%');
      assert.equal(data.discountValue, 25);
      assert.equal(data.discountPercent, 25);
      assert.equal(data.minSpend, 180);
    });

    it('deactivates an active promotion', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'INACTIVE' })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'INACTIVE');
      assert.equal(data.active, false);
    });

    it('reactivates an inactive promotion', async () => {
      const res = await fetch(`${baseUrl}/api/business/promotions/${promoPercentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'ACTIVE' })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ACTIVE');
      assert.equal(data.active, true);
    });

    it('deletes a promotion', async () => {
      // Create temporary promo to delete
      const tempRes = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          code: `TEMP_DEL_${timestamp}`,
          discountValue: 10
        })
      });
      const tempPromo = await tempRes.json();

      const delRes = await fetch(`${baseUrl}/api/business/promotions/${tempPromo.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${bizAToken}` }
      });

      assert.equal(delRes.status, 200);
      const delData = await delRes.json();
      assert.equal(delData.id, tempPromo.id);

      // Verify deletion from db
      const verifyPromo = await prisma.promotion.findUnique({ where: { id: tempPromo.id } });
      assert.equal(verifyPromo, null);
    });
  });

  // -------------------------------------------------------------
  // 4. VALIDATION ENDPOINT & RULES ENFORCEMENT
  // -------------------------------------------------------------
  describe('4. Promo Code Validation Endpoint (/api/promotions/validate)', () => {
    let expiredPromoCode = `EXPIRED_${timestamp}`;
    let futurePromoCode = `FUTURE_${timestamp}`;

    before(async () => {
      // Create expired promotion
      await prisma.promotion.create({
        data: {
          merchantId: merchantA.id,
          name: 'Expired Promo',
          description: 'Expired test promotion',
          code: expiredPromoCode,
          discountType: 'PERCENTAGE',
          discountValue: 20,
          startDate: new Date(Date.now() - 14 * 86400000),
          endDate: new Date(Date.now() - 2 * 86400000), // Expired 2 days ago
          status: 'ACTIVE'
        }
      });

      // Create future promotion
      await prisma.promotion.create({
        data: {
          merchantId: merchantA.id,
          name: 'Future Promo',
          description: 'Future test promotion',
          code: futurePromoCode,
          discountType: 'PERCENTAGE',
          discountValue: 15,
          startDate: new Date(Date.now() + 5 * 86400000), // Valid in 5 days
          status: 'ACTIVE'
        }
      });
    });

    it('successfully validates percentage promo and computes discount amount', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `SPRING20_${timestamp}`,
          merchantId: merchantA.id,
          subtotal: 200,
          items: [{ productId: testProductA.id, qty: 2 }]
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.valid, true);
      assert.equal(data.discountAmount, 50); // 25% of R200 = R50 (updated earlier)
      assert.equal(data.finalSubtotal, 150);
    });

    it('successfully validates fixed amount promo and computes discount', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `WELCOME50_${timestamp}`,
          merchantId: merchantA.id,
          subtotal: 300,
          items: [{ productId: testProductA.id, qty: 3 }]
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.valid, true);
      assert.equal(data.discountAmount, 50);
      assert.equal(data.finalSubtotal, 250);
    });

    it('rejects coupon when minimum spend is not met', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `WELCOME50_${timestamp}`, // minSpend is 200
          merchantId: merchantA.id,
          subtotal: 100 // below minSpend
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.valid, false);
      assert.match(data.error, /Minimum order spend/i);
    });

    it('rejects coupon that has expired', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: expiredPromoCode,
          merchantId: merchantA.id,
          subtotal: 200
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.valid, false);
      assert.match(data.error, /has expired/i);
    });

    it('rejects coupon whose start date is in the future', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: futurePromoCode,
          merchantId: merchantA.id,
          subtotal: 200
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.valid, false);
      assert.match(data.error, /not started yet/i);
    });

    it('rejects code belonging to a different business', async () => {
      const res = await fetch(`${baseUrl}/api/promotions/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: `WELCOME50_${timestamp}`, // Merchant A code
          merchantId: merchantB.id, // Tested against Merchant B
          subtotal: 300
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.valid, false);
      assert.match(data.error, /Invalid promotion code/i);
    });
  });

  // -------------------------------------------------------------
  // 5. CHECKOUT INTEGRATION & USAGE LIMIT ENFORCEMENT
  // -------------------------------------------------------------
  describe('5. Checkout Integration & Usage Limit Enforcement', () => {
    let limitedPromoCode = `LIMITED2_${timestamp}`;

    before(async () => {
      // Create a promo with usageLimit of exactly 2
      const created = await prisma.promotion.create({
        data: {
          merchantId: merchantA.id,
          name: 'Flash Limit 2 Orders',
          description: 'Limited 2 orders promo',
          code: limitedPromoCode,
          discountType: 'FIXED',
          discountValue: 20,
          usageLimit: 2,
          usageCount: 0,
          status: 'ACTIVE'
        }
      });
      promoLimitedId = created.id;
    });

    it('applies valid promotion during checkout and correctly deducts discount', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          merchantId: merchantA.id,
          businessName: merchantA.name,
          customer: consumerUser.name,
          phone: '+27 82 111 2222',
          address: '15 Ring Road, Alberton',
          deliveryType: 'collection', // Delivery fee = 0
          promoCode: limitedPromoCode,
          lines: [{ productId: testProductA.id, qty: 1, price: 100 }]
        })
      });

      assert.equal(res.status, 201);
      const order = await res.json();
      assert.equal(order.subtotal, 100);
      assert.equal(order.discount, 20); // R20 discount applied
      // Subtotal 100 + Delivery 0 + Platform 5 - Discount 20 = 85
      assert.equal(order.total, 85);
      assert.match(order.notes, new RegExp(limitedPromoCode));

      // Verify usageCount incremented in DB
      const promoInDb = await prisma.promotion.findUnique({ where: { id: promoLimitedId } });
      assert.equal(promoInDb.usageCount, 1);
    });

    it('applies promotion for 2nd order reaching the usageLimit', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          merchantId: merchantA.id,
          businessName: merchantA.name,
          customer: consumerUser.name,
          phone: '+27 82 111 2222',
          deliveryType: 'collection',
          promoCode: limitedPromoCode,
          lines: [{ productId: testProductA.id, qty: 1, price: 100 }]
        })
      });

      assert.equal(res.status, 201);
      const order = await res.json();
      assert.equal(order.discount, 20);

      // Verify usageCount is now 2 and status changed to EXPIRED
      const promoInDb = await prisma.promotion.findUnique({ where: { id: promoLimitedId } });
      assert.equal(promoInDb.usageCount, 2);
      assert.equal(promoInDb.status, 'EXPIRED');
    });

    it('rejects order with promo code when usage limit has been exceeded', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          merchantId: merchantA.id,
          businessName: merchantA.name,
          customer: consumerUser.name,
          phone: '+27 82 111 2222',
          deliveryType: 'collection',
          promoCode: limitedPromoCode,
          lines: [{ productId: testProductA.id, qty: 1, price: 100 }]
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /maximum usage limit|inactive or expired/i);
    });
  });

  // -------------------------------------------------------------
  // 6. CONSUMER STOREFRONT VIEW
  // -------------------------------------------------------------
  describe('6. Consumer Storefront Promotions Display', () => {
    it('returns only active, non-expired promotions for merchant storefront', async () => {
      const res = await fetch(`${baseUrl}/api/promotions?merchantId=${merchantA.id}`);
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(Array.isArray(list));

      // Should include active promos
      assert.ok(list.some(p => p.id === promoPercentId));
      assert.ok(list.some(p => p.id === promoFixedId));

      // Should NOT include the expired promo
      assert.ok(!list.some(p => p.status === 'EXPIRED'));
    });
  });

  // -------------------------------------------------------------
  // 7. ADMIN GLOBAL MONITORING & MODERATION
  // -------------------------------------------------------------
  describe('7. Super Admin Promotion Monitoring & Governance', () => {
    it('lists all platform promotions across businesses with usage metrics', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      const promos = await res.json();
      assert.ok(Array.isArray(promos));
      assert.ok(promos.length >= 3);
      // Ensure merchant relation details are included for admin visibility
      assert.ok(promos.some(p => p.merchant && p.merchant.name));
    });

    it('filters admin promotions by status', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions?status=EXPIRED`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      const promos = await res.json();
      assert.ok(promos.every(p => p.status === 'EXPIRED'));
    });

    it('allows admin to moderate / deactivate a promotion', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions/${promoPercentId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'INACTIVE' })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'INACTIVE');
      assert.equal(data.active, false);

      // Verify audit log entry
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entity: 'Promotion',
          entityId: promoPercentId,
          action: 'PROMOTION_STATUS_UPDATE'
        }
      });
      assert.ok(auditLog);
    });

    it('allows admin to delete an infringing promotion', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions/${promoPercentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, promoPercentId);

      // Verify audit log entry
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entity: 'Promotion',
          entityId: promoPercentId,
          action: 'PROMOTION_DELETE'
        }
      });
      assert.ok(auditLog);
    });

    it('forbids non-admin users from calling admin promotion routes', async () => {
      const res = await fetch(`${baseUrl}/api/admin/promotions`, {
        headers: { Authorization: `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
    });
  });
});
