import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

// Unique test entities
const timestamp = Date.now();
const bizAEmail = `biz_a_${timestamp}@localbiz.co.za`;
const bizBEmail = `biz_b_${timestamp}@localbiz.co.za`;
const consumerAEmail = `consumer_a_${timestamp}@localbiz.co.za`;
const consumerBEmail = `consumer_b_${timestamp}@localbiz.co.za`;
const password = 'TestPassword123!';

let bizAToken = '';
let bizAUser = null;
let bizAMerchant = null;

let bizBToken = '';
let bizBUser = null;
let bizBMerchant = null;

let consumerAToken = '';
let consumerAUser = null;

let consumerBToken = '';
let consumerBUser = null;

let prod1 = null; // Stock 10
let prod2 = null; // Stock 2
let prodInactive = null; // Inactive

before(async () => {
  // 1. Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 2. Register Consumer A
  const cARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Alpha',
      email: consumerAEmail,
      phone: '+27 82 101 0001',
      password,
      role: 'consumer'
    })
  });
  const cAData = await cARes.json();
  consumerAToken = cAData.token;
  consumerAUser = cAData.user;

  // 3. Register Consumer B
  const cBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Beta',
      email: consumerBEmail,
      phone: '+27 82 101 0002',
      password,
      role: 'consumer'
    })
  });
  const cBData = await cBRes.json();
  consumerBToken = cBData.token;
  consumerBUser = cBData.user;

  // 4. Register Business A
  const bARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Business Alpha Owner',
      email: bizAEmail,
      phone: '+27 82 201 0001',
      password,
      role: 'business',
      businessName: 'Alpha Fresh Produce',
      category: 'Groceries'
    })
  });
  const bAData = await bARes.json();
  bizAToken = bAData.token;
  bizAUser = bAData.user;
  bizAMerchant = bAData.business;

  // Approve Business A
  await prisma.merchant.update({
    where: { id: bizAMerchant.id },
    data: { status: 'Approved', verified: true }
  });

  // 5. Register Business B
  const bBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Business Beta Owner',
      email: bizBEmail,
      phone: '+27 82 201 0002',
      password,
      role: 'business',
      businessName: 'Beta Crafts & Gifts',
      category: 'Retail'
    })
  });
  const bBData = await bBRes.json();
  bizBToken = bBData.token;
  bizBUser = bBData.user;
  bizBMerchant = bBData.business;

  // Approve Business B
  await prisma.merchant.update({
    where: { id: bizBMerchant.id },
    data: { status: 'Approved', verified: true }
  });

  // 6. Create Seed Products for Business A
  prod1 = await prisma.product.create({
    data: {
      id: `prod-${timestamp}-1`,
      merchantId: bizAMerchant.id,
      name: 'Organic Avocados Box',
      desc: 'Box of 10 fresh Hass avocados',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      price: 150.00,
      stockCount: 10,
      inStock: true,
      category: 'Groceries',
      isService: false
    }
  });

  prod2 = await prisma.product.create({
    data: {
      id: `prod-${timestamp}-2`,
      merchantId: bizAMerchant.id,
      name: 'Artisan Sourdough Loaf',
      desc: 'Handcrafted sourdough',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      price: 50.00,
      stockCount: 2,
      inStock: true,
      category: 'Bakery',
      isService: false
    }
  });

  prodInactive = await prisma.product.create({
    data: {
      id: `prod-${timestamp}-3`,
      merchantId: bizAMerchant.id,
      name: 'Seasonal Truffle Oil',
      desc: 'Rare truffle infusion',
      image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5',
      price: 250.00,
      stockCount: 0,
      inStock: false,
      category: 'Pantry',
      isService: false
    }
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.product.updateMany({ data: { inStock: true, stockCount: 50 } }).catch(() => {});
});

describe('Stage 7 — Product Ordering & Inventory Integrity Suite', () => {

  describe('1. Cart & Stock Validation (Guards against inactive or deficient stock)', () => {
    it('rejects order with empty or missing lines array (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: []
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /at least one item/i);
    });

    it('rejects order for inactive / out of stock product (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [
            {
              productId: prodInactive.id,
              name: prodInactive.name,
              price: prodInactive.price,
              qty: 1
            }
          ]
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /out of stock/i);
    });

    it('rejects order when requested quantity exceeds available stock (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [
            {
              productId: prod2.id,
              name: prod2.name,
              price: prod2.price,
              qty: 5 // Stock is only 2
            }
          ]
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Insufficient stock/i);
    });
  });

  describe('2. Atomic Transaction Order Creation & Inventory Decrement', () => {
    let activeOrder = null;

    it('creates an order with multiple products and atomically decrements inventory (201)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          address: '42 Main Rd, Rosebank',
          deliveryType: 'Delivery',
          paymentMethod: 'Instant EFT',
          subtotal: 350.00,
          deliveryFee: 45.00,
          platformFee: 15.00,
          total: 410.00,
          status: 'PENDING',
          lines: [
            {
              productId: prod1.id,
              name: prod1.name,
              price: prod1.price,
              qty: 2
            },
            {
              productId: prod2.id,
              name: prod2.name,
              price: prod2.price,
              qty: 1
            }
          ]
        })
      });

      assert.equal(res.status, 201);
      activeOrder = await res.json();
      assert.ok(activeOrder.id.startsWith('LBZ-'));
      assert.equal(activeOrder.status, 'PENDING');
      assert.equal(activeOrder.userId, consumerAUser.id);
      assert.equal(activeOrder.subtotal, 350);
      assert.equal(activeOrder.deliveryFee, 45);
      assert.equal(activeOrder.platformFee, 15);
      assert.equal(activeOrder.total, 410);
      assert.equal(activeOrder.lines.length, 2);

      // Verify atomic inventory decrement in database
      const refreshedProd1 = await prisma.product.findUnique({ where: { id: prod1.id } });
      const refreshedProd2 = await prisma.product.findUnique({ where: { id: prod2.id } });
      assert.equal(refreshedProd1.stockCount, 8); // 10 - 2
      assert.equal(refreshedProd1.inStock, true);
      assert.equal(refreshedProd2.stockCount, 1); // 2 - 1
      assert.equal(refreshedProd2.inStock, true);
    });

    it('depletes stock to 0 and automatically marks product out of stock (201)', async () => {
      // Order the remaining 1 unit of prod2
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [
            {
              productId: prod2.id,
              name: prod2.name,
              price: prod2.price,
              qty: 1
            }
          ]
        })
      });

      assert.equal(res.status, 201);
      const refreshedProd2 = await prisma.product.findUnique({ where: { id: prod2.id } });
      assert.equal(refreshedProd2.stockCount, 0);
      assert.equal(refreshedProd2.inStock, false);
    });
  });

  describe('3. Complete 9-Stage Order Lifecycle & Fulfillment Transitions', () => {
    let lifecycleOrderId = '';

    it('creates a fresh order in PENDING status', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [
            {
              productId: prod1.id,
              name: prod1.name,
              price: prod1.price,
              qty: 1
            }
          ]
        })
      });

      assert.equal(res.status, 201);
      const order = await res.json();
      assert.equal(order.status, 'PENDING');
      lifecycleOrderId = order.id;
    });

    it('rejects invalid jump from PENDING to DELIVERED (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'DELIVERED' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Invalid status transition/i);
    });

    it('advances order from PENDING to ACCEPTED (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ACCEPTED');
    });

    it('advances order from ACCEPTED to PROCESSING (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'PROCESSING' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'PROCESSING');
    });

    it('advances order from PROCESSING to READY (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'READY' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'READY');
    });

    it('advances order from READY to OUT_FOR_DELIVERY (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'OUT_FOR_DELIVERY' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'OUT_FOR_DELIVERY');
    });

    it('advances order from OUT_FOR_DELIVERY to DELIVERED (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'DELIVERED' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'DELIVERED');
    });

    it('advances order from DELIVERED to COMPLETED (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'COMPLETED');
    });

    it('rejects any transition from terminal status COMPLETED (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${lifecycleOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(res.status, 400);
    });
  });

  describe('4. Order Cancellation, Business Rejection & Automatic Stock Restoration', () => {
    it('consumer cancels PENDING order and stock is automatically restored (200)', async () => {
      const stockBefore = (await prisma.product.findUnique({ where: { id: prod1.id } })).stockCount;

      // 1. Consumer places order for 2 units
      const createRes = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [{ productId: prod1.id, name: prod1.name, price: prod1.price, qty: 2 }]
        })
      });
      assert.equal(createRes.status, 201);
      const order = await createRes.json();

      const stockDuring = (await prisma.product.findUnique({ where: { id: prod1.id } })).stockCount;
      assert.equal(stockDuring, stockBefore - 2);

      // 2. Consumer cancels order
      const cancelRes = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(cancelRes.status, 200);
      const cancelledOrder = await cancelRes.json();
      assert.equal(cancelledOrder.status, 'CANCELLED');

      // 3. Stock restored
      const stockAfter = (await prisma.product.findUnique({ where: { id: prod1.id } })).stockCount;
      assert.equal(stockAfter, stockBefore);
    });

    it('business rejects PENDING order and stock is automatically restored (200)', async () => {
      const stockBefore = (await prisma.product.findUnique({ where: { id: prod1.id } })).stockCount;

      // 1. Consumer places order for 1 unit
      const createRes = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [{ productId: prod1.id, name: prod1.name, price: prod1.price, qty: 1 }]
        })
      });
      assert.equal(createRes.status, 201);
      const order = await createRes.json();

      // 2. Business rejects order
      const rejectRes = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      assert.equal(rejectRes.status, 200);
      const rejectedOrder = await rejectRes.json();
      assert.equal(rejectedOrder.status, 'REJECTED');

      // 3. Stock restored
      const stockAfter = (await prisma.product.findUnique({ where: { id: prod1.id } })).stockCount;
      assert.equal(stockAfter, stockBefore);
    });

    it('prevents consumer from cancelling an order once it is ACCEPTED (400)', async () => {
      // 1. Create order
      const createRes = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [{ productId: prod1.id, name: prod1.name, price: prod1.price, qty: 1 }]
        })
      });
      const order = await createRes.json();

      // 2. Business accepts order
      await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });

      // 3. Consumer tries to cancel ACCEPTED order -> blocked
      const cancelRes = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(cancelRes.status, 400);
      const data = await cancelRes.json();
      assert.match(data.error, /Cannot cancel order that is already/i);
    });
  });

  describe('5. Multi-Tenant Authorization & RBAC Enforcement', () => {
    let orderAId = '';

    before(async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
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
          lines: [{ productId: prod1.id, name: prod1.name, price: prod1.price, qty: 1 }]
        })
      });
      const data = await res.json();
      orderAId = data.id;
    });

    it('prevents Consumer B from viewing Consumer A order details via GET /api/orders/:id (403)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view your own orders/i);
    });

    it('ensures Consumer B order list does not include Consumer A orders', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.equal(list.some(o => o.id === orderAId), false);
    });

    it('prevents Business B from viewing Business A order via GET /api/orders/:id (403)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only view orders for your business/i);
    });

    it('prevents Business B from updating Business A order status (403)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}/status`, {
        method: 'PUT',
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

    it('prevents Consumer from advancing order to fulfillment statuses (403)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}/status`, {
        method: 'PUT',
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

    it('allows Consumer A to view their own order details (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
        headers: { Authorization: `Bearer ${consumerAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, orderAId);
      assert.equal(data.lines.length, 1);
    });

    it('allows Business A to view order details for their business (200)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${orderAId}`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, orderAId);
    });
  });
});
