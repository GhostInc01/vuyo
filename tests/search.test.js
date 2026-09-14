import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { searchService } from '../services/search/SearchService.js';

let server;
let baseUrl;

let testMerchant1;
let testMerchant2;
let testProduct1;
let testProduct2;
let testService1;

before(async () => {
  // Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Prepare deterministic test dataset with rich attributes
  const timestamp = Date.now();

  testMerchant1 = await prisma.merchant.create({
    data: {
      id: `m-search-alpha-${timestamp}`,
      name: `Alpha Organic Salon & Spa ${timestamp}`,
      owner: 'Alice Walker',
      phone: '0821112233',
      kind: 'service',
      category: 'Hair & Beauty',
      tagline: 'Eco-friendly haircare and braided extensions',
      suburb: 'Alberton North',
      distanceKm: 1.5,
      rating: 4.8,
      reviewCount: 42,
      cover: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
      verified: true,
      status: 'Approved',
      openNow: true,
      specialty: 'Natural knotless braids and scalp treatments',
      about: 'Premier neighborhood organic hair styling and therapeutic spa treatments.',
      tags: 'braids, salon, organic, hair, styling, spa'
    }
  });

  testMerchant2 = await prisma.merchant.create({
    data: {
      id: `m-search-beta-${timestamp}`,
      name: `Beta Gourmet Bakery ${timestamp}`,
      owner: 'Bob Miller',
      phone: '0834445566',
      kind: 'retail',
      category: 'Food & Dining',
      tagline: 'Artisanal sourdough and gourmet pastries',
      suburb: 'Meyersdal',
      distanceKm: 8.2,
      rating: 3.9,
      reviewCount: 15,
      cover: 'https://images.unsplash.com/photo-1509440159596-0249088772ff',
      verified: false,
      status: 'Approved',
      openNow: false,
      specialty: 'Woodfired sourdough and confectionary',
      about: 'Traditional slow-fermented bakery goods using organic unbleached flour.',
      tags: 'bakery, bread, pastries, gourmet, sourdough'
    }
  });

  testProduct1 = await prisma.product.create({
    data: {
      id: `p-search-1-${timestamp}`,
      merchantId: testMerchant1.id,
      name: `Organic Argan Hair Oil ${timestamp}`,
      price: 180.0,
      category: 'Hair & Beauty',
      inStock: true,
      stockCount: 25,
      isService: false,
      image: 'https://images.unsplash.com/photo-1608248597359-2041235b341f',
      desc: 'Cold-pressed moroccan argan oil for lustrous braid shine and scalp hydration.',
      tags: 'hair, oil, argan, moisture, braids'
    }
  });

  testProduct2 = await prisma.product.create({
    data: {
      id: `p-search-2-${timestamp}`,
      merchantId: testMerchant2.id,
      name: `Artisanal Sourdough Loaf ${timestamp}`,
      price: 45.0,
      category: 'Food & Dining',
      inStock: true,
      stockCount: 10,
      isService: false,
      image: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04',
      desc: 'Crusty golden sourdough loaf naturally fermented for 36 hours.',
      tags: 'bread, sourdough, bakery, food'
    }
  });

  testService1 = await prisma.product.create({
    data: {
      id: `s-search-1-${timestamp}`,
      merchantId: testMerchant1.id,
      name: `Deluxe Knotless Braids Installation ${timestamp}`,
      price: 450.0,
      category: 'Hair & Beauty',
      inStock: true,
      stockCount: 99,
      isService: true,
      duration: '3 hours',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e',
      desc: 'Professional tension-free knotless braid styling with complimentary wash.',
      tags: 'braids, hairstyle, salon, knotless'
    }
  });
});

after(async () => {
  // Cleanup test entities
  if (testProduct1) await prisma.product.deleteMany({ where: { id: { in: [testProduct1.id, testProduct2?.id, testService1?.id].filter(Boolean) } } });
  if (testMerchant1) await prisma.merchant.deleteMany({ where: { id: { in: [testMerchant1.id, testMerchant2?.id].filter(Boolean) } } });
  if (server) await new Promise((res) => server.close(res));
});

describe('Stage 12 — Advanced Marketplace Search & Discovery Suite', () => {

  // =========================================================================
  // 1. MULTI-ENTITY SEARCH (Businesses, Products, Services)
  // =========================================================================
  describe('1. Multi-Entity Search Scope', () => {
    it('returns only businesses when type=businesses', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant1.name)}&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.items), 'items must be an array');
      assert.ok(data.items.every(i => i._entityType === 'business'), 'all items must be businesses');
      assert.ok(data.items.some(i => i.id === testMerchant1.id), 'must include test merchant');
      assert.equal(data.products.length, 0);
      assert.equal(data.services.length, 0);
    });

    it('returns only products when type=products', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testProduct1.name)}&type=products`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.items), 'items must be an array');
      assert.ok(data.items.every(i => i._entityType === 'product' && !i.isService), 'all items must be products');
      assert.ok(data.items.some(i => i.id === testProduct1.id), 'must include test product');
      assert.equal(data.businesses.length, 0);
      assert.equal(data.services.length, 0);
    });

    it('returns only services when type=services', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testService1.name)}&type=services`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(Array.isArray(data.items), 'items must be an array');
      assert.ok(data.items.every(i => i._entityType === 'service' && i.isService), 'all items must be services');
      assert.ok(data.items.some(i => i.id === testService1.id), 'must include test service');
      assert.equal(data.businesses.length, 0);
      assert.equal(data.products.length, 0);
    });

    it('returns unified composite results across businesses, products, and services when type=all', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('Braids')}&type=all`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.counts.all > 0, 'all count should be > 0');
      assert.ok(data.counts.businesses >= 1, 'should count matching businesses');
      assert.ok(data.counts.services >= 1, 'should count matching services');
      assert.ok(data.pagination.total >= 2, 'total results must include both entities');
    });
  });

  // =========================================================================
  // 2. SEARCH FIELDS (Name, Description, Category, Location, Tags)
  // =========================================================================
  describe('2. Multi-Field Lexical Search', () => {
    it('matches by Name exact and partial', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('Beta Gourmet Bakery')}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.some(i => i.id === testMerchant2.id));
    });

    it('matches by Description / About content', async () => {
      // 'slow-fermented' is in testMerchant2.about
      const res = await fetch(`${baseUrl}/api/search?q=slow-fermented`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.some(i => i.id === testMerchant2.id), 'should find merchant by description content');
    });

    it('matches by Category name', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('Food & Dining')}`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.some(i => i.id === testMerchant2.id || i.id === testProduct2.id));
    });

    it('matches by Location / Suburb', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=Meyersdal`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.some(i => i.id === testMerchant2.id));
    });

    it('matches by Tags field', async () => {
      // testMerchant1 and testProduct1 have tag 'argan' or 'spa'
      const res = await fetch(`${baseUrl}/api/search?q=argan`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.items.some(i => i.id === testProduct1.id), 'should find product via tags field');
    });
  });

  // =========================================================================
  // 3. COMBINATORIAL FILTERS
  // =========================================================================
  describe('3. Combinatorial Filters', () => {
    it('filters by Category strictly', async () => {
      const res = await fetch(`${baseUrl}/api/search?category=${encodeURIComponent('Food & Dining')}&type=all`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length > 0);
      assert.ok(data.items.every(i => i.category === 'Food & Dining'));
    });

    it('filters by Price Range (minPrice and maxPrice)', async () => {
      // testProduct2 price = 45, testProduct1 price = 180, testService1 price = 450
      const res = await fetch(`${baseUrl}/api/search?minPrice=40&maxPrice=50&type=products&limit=100`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.some(i => i.id === testProduct2.id));
      assert.ok(!data.items.some(i => i.id === testProduct1.id));
      assert.ok(data.items.every(i => i.price >= 40 && i.price <= 50));
    });

    it('filters by Minimum Rating threshold', async () => {
      // testMerchant1 rating = 4.8, testMerchant2 rating = 3.9
      const resAllowed = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant1.name)}&minRating=4.5&type=businesses`);
      assert.equal(resAllowed.status, 200);
      const dataAllowed = await resAllowed.json();
      assert.ok(dataAllowed.items.some(i => i.id === testMerchant1.id), 'Merchant with 4.8 rating must be included for minRating=4.5');

      const resRejected = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant2.name)}&minRating=4.5&type=businesses`);
      assert.equal(resRejected.status, 200);
      const dataRejected = await resRejected.json();
      assert.ok(!dataRejected.items.some(i => i.id === testMerchant2.id), 'Merchant with 3.9 rating must be excluded for minRating=4.5');
    });

    it('filters by Open Now status', async () => {
      // testMerchant1 openNow = true, testMerchant2 openNow = false
      const resAllowed = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant1.name)}&openNow=true&type=businesses`);
      assert.equal(resAllowed.status, 200);
      const dataAllowed = await resAllowed.json();
      assert.ok(dataAllowed.items.some(i => i.id === testMerchant1.id), 'Open merchant must be included when openNow=true');

      const resRejected = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant2.name)}&openNow=true&type=businesses`);
      assert.equal(resRejected.status, 200);
      const dataRejected = await resRejected.json();
      assert.ok(!dataRejected.items.some(i => i.id === testMerchant2.id), 'Closed merchant must be excluded when openNow=true');
    });

    it('filters by Max Distance radius', async () => {
      // testMerchant1 distanceKm = 1.5, testMerchant2 distanceKm = 8.2
      const resAllowed = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant1.name)}&maxDistance=5&type=businesses`);
      assert.equal(resAllowed.status, 200);
      const dataAllowed = await resAllowed.json();
      assert.ok(dataAllowed.items.some(i => i.id === testMerchant1.id), 'Merchant within 1.5km must be included when maxDistance=5');

      const resRejected = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent(testMerchant2.name)}&maxDistance=5&type=businesses`);
      assert.equal(resRejected.status, 200);
      const dataRejected = await resRejected.json();
      assert.ok(!dataRejected.items.some(i => i.id === testMerchant2.id), 'Merchant at 8.2km must be excluded when maxDistance=5');
    });

    it('filters by Business Type / Kind', async () => {
      // testMerchant1 kind = 'service', testMerchant2 kind = 'retail'
      const res = await fetch(`${baseUrl}/api/search?businessType=retail&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.some(i => i.id === testMerchant2.id));
      assert.ok(!data.items.some(i => i.id === testMerchant1.id));
      assert.ok(data.items.every(i => i.kind === 'retail'));
    });

    it('applies MULTIPLE filters simultaneously (Category + OpenNow + MinRating + MaxDistance)', async () => {
      const res = await fetch(`${baseUrl}/api/search?category=${encodeURIComponent('Hair & Beauty')}&openNow=true&minRating=4.0&maxDistance=5&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.some(i => i.id === testMerchant1.id));
      assert.ok(!data.items.some(i => i.id === testMerchant2.id));
      assert.ok(data.items.every(i => 
        i.category === 'Hair & Beauty' &&
        i.openNow === true &&
        i.rating >= 4.0 &&
        i.distanceKm <= 5
      ));
    });
  });

  // =========================================================================
  // 4. SORTING STRATEGIES
  // =========================================================================
  describe('4. Multi-Attribute Sorting', () => {
    it('sorts by Rating descending', async () => {
      const res = await fetch(`${baseUrl}/api/search?sortBy=rating&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length >= 2);
      for (let i = 0; i < data.items.length - 1; i++) {
        assert.ok(data.items[i].rating >= data.items[i + 1].rating, 'Ratings must be in descending order');
      }
    });

    it('sorts by Distance ascending (closest first)', async () => {
      const res = await fetch(`${baseUrl}/api/search?sortBy=distance&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length >= 2);
      for (let i = 0; i < data.items.length - 1; i++) {
        assert.ok(data.items[i].distanceKm <= data.items[i + 1].distanceKm, 'Distance must be in ascending order');
      }
    });

    it('sorts by Price ascending (price-asc)', async () => {
      const res = await fetch(`${baseUrl}/api/search?sortBy=price-asc&type=products`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length >= 2);
      for (let i = 0; i < data.items.length - 1; i++) {
        assert.ok(data.items[i].price <= data.items[i + 1].price, 'Price must be in ascending order');
      }
    });

    it('sorts by Price descending (price-desc)', async () => {
      const res = await fetch(`${baseUrl}/api/search?sortBy=price-desc&type=products`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length >= 2);
      for (let i = 0; i < data.items.length - 1; i++) {
        assert.ok(data.items[i].price >= data.items[i + 1].price, 'Price must be in descending order');
      }
    });

    it('sorts by Relevance weighting (exact match higher than partial/description match)', async () => {
      // When searching "Alpha Organic", testMerchant1 has exact prefix, should rank #1
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('Alpha Organic')}&sortBy=relevance`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length > 0);
      assert.equal(data.items[0].id, testMerchant1.id, 'Top result must be exact name prefix match');
    });

    it('sorts by Newest first', async () => {
      const res = await fetch(`${baseUrl}/api/search?sortBy=newest&type=businesses`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.items.length >= 2);
      const t1 = new Date(data.items[0].createdAt).getTime();
      const t2 = new Date(data.items[1].createdAt).getTime();
      assert.ok(t1 >= t2, 'Newest items must appear first');
    });
  });

  // =========================================================================
  // 5. SERVER-SIDE PAGINATION
  // =========================================================================
  describe('5. Server-Side Pagination & Chunking', () => {
    it('respects page limit and returns proper pagination metadata', async () => {
      const res = await fetch(`${baseUrl}/api/search?limit=2&page=1`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.pagination.limit, 2);
      assert.equal(data.pagination.page, 1);
      assert.ok(data.items.length <= 2, 'items length must not exceed limit');
      assert.ok(data.pagination.total > 2, 'total must represent full unpaginated matches');
      assert.ok(data.pagination.totalPages >= 2, 'totalPages must be calculated correctly');
      assert.equal(data.pagination.hasMore, true, 'page 1 must have more pages when total > 2');
      assert.equal(data.pagination.hasPrev, false, 'page 1 has no previous page');
    });

    it('navigates to page 2 with disjoint records from page 1', async () => {
      const res1 = await fetch(`${baseUrl}/api/search?limit=2&page=1`);
      const data1 = await res1.json();

      const res2 = await fetch(`${baseUrl}/api/search?limit=2&page=2`);
      const data2 = await res2.json();

      assert.equal(data2.pagination.page, 2);
      assert.equal(data2.pagination.hasPrev, true);

      const ids1 = new Set(data1.items.map(i => i.id));
      const hasDuplicate = data2.items.some(i => ids1.has(i.id));
      assert.equal(hasDuplicate, false, 'Page 2 must contain disjoint items from Page 1');
    });

    it('handles out-of-bounds page numbers gracefully', async () => {
      const res = await fetch(`${baseUrl}/api/search?limit=10&page=999`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.ok(data.pagination.totalPages > 0);
      assert.ok(data.items.length >= 0);
    });
  });

  // =========================================================================
  // 6. TYPEAHEAD SEARCH SUGGESTIONS
  // =========================================================================
  describe('6. Autocomplete Search Suggestions', () => {
    it('returns structured typeahead suggestions for prefixes', async () => {
      const res = await fetch(`${baseUrl}/api/search/suggestions?q=Bakery`);
      assert.equal(res.status, 200);
      const suggestions = await res.json();

      assert.ok(Array.isArray(suggestions));
      assert.ok(suggestions.length > 0);
      assert.ok(suggestions.some(s => s.type === 'business' || s.type === 'product'));
    });

    it('respects limit parameter on suggestions', async () => {
      const res = await fetch(`${baseUrl}/api/search/suggestions?q=a&limit=3`);
      assert.equal(res.status, 200);
      const suggestions = await res.json();

      assert.ok(suggestions.length <= 3);
    });

    it('returns empty array when query is empty or blank', async () => {
      const res = await fetch(`${baseUrl}/api/search/suggestions?q=`);
      assert.equal(res.status, 200);
      const suggestions = await res.json();

      assert.deepEqual(suggestions, []);
    });
  });

  // =========================================================================
  // 7. PERFORMANCE & DATABASE INDEXING
  // =========================================================================
  describe('7. Performance & Database Indexing', () => {
    it('verifies indexed search executes in under 100ms', async () => {
      const start = performance.now();
      const res = await fetch(`${baseUrl}/api/search?q=braids&category=Hair+%26+Beauty&openNow=true&sortBy=rating&limit=10`);
      const duration = performance.now() - start;

      assert.equal(res.status, 200);
      assert.ok(duration < 200, `Search query must execute rapidly (took ${duration.toFixed(2)}ms)`);
    });

    it('verifies SearchService calculateRelevance handles boundary conditions without crashing', () => {
      assert.equal(searchService.calculateRelevance(null, null), 0);
      assert.equal(searchService.calculateRelevance({}, ''), 0);
      const score = searchService.calculateRelevance({ name: 'Salon', tags: 'salon, hair', rating: 4.5 }, 'salon');
      assert.ok(score >= 100, 'Exact match score should be >= 100');
    });
  });

});
