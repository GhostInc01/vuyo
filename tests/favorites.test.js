import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { favouriteService } from '../services/favourite/FavouriteService.js';

let server;
let baseUrl;

let consumer1Token = '';
let consumer1User = null;

let consumer2Token = '';
let consumer2User = null;

let adminToken = '';
let adminUser = null;

let testMerchant = null;
let testProduct = null;
let testService = null;

before(async () => {
  // 1. Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 2. Authenticate Consumer 1 (thandiwe@gmail.com)
  const c1Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thandiwe@gmail.com', password: 'customer123' })
  });
  const c1Data = await c1Res.json();
  consumer1Token = c1Data.token;
  consumer1User = c1Data.user;

  // 3. Authenticate Consumer 2 (sipho@gmail.com)
  let c2Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sipho@gmail.com', password: 'customer123' })
  });
  if (!c2Res.ok) {
    const regRes = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sipho Zulu',
        email: 'sipho@gmail.com',
        password: 'customer123',
        role: 'consumer'
      })
    });
    const regData = await regRes.json();
    consumer2Token = regData.token;
    consumer2User = regData.user;
  } else {
    const c2Data = await c2Res.json();
    consumer2Token = c2Data.token;
    consumer2User = c2Data.user;
  }

  // 4. Authenticate Admin (admin@localbiz.co.za)
  const aRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;

  // 5. Seed test merchant, product, and service
  const timestamp = Date.now();
  testMerchant = await prisma.merchant.create({
    data: {
      id: `m-fav-${timestamp}`,
      name: `Fav Cafe & Workshop ${timestamp}`,
      owner: 'Elena Rostova',
      phone: '0825551234',
      kind: 'hybrid',
      category: 'Food & Dining',
      tagline: 'Artisanal roastery and barista masterclasses',
      specialty: 'Artisanal Coffee & Masterclasses',
      about: 'Specialty coffee roasters and barista training workshops in Alberton.',
      suburb: 'Alberton North',
      distanceKm: 2.1,
      rating: 4.9,
      reviewCount: 30,
      cover: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb',
      verified: true,
      status: 'Approved',
      openNow: true
    }
  });

  testProduct = await prisma.product.create({
    data: {
      id: `p-fav-item-${timestamp}`,
      name: `Signature Espresso Beans 1kg ${timestamp}`,
      category: 'Coffee Beans',
      desc: 'Freshly roasted single-origin Ethiopian espresso beans.',
      price: 240.0,
      image: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e',
      inStock: true,
      isService: false,
      merchantId: testMerchant.id
    }
  });

  testService = await prisma.product.create({
    data: {
      id: `s-fav-service-${timestamp}`,
      name: `Barista Latte Art Masterclass ${timestamp}`,
      category: 'Workshop',
      desc: 'Hands-on latte art masterclass with certified baristas.',
      price: 650.0,
      duration: '3 hours',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd',
      inStock: true,
      isService: true,
      merchantId: testMerchant.id
    }
  });

  // Clean any old test favorites for these test users
  await prisma.favourite.deleteMany({
    where: {
      userId: { in: [consumer1User.id, consumer2User.id] }
    }
  });
});

after(async () => {
  // Cleanup test entities
  try {
    await prisma.favourite.deleteMany({
      where: {
        userId: { in: [consumer1User.id, consumer2User.id] }
      }
    });
    if (testProduct) await prisma.product.delete({ where: { id: testProduct.id } });
    if (testService) await prisma.product.delete({ where: { id: testService.id } });
    if (testMerchant) await prisma.merchant.delete({ where: { id: testMerchant.id } });
  } catch (e) {
    // Ignore cleanup errors
  }

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('STAGE 13 — FAVORITES TEST SUITE', () => {

  // -------------------------------------------------------------
  // 1. Authentication & Security Guardrails
  // -------------------------------------------------------------
  describe('1. Authentication & Scoping Guardrails', () => {
    it('GET /api/favourites requires authentication (401)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`);
      assert.equal(res.status, 401, 'Unauthenticated GET should return 401');
      const data = await res.json();
      assert.ok(data.error);
    });

    it('POST /api/favourites requires authentication (401)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: testMerchant.id })
      });
      assert.equal(res.status, 401, 'Unauthenticated POST should return 401');
    });

    it('DELETE /api/favourites/:id requires authentication (401)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/some-id`, {
        method: 'DELETE'
      });
      assert.equal(res.status, 401, 'Unauthenticated DELETE should return 401');
    });

    it('GET /api/favourites/status requires authentication (401)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?merchantId=${testMerchant.id}`);
      assert.equal(res.status, 401, 'Unauthenticated status check should return 401');
    });

    it('Users can only view their own favorites (403 when requesting another userId)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?userId=${consumer2User.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 403, 'Consumer 1 requesting Consumer 2 favorites should receive 403 Forbidden');
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('Users can only modify their own favorites (403 when posting with another userId)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          userId: consumer2User.id,
          merchantId: testMerchant.id
        })
      });
      assert.equal(res.status, 403, 'Posting with another userId should receive 403 Forbidden');
    });
  });

  // -------------------------------------------------------------
  // 2. Add Favorites (Business, Product, Service)
  // -------------------------------------------------------------
  describe('2. Add Favorites Across Entities', () => {
    it('Adds a Business to consumer favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: testMerchant.id
        })
      });

      assert.equal(res.status, 201, 'Should return 201 Created');
      const data = await res.json();
      assert.equal(data.action, 'added');
      assert.ok(data.favourite);
      assert.equal(data.favourite.merchantId, testMerchant.id);
      assert.equal(data.favourite.entityType, 'business');
      assert.ok(data.favourite.merchant);
      assert.equal(data.favourite.merchant.name, testMerchant.name);
    });

    it('Adds a Product to consumer favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          productId: testProduct.id
        })
      });

      assert.equal(res.status, 201, 'Should return 201 Created');
      const data = await res.json();
      assert.equal(data.action, 'added');
      assert.ok(data.favourite);
      assert.equal(data.favourite.productId, testProduct.id);
      assert.equal(data.favourite.entityType, 'product');
      assert.ok(data.favourite.product);
      assert.equal(data.favourite.product.isService, false);
    });

    it('Adds a Service to consumer favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          productId: testService.id
        })
      });

      assert.equal(res.status, 201, 'Should return 201 Created');
      const data = await res.json();
      assert.equal(data.action, 'added');
      assert.ok(data.favourite);
      assert.equal(data.favourite.productId, testService.id);
      assert.equal(data.favourite.entityType, 'service');
      assert.ok(data.favourite.product);
      assert.equal(data.favourite.product.isService, true);
    });

    it('Rejects add when neither merchantId nor productId is provided (400)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({})
      });

      assert.equal(res.status, 400, 'Should reject with 400 Bad Request');
    });

    it('Rejects add for non-existent merchant (404)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({ merchantId: 'm-non-existent-99999' })
      });

      assert.equal(res.status, 404, 'Should reject with 404 Not Found');
    });

    it('Rejects add for non-existent product (404)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({ productId: 'p-non-existent-99999' })
      });

      assert.equal(res.status, 404, 'Should reject with 404 Not Found');
    });
  });

  // -------------------------------------------------------------
  // 3. Duplicate Prevention
  // -------------------------------------------------------------
  describe('3. Duplicate Prevention', () => {
    it('Rejects duplicate Business favorite with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: testMerchant.id
        })
      });

      assert.equal(res.status, 409, 'Duplicate business should return 409 Conflict');
      const data = await res.json();
      assert.match(data.error, /duplicate/i);
    });

    it('Rejects duplicate Product favorite with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          productId: testProduct.id
        })
      });

      assert.equal(res.status, 409, 'Duplicate product should return 409 Conflict');
      const data = await res.json();
      assert.match(data.error, /duplicate/i);
    });

    it('Rejects duplicate Service favorite with 409 Conflict', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          productId: testService.id
        })
      });

      assert.equal(res.status, 409, 'Duplicate service should return 409 Conflict');
      const data = await res.json();
      assert.match(data.error, /duplicate/i);
    });
  });

  // -------------------------------------------------------------
  // 4. Check Favorite Status
  // -------------------------------------------------------------
  describe('4. Check Favorite Status', () => {
    it('Returns status { isFavourite: true } for saved business', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?merchantId=${testMerchant.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isFavourite, true);
      assert.equal(data.entityType, 'business');
      assert.ok(data.favouriteId);
    });

    it('Returns status { isFavourite: true } for saved product', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?productId=${testProduct.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isFavourite, true);
      assert.equal(data.entityType, 'product');
      assert.ok(data.favouriteId);
    });

    it('Returns status { isFavourite: true } for saved service', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?productId=${testService.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isFavourite, true);
      assert.equal(data.entityType, 'service');
      assert.ok(data.favouriteId);
    });

    it('Returns status { isFavourite: false } for unsaved entity', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?merchantId=m-unknown-999`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isFavourite, false);
      assert.equal(data.favouriteId, null);
      assert.equal(data.entityType, null);
    });

    it('Ensures Consumer 2 does not see Consumer 1 favorites as saved', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/status?merchantId=${testMerchant.id}`, {
        headers: { Authorization: `Bearer ${consumer2Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isFavourite, false, 'Consumer 2 should not have Consumer 1 favorites');
    });
  });

  // -------------------------------------------------------------
  // 5. Listing & Filtering Favorites
  // -------------------------------------------------------------
  describe('5. List & Filter Favorites', () => {
    it('GET /api/favourites returns all favorites for authenticated user', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const items = await res.json();
      assert.ok(Array.isArray(items));
      assert.equal(items.length, 3, 'Should have 3 favorites: 1 business, 1 product, 1 service');
    });

    it('GET /api/favourites?type=business returns only business favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?type=business`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const items = await res.json();
      assert.ok(items.length >= 1);
      assert.ok(items.every(i => i.entityType === 'business'));
      assert.ok(items.some(i => i.merchantId === testMerchant.id));
    });

    it('GET /api/favourites?type=product returns only product favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?type=product`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const items = await res.json();
      assert.ok(items.length >= 1);
      assert.ok(items.every(i => i.entityType === 'product'));
      assert.ok(items.some(i => i.productId === testProduct.id));
    });

    it('GET /api/favourites?type=service returns only service favorites', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?type=service`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const items = await res.json();
      assert.ok(items.length >= 1);
      assert.ok(items.every(i => i.entityType === 'service'));
      assert.ok(items.some(i => i.productId === testService.id));
    });

    it('Admin can view any users favorites with ?userId parameter', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?userId=${consumer1User.id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200, 'Admin should be permitted to view user favorites');
      const items = await res.json();
      assert.equal(items.length, 3);
    });
  });

  // -------------------------------------------------------------
  // 6. Remove Favorites & Ownership Verification
  // -------------------------------------------------------------
  describe('6. Remove Favorites & Ownership Verification', () => {
    let businessFavId = null;

    before(async () => {
      const statusRes = await fetch(`${baseUrl}/api/favourites/status?merchantId=${testMerchant.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      const statusData = await statusRes.json();
      businessFavId = statusData.favouriteId;
    });

    it('Consumer 2 cannot delete Consumer 1 favorite by ID (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/${businessFavId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consumer2Token}` }
      });
      assert.equal(res.status, 403, 'Should reject unauthorized removal with 403 Forbidden');
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('Consumer 1 can delete their own favorite by ID', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/${businessFavId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200, 'Should delete favorite successfully');
      const data = await res.json();
      assert.equal(data.action, 'removed');
      assert.equal(data.id, businessFavId);

      // Verify status is now false
      const checkRes = await fetch(`${baseUrl}/api/favourites/status?merchantId=${testMerchant.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      const checkData = await checkRes.json();
      assert.equal(checkData.isFavourite, false);
    });

    it('Deleting non-existent favorite ID returns 404', async () => {
      const res = await fetch(`${baseUrl}/api/favourites/fav-fake-id-123`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 404, 'Non-existent ID deletion should return 404');
    });

    it('Removes favorite by target entity (DELETE /api/favourites?productId=...)', async () => {
      const res = await fetch(`${baseUrl}/api/favourites?productId=${testProduct.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.action, 'removed');

      // Verify status is now false
      const checkRes = await fetch(`${baseUrl}/api/favourites/status?productId=${testProduct.id}`, {
        headers: { Authorization: `Bearer ${consumer1Token}` }
      });
      const checkData = await checkRes.json();
      assert.equal(checkData.isFavourite, false);
    });
  });

  // -------------------------------------------------------------
  // 7. Toggle Mode (UI compatibility)
  // -------------------------------------------------------------
  describe('7. Toggle Favorite Mode', () => {
    it('Toggles favorite ON when not present (action: "added")', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: testMerchant.id,
          toggle: true
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.action, 'added');
      assert.ok(data.favourite);
    });

    it('Toggles favorite OFF when present (action: "removed")', async () => {
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: testMerchant.id,
          toggle: true
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.action, 'removed');
      assert.ok(data.id);
    });
  });

  // -------------------------------------------------------------
  // 8. Direct Service Layer Tests (FavouriteService)
  // -------------------------------------------------------------
  describe('8. FavouriteService Domain Methods', () => {
    it('Requires userId in addFavourite', async () => {
      await assert.rejects(
        async () => {
          await favouriteService.addFavourite(null, { merchantId: testMerchant.id });
        },
        (err) => err.statusCode === 401
      );
    });

    it('Requires userId in removeFavourite', async () => {
      await assert.rejects(
        async () => {
          await favouriteService.removeFavourite(null, { merchantId: testMerchant.id });
        },
        (err) => err.statusCode === 401
      );
    });

    it('Requires userId in listFavourites', async () => {
      await assert.rejects(
        async () => {
          await favouriteService.listFavourites(null);
        },
        (err) => err.statusCode === 401
      );
    });

    it('Requires userId in checkStatus', async () => {
      await assert.rejects(
        async () => {
          await favouriteService.checkStatus(null, { merchantId: testMerchant.id });
        },
        (err) => err.statusCode === 401
      );
    });
  });
});
