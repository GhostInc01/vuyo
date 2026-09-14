import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

// Test accounts & tokens
const timestamp = Date.now();
const bizAEmail = `biz_a_${timestamp}@localbiz.co.za`;
const bizBEmail = `biz_b_${timestamp}@localbiz.co.za`;
const consumerEmail = `consumer_${timestamp}@localbiz.co.za`;
const password = 'TestPassword123!';

let bizAToken = '';
let bizAUser = null;
let bizAMerchant = null;

let bizBToken = '';
let bizBUser = null;
let bizBMerchant = null;

let consumerToken = '';
let consumerUser = null;

let prodAId = '';
let prodBId = '';
let servAId = '';
let orderAId = '';
let orderBId = '';
let bookingAId = '';
let bookingBId = '';
let promoAId = '';
let reviewAId = '';

before(async () => {
  // 1. Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 2. Register Consumer User
  const consumerRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lerato Consumer',
      email: consumerEmail,
      phone: '+27 82 111 2233',
      password,
      role: 'consumer'
    })
  });
  const consumerData = await consumerRes.json();
  consumerToken = consumerData.token;
  consumerUser = consumerData.user;

  // 3. Register Business A
  const bizARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Owner Alpha',
      email: bizAEmail,
      phone: '+27 82 222 3344',
      password,
      role: 'business',
      businessName: `Alpha Bakery ${timestamp}`,
      businessCategory: 'Food & Fresh Produce',
      businessDescription: 'Artisan bakery in Alberton',
      address: '10 Ring Road, Alberton'
    })
  });
  const bizAData = await bizARes.json();
  bizAToken = bizAData.token;
  bizAUser = bizAData.user;
  bizAMerchant = bizAData.business;

  // Approve Business A to enable active operations
  await prisma.merchant.update({
    where: { id: bizAMerchant.id },
    data: { status: 'Approved', verified: true }
  });

  // 4. Register Business B
  const bizBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Owner Beta',
      email: bizBEmail,
      phone: '+27 82 333 4455',
      password,
      role: 'business',
      businessName: `Beta Electrical ${timestamp}`,
      businessCategory: 'Home & Professional Services',
      businessDescription: 'Certified electrician services',
      address: '25 Voortrekker Road, Alberton'
    })
  });
  const bizBData = await bizBRes.json();
  bizBToken = bizBData.token;
  bizBUser = bizBData.user;
  bizBMerchant = bizBData.business;

  // Approve Business B
  await prisma.merchant.update({
    where: { id: bizBMerchant.id },
    data: { status: 'Approved', verified: true }
  });

  // 5. Seed Test Product & Order for Business B to test tenant boundary
  const prodB = await prisma.product.create({
    data: {
      id: `p-b-${timestamp}`,
      merchantId: bizBMerchant.id,
      name: 'Beta Solar Inverter 5kW',
      price: 18500,
      category: 'Home & Professional Services',
      isService: false,
      stockCount: 5,
      inStock: true,
      image: 'https://images.unsplash.com/photo-inverter',
      desc: 'High efficiency solar inverter'
    }
  });
  prodBId = prodB.id;

  const orderB = await prisma.order.create({
    data: {
      id: `ord-b-${timestamp}`,
      merchantId: bizBMerchant.id,
      businessName: bizBMerchant.name,
      customer: 'Beta Customer',
      phone: '+27 82 999 0001',
      address: '40 Second Ave, Alberton',
      total: 18500,
      status: 'Placed',
      placedAt: 'Just now'
    }
  });
  orderBId = orderB.id;

  const bookingB = await prisma.booking.create({
    data: {
      id: `bk-b-${timestamp}`,
      merchantId: bizBMerchant.id,
      serviceName: 'Inverter Installation Callout',
      customerName: 'Beta Client',
      phone: '+27 82 999 0002',
      date: '2026-09-15',
      timeSlot: '10:00 - 12:00',
      servicePrice: 950,
      status: 'Pending'
    }
  });
  bookingBId = bookingB.id;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Cleanup test artifacts
  try {
    if (bizAMerchant?.id) {
      await prisma.order.deleteMany({ where: { merchantId: bizAMerchant.id } });
      await prisma.booking.deleteMany({ where: { merchantId: bizAMerchant.id } });
      await prisma.product.deleteMany({ where: { merchantId: bizAMerchant.id } });
      await prisma.review.deleteMany({ where: { merchantId: bizAMerchant.id } });
      await prisma.promotion.deleteMany({ where: { merchantId: bizAMerchant.id } });
      await prisma.merchant.deleteMany({ where: { id: bizAMerchant.id } });
    }
    if (bizBMerchant?.id) {
      await prisma.order.deleteMany({ where: { merchantId: bizBMerchant.id } });
      await prisma.booking.deleteMany({ where: { merchantId: bizBMerchant.id } });
      await prisma.product.deleteMany({ where: { merchantId: bizBMerchant.id } });
      await prisma.merchant.deleteMany({ where: { id: bizBMerchant.id } });
    }
    if (bizAUser?.id) await prisma.user.deleteMany({ where: { id: bizAUser.id } });
    if (bizBUser?.id) await prisma.user.deleteMany({ where: { id: bizBUser.id } });
    if (consumerUser?.id) await prisma.user.deleteMany({ where: { id: consumerUser.id } });
  } catch (err) {
    console.error('Cleanup error:', err.message);
  }
  await prisma.$disconnect();
});

describe('1. Business Portal Authentication & Role Protection', () => {
  it('blocks unauthenticated requests with 401 Unauthorized', async () => {
    const res = await fetch(`${baseUrl}/api/business/dashboard`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.match(data.error, /authentication required/i);
  });

  it('blocks consumer role from accessing business portal with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/business/dashboard`, {
      headers: { Authorization: `Bearer ${consumerToken}` }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /requires business role/i);
  });

  it('allows authenticated business user into business portal (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/business/dashboard`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.ok(typeof data.todayOrders === 'number');
    assert.ok(typeof data.revenue === 'number');
  });
});

describe('2. Multi-Tenant Backend Security Isolation (Tenant Boundary Enforced)', () => {
  it('prevents Business A from viewing Business B products on portal route', async () => {
    const res = await fetch(`${baseUrl}/api/business/products`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const products = await res.json();
    const hasBetaProd = products.some(p => p.id === prodBId || p.merchantId === bizBMerchant.id);
    assert.equal(hasBetaProd, false, 'Business A must never see Business B products in its portal');
  });

  it('prevents Business A from modifying Business B product via PATCH /api/business/products/:id (404/403)', async () => {
    const res = await fetch(`${baseUrl}/api/business/products/${prodBId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ price: 10 })
    });
    assert.ok(res.status === 403 || res.status === 404, `Expected 403 or 404, got ${res.status}`);
  });

  it('prevents Business A from tampering with Business B product via generic PATCH /api/products/:id (403)', async () => {
    const res = await fetch(`${baseUrl}/api/products/${prodBId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ price: 5 })
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /cannot modify another business/i);
  });

  it('prevents Business A from deleting Business B product via DELETE /api/products/:id (403)', async () => {
    const res = await fetch(`${baseUrl}/api/products/${prodBId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 403);
    const data = await res.json();
    assert.match(data.error, /cannot delete another business/i);
  });

  it('prevents Business A from updating Business B order status via PATCH /api/orders/:id/status (403)', async () => {
    const res = await fetch(`${baseUrl}/api/orders/${orderBId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ status: 'Cancelled' })
    });
    assert.equal(res.status, 403);
  });

  it('prevents Business A from modifying Business B booking via PATCH /api/bookings/:id/status (403)', async () => {
    const res = await fetch(`${baseUrl}/api/bookings/${bookingBId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ status: 'Cancelled' })
    });
    assert.equal(res.status, 403);
  });
});

describe('3. Product Management (CRUD: Create, View, Edit, Activate, Deactivate, Delete)', () => {
  it('creates a new product for Business A', async () => {
    const res = await fetch(`${baseUrl}/api/business/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Artisan Ciabatta Loaf',
        price: 45.50,
        category: 'Food & Fresh Produce',
        stockCount: 25,
        desc: 'Crusty traditional ciabatta',
        image: 'https://images.unsplash.com/photo-ciabatta'
      })
    });

    assert.equal(res.status, 201);
    const prod = await res.json();
    assert.equal(prod.name, 'Artisan Ciabatta Loaf');
    assert.equal(prod.merchantId, bizAMerchant.id);
    assert.equal(prod.price, 45.50);
    assert.equal(prod.stockCount, 25);
    assert.equal(prod.inStock, true);
    assert.equal(prod.isService, false);
    prodAId = prod.id;
  });

  it('views products list and single product for Business A', async () => {
    const listRes = await fetch(`${baseUrl}/api/business/products`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(listRes.status, 200);
    const products = await listRes.json();
    assert.ok(Array.isArray(products));
    assert.ok(products.some(p => p.id === prodAId));

    const singleRes = await fetch(`${baseUrl}/api/business/products/${prodAId}`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(singleRes.status, 200);
    const single = await singleRes.json();
    assert.equal(single.id, prodAId);
    assert.equal(single.name, 'Artisan Ciabatta Loaf');
  });

  it('edits product price, name, and stock count', async () => {
    const res = await fetch(`${baseUrl}/api/business/products/${prodAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Artisan Ciabatta Loaf (Family Size)',
        price: 52.00,
        stockCount: 30
      })
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.name, 'Artisan Ciabatta Loaf (Family Size)');
    assert.equal(updated.price, 52.00);
    assert.equal(updated.stockCount, 30);
  });

  it('deactivates product (marks out of stock)', async () => {
    const res = await fetch(`${baseUrl}/api/business/products/${prodAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ inStock: false })
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.inStock, false);
  });

  it('reactivates product (marks in stock)', async () => {
    const res = await fetch(`${baseUrl}/api/business/products/${prodAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ inStock: true })
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.inStock, true);
  });

  it('deletes a product cleanly', async () => {
    // Create temporary product to delete
    const tempRes = await fetch(`${baseUrl}/api/business/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Temporary Baguette',
        price: 25,
        category: 'Food & Fresh Produce'
      })
    });
    const tempProd = await tempRes.json();

    const delRes = await fetch(`${baseUrl}/api/business/products/${tempProd.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(delRes.status, 200);

    const checkRes = await fetch(`${baseUrl}/api/business/products/${tempProd.id}`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(checkRes.status, 404);
  });
});

describe('4. Service Management (CRUD: Create, View, Edit, Activate, Deactivate, Delete)', () => {
  it('creates a new bookable service for Business A', async () => {
    const res = await fetch(`${baseUrl}/api/business/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Sourdough Bread Masterclass',
        price: 350.00,
        category: 'Food & Fresh Produce',
        duration: '2 hours',
        desc: 'Hands-on artisan sourdough baking masterclass',
        image: 'https://images.unsplash.com/photo-masterclass'
      })
    });

    assert.equal(res.status, 201);
    const serv = await res.json();
    assert.equal(serv.name, 'Sourdough Bread Masterclass');
    assert.equal(serv.isService, true);
    assert.equal(serv.duration, '2 hours');
    assert.equal(serv.merchantId, bizAMerchant.id);
    servAId = serv.id;
  });

  it('views services list for Business A', async () => {
    const res = await fetch(`${baseUrl}/api/business/services`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const services = await res.json();
    assert.ok(Array.isArray(services));
    assert.ok(services.some(s => s.id === servAId));
  });

  it('edits service price and duration', async () => {
    const res = await fetch(`${baseUrl}/api/business/services/${servAId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        price: 395.00,
        duration: '2.5 hours'
      })
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.price, 395.00);
    assert.equal(updated.duration, '2.5 hours');
  });

  it('toggles service active status', async () => {
    // Deactivate
    const deactRes = await fetch(`${baseUrl}/api/business/services/${servAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ inStock: false })
    });
    assert.equal(deactRes.status, 200);
    const deact = await deactRes.json();
    assert.equal(deact.inStock, false);

    // Reactivate
    const reactRes = await fetch(`${baseUrl}/api/business/services/${servAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ inStock: true })
    });
    assert.equal(reactRes.status, 200);
    const react = await reactRes.json();
    assert.equal(react.inStock, true);
  });

  it('deletes a service listing', async () => {
    const tempRes = await fetch(`${baseUrl}/api/business/services`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Temporary Tasting Session',
        price: 120,
        duration: '30 mins'
      })
    });
    const tempServ = await tempRes.json();

    const delRes = await fetch(`${baseUrl}/api/business/services/${tempServ.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(delRes.status, 200);
  });
});

describe('5. Business Profile & Hours Editing', () => {
  it('retrieves the profile for authenticated business', async () => {
    const res = await fetch(`${baseUrl}/api/business/profile`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const profile = await res.json();
    assert.equal(profile.id, bizAMerchant.id);
  });

  it('updates business profile details including contact, hours, and description', async () => {
    const res = await fetch(`${baseUrl}/api/business/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        name: 'Alpha Artisan Bakes & Deli',
        description: 'Award-winning artisan bakery, daily organic sourdough',
        phone: '+27 82 222 9988',
        email: 'hello@alphabakes.co.za',
        website: 'https://alphabakes.co.za',
        address: '12 Ring Road, Alberton North',
        businessHours: 'Mon - Sun: 07:00 - 18:00',
        openNow: true
      })
    });

    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.name, 'Alpha Artisan Bakes & Deli');
    assert.equal(updated.about, 'Award-winning artisan bakery, daily organic sourdough');
    assert.equal(updated.phone, '+27 82 222 9988');
    assert.equal(updated.email, 'hello@alphabakes.co.za');
    assert.equal(updated.website, 'https://alphabakes.co.za');
    assert.equal(updated.address, '12 Ring Road, Alberton North');
    assert.equal(updated.businessHours, 'Mon - Sun: 07:00 - 18:00');
    assert.equal(updated.openNow, true);
  });
});

describe('6. Dashboard Metrics & Ledger Calculations', () => {
  before(async () => {
    // Seed Orders for Business A
    const o1 = await prisma.order.create({
      data: {
        id: `ord-a1-${timestamp}`,
        merchantId: bizAMerchant.id,
        businessName: bizAMerchant.name,
        customer: 'Sipho Zulu',
        phone: '+27 82 555 1111',
        address: '14 Tenth Ave, Alberton',
        total: 104.00,
        status: 'Delivered',
        placedAt: 'Just now'
      }
    });
    orderAId = o1.id;

    await prisma.order.create({
      data: {
        id: `ord-a2-${timestamp}`,
        merchantId: bizAMerchant.id,
        businessName: bizAMerchant.name,
        customer: 'Nandi Sithole',
        phone: '+27 82 555 2222',
        address: '18 Fifth Ave, Alberton',
        total: 395.00,
        status: 'Placed',
        placedAt: 'Just now'
      }
    });

    // Seed Booking for Business A
    const b1 = await prisma.booking.create({
      data: {
        id: `bk-a1-${timestamp}`,
        merchantId: bizAMerchant.id,
        serviceName: 'Sourdough Masterclass Session',
        customerName: 'Sipho Zulu',
        phone: '+27 82 555 1111',
        date: '2026-09-12',
        timeSlot: '14:00 - 16:30',
        servicePrice: 395.00,
        status: 'Confirmed'
      }
    });
    bookingAId = b1.id;

    // Seed Review for Business A
    const r1 = await prisma.review.create({
      data: {
        id: `rev-a1-${timestamp}`,
        merchantId: bizAMerchant.id,
        userName: 'Sipho Zulu',
        rating: 5,
        comment: 'Best bread in Alberton by far! The crust is perfection.'
      }
    });
    reviewAId = r1.id;
  });

  it('calculates dashboard metrics accurately (orders, revenue, bookings, customers)', async () => {
    const res = await fetch(`${baseUrl}/api/business/dashboard`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });

    assert.equal(res.status, 200);
    const data = await res.json();

    assert.ok(data.todayOrders >= 2, 'Must calculate today orders');
    assert.ok(data.pendingOrders >= 1, 'Must track pending orders');
    assert.ok(data.completedOrders >= 1, 'Must track completed orders');
    assert.ok(data.revenue >= 499.00, 'Must aggregate total revenue (104 + 395)');
    assert.ok(data.bookings >= 1, 'Must count bookings');
    assert.ok(data.confirmedBookings >= 1, 'Must count confirmed bookings');
    assert.ok(data.customers >= 2, 'Must aggregate unique customers (Sipho & Nandi)');
    assert.ok(Array.isArray(data.recentOrders), 'Must include recentOrders array');
    assert.ok(Array.isArray(data.recentBookings), 'Must include recentBookings array');
  });
});

describe('7. Orders & Bookings Management Operations', () => {
  it('lists only Business A orders on /api/business/orders', async () => {
    const res = await fetch(`${baseUrl}/api/business/orders`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const orders = await res.json();
    assert.ok(Array.isArray(orders));
    assert.ok(orders.every(o => o.merchantId === bizAMerchant.id));
    assert.equal(orders.some(o => o.id === orderBId), false);
  });

  it('advances order status on /api/business/orders/:id/status', async () => {
    const res = await fetch(`${baseUrl}/api/business/orders/${orderAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ status: 'Preparing' })
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.status, 'Preparing');
  });

  it('lists only Business A bookings on /api/business/bookings', async () => {
    const res = await fetch(`${baseUrl}/api/business/bookings`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const bookings = await res.json();
    assert.ok(Array.isArray(bookings));
    assert.ok(bookings.every(b => b.merchantId === bizAMerchant.id));
    assert.equal(bookings.some(b => b.id === bookingBId), false);
  });

  it('advances booking status on /api/business/bookings/:id/status', async () => {
    const res = await fetch(`${baseUrl}/api/business/bookings/${bookingAId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ status: 'Completed' })
    });
    assert.equal(res.status, 200);
    const updated = await res.json();
    assert.equal(updated.status, 'Completed');
  });
});

describe('8. Customer Directory, Reviews, Payments, Promotions, Reports, Notifications, Settings', () => {
  it('aggregates customer directory on /api/business/customers', async () => {
    const res = await fetch(`${baseUrl}/api/business/customers`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const customers = await res.json();
    assert.ok(Array.isArray(customers));
    assert.ok(customers.length >= 2);
    const sipho = customers.find(c => c.name.includes('Sipho'));
    assert.ok(sipho);
    assert.ok(sipho.orderCount >= 1);
    assert.ok(sipho.bookingCount >= 1);
  });

  it('lists reviews and allows business reply on /api/business/reviews/:id/reply', async () => {
    const listRes = await fetch(`${baseUrl}/api/business/reviews`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(listRes.status, 200);
    const reviews = await listRes.json();
    assert.ok(reviews.some(r => r.id === reviewAId));

    const replyRes = await fetch(`${baseUrl}/api/business/reviews/${reviewAId}/reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({ reply: 'Thank you Sipho! We bake fresh every single morning.' })
    });
    assert.equal(replyRes.status, 200);
    const replied = await replyRes.json();
    assert.equal(replied.reply, 'Thank you Sipho! We bake fresh every single morning.');

    // Verify persistence on subsequent GET
    const verifyRes = await fetch(`${baseUrl}/api/business/reviews`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    const updatedReviews = await verifyRes.json();
    const verifiedReview = updatedReviews.find(r => r.id === reviewAId);
    assert.equal(verifiedReview.reply, 'Thank you Sipho! We bake fresh every single morning.');
    assert.ok(verifiedReview.repliedAt);
  });

  it('retrieves payment ledger on /api/business/payments', async () => {
    const res = await fetch(`${baseUrl}/api/business/payments`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const payments = await res.json();
    assert.ok(Array.isArray(payments));
    assert.ok(payments.length >= 2);
  });

  it('creates, lists, and deletes promotions on /api/business/promotions', async () => {
    // Create
    const createRes = await fetch(`${baseUrl}/api/business/promotions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        code: `BAKE15_${timestamp}`,
        discountPercent: 15,
        description: '15% off all artisan breads'
      })
    });
    assert.equal(createRes.status, 201);
    const promo = await createRes.json();
    assert.equal(promo.discountPercent, 15);
    promoAId = promo.id;

    // List
    const listRes = await fetch(`${baseUrl}/api/business/promotions`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(listRes.status, 200);
    const promos = await listRes.json();
    assert.ok(promos.some(p => p.id === promoAId));

    // Delete
    const delRes = await fetch(`${baseUrl}/api/business/promotions/${promoAId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(delRes.status, 200);
  });

  it('retrieves sales & performance analytics on /api/business/reports', async () => {
    const res = await fetch(`${baseUrl}/api/business/reports`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const report = await res.json();
    assert.ok(report.totalRevenue >= 499.00);
    assert.ok(report.totalOrders >= 2);
    assert.ok(Array.isArray(report.monthlyBreakdown));
  });

  it('retrieves notification inbox alerts on /api/business/notifications', async () => {
    const res = await fetch(`${baseUrl}/api/business/notifications`, {
      headers: { Authorization: `Bearer ${bizAToken}` }
    });
    assert.equal(res.status, 200);
    const notifications = await res.json();
    assert.ok(Array.isArray(notifications));
  });

  it('updates business operating hours & openNow on /api/business/settings', async () => {
    const res = await fetch(`${baseUrl}/api/business/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bizAToken}`
      },
      body: JSON.stringify({
        businessHours: 'Mon - Fri: 08:00 - 17:00, Sat: 08:00 - 14:00',
        openNow: true
      })
    });
    assert.equal(res.status, 200);
    const settings = await res.json();
    assert.equal(settings.businessHours, 'Mon - Fri: 08:00 - 17:00, Sat: 08:00 - 14:00');
    assert.equal(settings.openNow, true);
  });
});
