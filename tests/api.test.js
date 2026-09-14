import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;
let adminToken = '';
let consumerToken = '';
let testMerchantId = 'b-avon';
let createdProductId = '';
let createdBookingId = '';
let createdOrderId = '';
let createdCategoryId = '';

before(async () => {
  await prisma.booking.deleteMany({ where: { date: '2026-09-15' } }).catch(() => {});
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await prisma.booking.deleteMany({ where: { date: '2026-09-15' } }).catch(() => {});
});

describe('1. Authentication & RBAC Security Suite', () => {
  const uniqueEmail = `testuser_${Date.now()}@localbiz.co.za`;

  it('registers a new consumer account', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sipho Zulu',
        email: uniqueEmail,
        password: 'Password123!',
        role: 'consumer',
        phone: '+27 82 555 1234'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.email, uniqueEmail);
    assert.equal(data.user.role, 'consumer');
    consumerToken = data.token;
  });

  it('rejects duplicate user email registration', async () => {
    const res = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Sipho',
        email: uniqueEmail,
        password: 'Password123!'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /already exists/i);
  });

  it('logs in with seeded admin credentials', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@localbiz.co.za',
        password: 'admin123'
      })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.token);
    assert.equal(data.user.role, 'admin');
    adminToken = data.token;
  });

  it('rejects login with invalid password', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@localbiz.co.za',
        password: 'wrongpassword'
      })
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /invalid email or password/i);
  });

  it('returns current user details on GET /api/auth/me with valid token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${consumerToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.email, uniqueEmail);
  });

  it('enforces RBAC: consumer token is blocked from Super Admin overview (403)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${consumerToken}` }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /Super Admin privileges required/i);
  });

  it('allows Super Admin token to access Admin overview (200)', async () => {
    const res = await fetch(`${baseUrl}/api/admin/overview`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.totalMerchants !== undefined);
    assert.ok(Array.isArray(data.allApprovals));
  });
});

describe('2. Merchants Directory & Search Suite', () => {
  it('lists merchants with pagination metadata', async () => {
    const res = await fetch(`${baseUrl}/api/merchants`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.merchants));
    assert.ok(data.merchants.length > 0);
    assert.ok(data.total >= data.merchants.length);
  });

  it('filters merchants by category', async () => {
    const res = await fetch(`${baseUrl}/api/merchants?category=Beauty%20%26%20Cosmetics`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(data.merchants.every(m => m.category === 'Beauty & Cosmetics'));
  });

  it('fetches a single merchant with relations', async () => {
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.id, testMerchantId);
    assert.ok(Array.isArray(data.products));
  });

  it('updates merchant profile details', async () => {
    const newTagline = `Updated Tagline ${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ tagline: newTagline })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.tagline, newTagline);
  });
});

describe('3. Products & Services Catalog Suite', () => {
  it('creates a physical product with inventory count', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        merchantId: testMerchantId,
        name: 'Far Away Glamour EDP 50ml',
        price: 260,
        category: 'Fragrance',
        stockCount: 15,
        inStock: true,
        desc: 'Rich vanilla, black currant and orange blossom scent.'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.id);
    assert.equal(data.name, 'Far Away Glamour EDP 50ml');
    assert.equal(data.isService, false);
    createdProductId = data.id;
  });

  it('creates a professional service listing with duration', async () => {
    const res = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        merchantId: testMerchantId,
        name: 'Bridal Make-up Consultation',
        price: 450,
        category: 'Services',
        isService: true,
        duration: '1.5 hours',
        desc: 'Professional makeover and skincare prep.'
      })
    });
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.isService, true);
    assert.equal(data.duration, '1.5 hours');
  });

  it('updates product stock availability toggle', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ inStock: false })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.inStock, false);
  });

  it('deletes a product listing', async () => {
    const res = await fetch(`${baseUrl}/api/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /deleted/i);
  });
});

describe('4. Orders & Commerce Integrity Suite', () => {
  it('creates an order and calculates total with server-side validation', async () => {
    const lines = [
      { name: 'Lipstick Rose Red', qty: 2, price: 120 },
      { name: 'Moisturizer Cream 100ml', qty: 1, price: 180 }
    ];
    // Expected subtotal: (2 * 120) + (1 * 180) = 420. Delivery fee (35) + service fee (5) = 460.
    const res = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        merchantId: testMerchantId,
        businessName: "Nomsa's Avon & Beauty Bar",
        customer: 'Sipho Zulu',
        phone: '+27 82 555 1234',
        address: '14 Voortrekker Ave, Alberton',
        deliveryType: 'Delivery',
        paymentMethod: 'Instant Card',
        lines
      })
    });
    assert.equal(res.status, 201);
    const order = await res.json();
    assert.ok(order.id.startsWith('LBZ-'));
    assert.equal(order.total, 460);
    assert.equal(order.status, 'Placed');
    assert.equal(order.paymentStatus, 'Paid');
    assert.equal(order.lines.length, 2);
    createdOrderId = order.id;
  });

  it('updates order lifecycle status', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${createdOrderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Out for delivery' })
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.status, 'Out for delivery');
  });
});

describe('5. Service Bookings & Dual-Key Compatibility Suite', () => {
  it('creates a service booking request with date and timeSlot', async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        merchantId: testMerchantId,
        customerName: 'Sipho Zulu',
        phone: '+27 82 555 1234',
        serviceName: 'Full Glam Evening Makeup',
        servicePrice: 350,
        date: '2026-09-15',
        timeSlot: '14:00',
        notes: 'Wedding reception guest'
      })
    });
    assert.equal(res.status, 201);
    const booking = await res.json();
    assert.equal(booking.serviceName, 'Full Glam Evening Makeup');
    assert.equal(booking.timeSlot, '14:00');
    // Verify dual-key compatibility
    assert.equal(booking.time, '14:00');
    assert.equal(booking.price, 350);
    createdBookingId = booking.id;
  });

  it('updates booking appointment status', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${createdBookingId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Confirmed' })
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.status, 'Confirmed');
  });
});

describe('6. Reviews & Rating Moderation Suite', () => {
  it('rejects review with invalid rating > 5 (400)', async () => {
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        rating: 6,
        comment: 'Too high rating'
      })
    });
    assert.equal(res.status, 400);
    const data = await res.json();
    assert.match(data.error, /between 1 and 5/i);
  });

  it('rejects review with invalid rating < 1 (400)', async () => {
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        rating: 0,
        comment: 'Zero rating'
      })
    });
    assert.equal(res.status, 400);
  });

  it('creates valid 5-star review via /api/merchants/:id/reviews and updates merchant stats', async () => {
    // Stage 11 rule: Advance test order to Delivered/Completed
    if (createdOrderId) {
      await prisma.order.update({
        where: { id: createdOrderId },
        data: { status: 'Delivered' }
      });
    }

    const res = await fetch(`${baseUrl}/api/merchants/${testMerchantId}/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        rating: 5,
        comment: 'Exceptional service and quick delivery!',
        userName: 'Sipho Zulu',
        orderId: createdOrderId
      })
    });
    assert.equal(res.status, 201);
    const review = await res.json();
    assert.equal(review.rating, 5);
    assert.equal(review.merchantId, testMerchantId);

    // Verify merchant review count updated
    const mRes = await fetch(`${baseUrl}/api/merchants/${testMerchantId}`);
    const merchant = await mRes.json();
    assert.ok(merchant.reviewCount > 0);
  });

  it('creates review via root /api/reviews endpoint', async () => {
    // Stage 11 rule: Advance test booking to COMPLETED
    if (createdBookingId) {
      await prisma.booking.update({
        where: { id: createdBookingId },
        data: { status: 'COMPLETED' }
      });
    }

    const res = await fetch(`${baseUrl}/api/reviews`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${consumerToken}`
      },
      body: JSON.stringify({
        merchantId: testMerchantId,
        rating: 4,
        comment: 'Great products overall.',
        bookingId: createdBookingId
      })
    });
    assert.equal(res.status, 201);
    const review = await res.json();
    assert.equal(review.rating, 4);
  });
});

describe('7. Categories Administration Suite', () => {
  const categoryName = `New Tech ${Date.now()}`;

  it('creates a new category under admin privilege', async () => {
    const res = await fetch(`${baseUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: categoryName,
        icon: 'Cpu',
        description: 'Computers and tech repairs'
      })
    });
    assert.equal(res.status, 201);
    const cat = await res.json();
    assert.equal(cat.name, categoryName);
    createdCategoryId = cat.id;
  });

  it('deletes the category under admin privilege', async () => {
    const res = await fetch(`${baseUrl}/api/categories/${createdCategoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.match(data.message, /deleted/i);
  });
});

describe('8. 404 API Route Handling Suite', () => {
  it('returns JSON 404 for nonexistent API route', async () => {
    const res = await fetch(`${baseUrl}/api/nonexistent_test_endpoint_12345`);
    assert.equal(res.status, 404);
    const data = await res.json();
    assert.ok(data.error);
    assert.match(data.error, /API route not found/i);
  });
});
