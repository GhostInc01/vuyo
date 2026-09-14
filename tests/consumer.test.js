import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;
let consumerToken = '';
let testConsumerId = '';
let testMerchantId = 'b-avon';
let sampleProductId = '';
let sampleOrderId = '';
let sampleBookingId = '';

before(async () => {
  await prisma.booking.deleteMany({ where: { date: '2026-09-15' } }).catch(() => {});
  await prisma.product.updateMany({ data: { inStock: true, stockCount: 50 } }).catch(() => {});
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login or register test consumer
  const email = `consumer_${Date.now()}@localbiz.co.za`;
  const res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nandi Madida',
      email,
      password: 'ConsumerPassword123!',
      role: 'consumer',
      phone: '+27 82 777 8899'
    })
  });
  const data = await res.json();
  consumerToken = data.token;
  testConsumerId = data.user.id;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.booking.deleteMany({ where: { date: '2026-09-15' } }).catch(() => {});
});

describe('Stage 4 — Consumer Experience & API Test Suite', () => {
  // 1. Password Reset Endpoint
  describe('1. Password Recovery Flow', () => {
    it('POST /api/auth/forgot-password sends instructions for valid email', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'thandiwe@gmail.com' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.message.includes('password reset instructions'));
    });

    it('POST /api/auth/forgot-password rejects invalid email syntax', async () => {
      const res = await fetch(`${baseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'invalid-email-no-at' })
      });
      assert.equal(res.status, 400);
    });
  });

  // 2. Profile Management
  describe('2. Consumer Profile Management', () => {
    it('PATCH /api/auth/profile updates consumer phone and avatar', async () => {
      const newAvatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          name: 'Nandi Madida-Updated',
          phone: '+27 83 999 1122',
          avatar: newAvatar
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.name, 'Nandi Madida-Updated');
      assert.equal(data.phone, '+27 83 999 1122');
      assert.equal(data.avatar, newAvatar);
    });

    it('PATCH /api/auth/profile rejects unauthenticated request', async () => {
      const res = await fetch(`${baseUrl}/api/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Hacker' })
      });
      assert.equal(res.status, 401);
    });
  });

  // 3. Multi-Facet Search & Listings
  describe('3. Multi-Facet Search & Directory Filtering', () => {
    it('GET /api/merchants returns approved local businesses', async () => {
      const res = await fetch(`${baseUrl}/api/merchants`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data.merchants));
      assert.ok(data.merchants.length > 0);
      // All merchants in consumer directory should be Approved
      assert.ok(data.merchants.every(m => m.status === 'Approved'));
    });

    it('GET /api/products returns catalog with merchant relation', async () => {
      const res = await fetch(`${baseUrl}/api/products`);
      assert.equal(res.status, 200);
      const products = await res.json();
      assert.ok(Array.isArray(products));
      assert.ok(products.length > 0);
      sampleProductId = products[0].id;
      assert.ok(products[0].name);
      assert.ok(products[0].price >= 0);
      assert.ok(products[0].merchant, 'Product should include merchant relationship');
    });

    it('GET /api/products/:id retrieves single product details', async () => {
      const res = await fetch(`${baseUrl}/api/products/${sampleProductId}`);
      assert.equal(res.status, 200);
      const product = await res.json();
      assert.equal(product.id, sampleProductId);
      assert.ok(product.merchant);
    });

    it('GET /api/products/:id returns 404 for invalid product id', async () => {
      const res = await fetch(`${baseUrl}/api/products/p-nonexistent-9999`);
      assert.equal(res.status, 404);
    });

    it('GET /api/categories returns system categories with metadata', async () => {
      const res = await fetch(`${baseUrl}/api/categories`);
      assert.equal(res.status, 200);
      const categories = await res.json();
      assert.ok(Array.isArray(categories));
      assert.ok(categories.length >= 5);
      assert.ok(categories.some(c => c.name.includes('Beauty') || c.name.includes('Produce') || c.name.includes('Plumbing')));
    });
  });

  // 4. Orders & Order Details
  describe('4. Order Placement, Tracking & Details', () => {
    it('POST /api/orders creates a new customer order with line items', async () => {
      const orderPayload = {
        merchantId: testMerchantId,
        businessName: "Nomsa's Avon Corner",
        customer: 'Nandi Madida',
        phone: '+27 82 777 8899',
        address: '22 Ring Road, Alberton',
        total: 350.00,
        deliveryType: 'Delivery',
        paymentMethod: 'Instant Card',
        notes: 'Please leave at security gate',
        lines: [
          { name: 'Far Away Eau de Parfum 50ml', qty: 1, price: 299.00 },
          { name: 'Color Trend Matte Lipstick', qty: 1, price: 51.00 }
        ]
      };

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify(orderPayload)
      });
      assert.equal(res.status, 201);
      const order = await res.json();
      assert.ok(order.id.startsWith('LBZ-'));
      assert.equal(order.customer, 'Nandi Madida');
      assert.equal(order.status, 'Placed');
      assert.equal(order.lines.length, 2);
      sampleOrderId = order.id;
    });

    it('GET /api/orders/:id fetches complete order details with tracking lines', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${sampleOrderId}`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const order = await res.json();
      assert.equal(order.id, sampleOrderId);
      assert.equal(order.lines.length, 2);
      assert.ok(order.merchant);
      assert.equal(order.deliveryType, 'Delivery');
    });

    it('GET /api/orders/:id returns 404 for nonexistent order', async () => {
      const res = await fetch(`${baseUrl}/api/orders/LBZ-0000-NONEXISTENT`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 404);
    });
  });

  // 5. Bookings & Booking Details
  describe('5. Service Bookings & Appointment Details', () => {
    it('POST /api/bookings books a professional service slot', async () => {
      const bookingPayload = {
        merchantId: testMerchantId,
        serviceId: sampleProductId,
        serviceTitle: 'Emergency Burst Pipe Inspection',
        serviceName: 'Emergency Burst Pipe Inspection',
        date: '2026-09-15',
        timeSlot: '14:00 - 16:00',
        servicePrice: 450.00,
        customerName: 'Nandi Madida',
        customerPhone: '+27 82 777 8899',
        customerEmail: 'nandi@localbiz.co.za',
        notes: 'Geyser dripping into ceiling',
        userId: testConsumerId
      };

      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify(bookingPayload)
      });
      assert.equal(res.status, 201);
      const b = await res.json();
      assert.ok(b.id);
      assert.equal(b.serviceTitle, 'Emergency Burst Pipe Inspection');
      assert.equal(b.status, 'Pending');
      sampleBookingId = b.id;
    });

    it('GET /api/bookings/:id fetches appointment details with dual-key compatibility', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${sampleBookingId}`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const b = await res.json();
      assert.equal(b.id, sampleBookingId);
      assert.equal(b.timeSlot, '14:00 - 16:00');
      assert.equal(b.time, '14:00 - 16:00', 'Should support time alias for frontend compatibility');
      assert.equal(b.servicePrice, 450.00);
      assert.equal(b.price, 450.00, 'Should support price alias for frontend compatibility');
      assert.ok(b.merchant);
    });
  });

  // 6. Favorites & Reviews
  describe('6. Consumer Engagement (Favorites & Reviews)', () => {
    it('POST /api/favourites adds merchant to consumer favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          userId: testConsumerId,
          merchantId: testMerchantId
        })
      });
      assert.ok(res.status === 200 || res.status === 201);
      const data = await res.json();
      assert.ok(data.action === 'added' || data.action === 'removed');
    });

    it('POST /api/merchants/:id/reviews submits a community rating & review', async () => {
      // Stage 11 rule: ensure consumer has a completed transaction
      if (sampleOrderId) {
        await prisma.order.update({
          where: { id: sampleOrderId },
          data: { status: 'Delivered' }
        });
      }

      const reviewPayload = {
        userName: 'Nandi Madida',
        rating: 5,
        comment: 'Outstanding, prompt service and genuine products! Highly recommended.',
        userId: testConsumerId,
        orderId: sampleOrderId
      };

      const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify(reviewPayload)
      });
      assert.equal(res.status, 201);
      const review = await res.json();
      assert.equal(review.rating, 5);
      assert.equal(review.userName, 'Nandi Madida');
      assert.equal(review.merchantId, testMerchantId);
    });
  });
});
