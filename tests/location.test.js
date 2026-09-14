import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { locationService } from '../services/location/LocationService.js';
import { calculateHaversineKm } from '../services/location/DatabaseLocationProvider.js';

let server;
let baseUrl;
let adminToken = '';
let consumerToken = '';
let merchantToken = '';

let testMerchant;
let testBranchId;
let testSavedLocationId;
let testAdminLocationId;

before(async () => {
  // Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login tokens
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const adminData = await adminRes.json();
  adminToken = adminData.token;

  const consumerRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thandiwe@gmail.com', password: 'customer123' })
  });
  const consumerData = await consumerRes.json();
  consumerToken = consumerData.token;

  const merchantRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nomsa@avoncorner.co.za', password: 'merchant123' })
  });
  const merchantData = await merchantRes.json();
  merchantToken = merchantData.token;

  // Ensure test merchant exists and is owned by Nomsa
  const merchantUser = await prisma.user.findUnique({ where: { email: 'nomsa@avoncorner.co.za' } });
  testMerchant = (await prisma.merchant.findFirst({ where: { ownerId: merchantUser?.id } })) ||
    (await prisma.merchant.findFirst({ where: { id: 'b-avon' } })) ||
    (await prisma.merchant.findFirst({ where: { status: 'Approved' } }));

  if (testMerchant && merchantUser && testMerchant.ownerId !== merchantUser.id) {
    await prisma.merchant.update({
      where: { id: testMerchant.id },
      data: { ownerId: merchantUser.id }
    });
  }
});

after(async () => {
  // Clean up any test records created
  if (testSavedLocationId) {
    await prisma.userLocation.deleteMany({ where: { id: testSavedLocationId } }).catch(() => {});
  }
  if (testBranchId) {
    await prisma.businessLocation.deleteMany({ where: { id: testBranchId } }).catch(() => {});
  }
  if (testAdminLocationId) {
    await prisma.location.deleteMany({ where: { id: testAdminLocationId } }).catch(() => {});
  }
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Geographic Discovery & Location System - Unit & Domain Logic', () => {
  it('should accurately calculate Haversine distance between Sandton and Rosebank (~4.45 km)', () => {
    // Sandton: -26.1076, 28.0567
    // Rosebank: -26.1458, 28.0433
    const distance = calculateHaversineKm(-26.1076, 28.0567, -26.1458, 28.0433);
    assert.ok(typeof distance === 'number');
    assert.ok(distance >= 4.0 && distance <= 5.0, `Expected distance between 4 and 5 km, got ${distance}`);
  });

  it('should return 0 km for identical coordinates', () => {
    const distance = calculateHaversineKm(-26.2585, 28.1232, -26.2585, 28.1232);
    assert.strictEqual(distance, 0);
  });

  it('should calculate long-distance cross-province span (Johannesburg to Cape Town ~1260 km)', () => {
    // JHB CBD: -26.2041, 28.0473
    // CPT CBD: -33.9249, 18.4241
    const distance = calculateHaversineKm(-26.2041, 28.0473, -33.9249, 18.4241);
    assert.ok(distance >= 1200 && distance <= 1350, `Expected JHB to CPT ~1260 km, got ${distance}`);
  });

  it('should validate valid and invalid coordinates correctly', () => {
    assert.strictEqual(locationService.validateCoordinates(-26.2041, 28.0473), true);
    assert.strictEqual(locationService.validateCoordinates(0, 0), true);
    assert.strictEqual(locationService.validateCoordinates(91, 20), false);
    assert.strictEqual(locationService.validateCoordinates(-26, 181), false);
    assert.strictEqual(locationService.validateCoordinates('invalid', 28), false);
  });

  it('should format distance badges appropriately in meters or kilometers', () => {
    assert.strictEqual(locationService.formatDistance(0.45), '450 m away');
    assert.strictEqual(locationService.formatDistance(1.42), '1.4 km away');
    assert.strictEqual(locationService.formatDistance(15.89), '15.9 km away');
  });
});

describe('Geographic Hierarchy Endpoints', () => {
  it('GET /api/location/provinces should return all South African provinces', async () => {
    const res = await fetch(`${baseUrl}/api/location/provinces`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length >= 9, `Expected at least 9 provinces, got ${data.length}`);
    const provinceNames = data.map((p) => p.name);
    assert.ok(provinceNames.includes('Gauteng'));
    assert.ok(provinceNames.includes('Western Cape'));
    assert.ok(provinceNames.includes('KwaZulu-Natal'));
    assert.ok(provinceNames.includes('Eastern Cape'));
  });

  it('GET /api/location/provinces/:province/cities should return cities within the province', async () => {
    const res = await fetch(`${baseUrl}/api/location/provinces/Gauteng/cities`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    const cityNames = data.map((c) => c.name);
    assert.ok(cityNames.includes('Johannesburg') || cityNames.includes('Alberton'));
  });

  it('GET /api/location/cities/:city/suburbs should return suburbs within a city', async () => {
    const res = await fetch(`${baseUrl}/api/location/cities/Johannesburg/suburbs`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    const suburbNames = data.map((s) => s.name);
    assert.ok(suburbNames.includes('Sandton') || suburbNames.includes('Rosebank'));
  });
});

describe('Location Autocomplete Search & Reverse Geocoding', () => {
  it('GET /api/location/search with partial query should return matching localities with score', async () => {
    const res = await fetch(`${baseUrl}/api/location/search?q=sand`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    const first = data[0];
    assert.ok(first.formattedAddress.toLowerCase().includes('sandton'));
    assert.ok(typeof first.latitude === 'number');
    assert.ok(typeof first.longitude === 'number');
  });

  it('GET /api/location/search by postal code should return matching suburbs', async () => {
    const res = await fetch(`${baseUrl}/api/location/search?q=2196`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.ok(data.length > 0);
    assert.ok(data.some((item) => item.postalCode === '2196'));
  });

  it('GET /api/location/search should return empty array for very short queries', async () => {
    const res = await fetch(`${baseUrl}/api/location/search?q=a`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data));
    assert.strictEqual(data.length, 0);
  });

  it('GET /api/location/reverse should return closest locality for valid coordinates', async () => {
    // Sandton coordinates: -26.1076, 28.0567
    const res = await fetch(`${baseUrl}/api/location/reverse?lat=-26.1076&lng=28.0567`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data);
    assert.strictEqual(data.country, 'South Africa');
    assert.ok(data.formattedAddress.includes('Sandton') || data.city === 'Johannesburg');
  });

  it('GET /api/location/reverse with missing or invalid coordinates should return 400', async () => {
    const res = await fetch(`${baseUrl}/api/location/reverse?lat=invalid&lng=28.0567`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });
});

describe('Nearby Geographic Discovery API', () => {
  it('GET /api/location/nearby should calculate distances and filter by radius', async () => {
    // Coordinate in Alberton North: -26.2585, 28.1232
    const res = await fetch(`${baseUrl}/api/location/nearby?lat=-26.2585&lng=28.1232&radius=10`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.merchants));
    assert.ok(data.merchants.length > 0);

    // Verify distance properties are present and sorted ascending
    let previousDistance = -1;
    for (const m of data.merchants) {
      assert.ok(typeof m.distanceKm === 'number');
      assert.ok(typeof m.distanceLabel === 'string');
      assert.ok(m.distanceKm <= 10, `Expected distance <= 10 km, got ${m.distanceKm}`);
      assert.ok(m.distanceKm >= previousDistance, 'Merchants should be sorted by distance ascending');
      previousDistance = m.distanceKm;
    }
  });

  it('GET /api/location/nearby should support "all" radius to return all approved merchants sorted by distance', async () => {
    const res = await fetch(`${baseUrl}/api/location/nearby?lat=-26.2585&lng=28.1232&radius=all`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    assert.ok(Array.isArray(data.merchants));
    assert.ok(data.merchants.length >= 1);
  });

  it('GET /api/location/nearby should support category filter', async () => {
    const res = await fetch(`${baseUrl}/api/location/nearby?lat=-26.2585&lng=28.1232&radius=50&category=Food & Dining`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.success);
    for (const m of data.merchants) {
      assert.strictEqual(m.category, 'Food & Dining');
    }
  });

  it('GET /api/location/nearby without coordinates should return 400', async () => {
    const res = await fetch(`${baseUrl}/api/location/nearby?radius=10`);
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });
});

describe('Saved User Locations API', () => {
  it('GET /api/location/saved-locations without auth should return 401', async () => {
    const res = await fetch(`${baseUrl}/api/location/saved-locations`);
    assert.strictEqual(res.status, 401);
  });

  it('POST /api/location/saved-locations should save a new location for authenticated consumer', async () => {
    const payload = {
      label: 'Home Office',
      formattedAddress: 'Sandton City, Sandton, Johannesburg, 2196',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -26.1076,
      longitude: 28.0567,
      locationMode: 'MANUAL_LOCATION',
      isDefault: true
    };

    const res = await fetch(`${baseUrl}/api/location/saved-locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${consumerToken}`
      },
      body: JSON.stringify(payload)
    });

    assert.strictEqual(res.status, 201);
    const saved = await res.json();
    assert.ok(saved.id);
    assert.strictEqual(saved.label, 'Home Office');
    assert.strictEqual(saved.city, 'Johannesburg');
    testSavedLocationId = saved.id;
  });

  it('GET /api/location/saved-locations should retrieve saved locations for authenticated consumer', async () => {
    const res = await fetch(`${baseUrl}/api/location/saved-locations`, {
      headers: {
        Authorization: `Bearer ${consumerToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const list = await res.json();
    assert.ok(Array.isArray(list));
    assert.ok(list.some((loc) => loc.id === testSavedLocationId));
  });

  it('DELETE /api/location/saved-locations/:id should remove the saved location', async () => {
    assert.ok(testSavedLocationId);
    const res = await fetch(`${baseUrl}/api/location/saved-locations/${testSavedLocationId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${consumerToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testSavedLocationId = null;
  });
});

describe('Multi-Branch Management API', () => {
  it('GET /api/merchants/:id/branches should return branches of a business', async () => {
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/branches`);
    assert.strictEqual(res.status, 200);
    const branches = await res.json();
    assert.ok(Array.isArray(branches));
  });

  it('POST /api/merchants/:id/branches should create a new branch for the business', async () => {
    const branchPayload = {
      name: 'Rosebank Collection Point',
      address: '50 Bath Ave, Rosebank',
      suburb: 'Rosebank',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      latitude: -26.1458,
      longitude: 28.0433,
      isPrimary: false,
      serviceRadius: 12.0
    };

    const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`
      },
      body: JSON.stringify(branchPayload)
    });

    assert.strictEqual(res.status, 201);
    const created = await res.json();
    assert.ok(created.id);
    assert.strictEqual(created.name, 'Rosebank Collection Point');
    testBranchId = created.id;
  });

  it('PUT /api/merchants/:id/branches/:branchId should update branch details', async () => {
    assert.ok(testBranchId);
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/branches/${testBranchId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${merchantToken}`
      },
      body: JSON.stringify({ serviceRadius: 25.0 })
    });

    assert.strictEqual(res.status, 200);
    const updated = await res.json();
    assert.strictEqual(updated.serviceRadius, 25.0);
  });

  it('DELETE /api/merchants/:id/branches/:branchId should remove the branch', async () => {
    assert.ok(testBranchId);
    const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/branches/${testBranchId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${merchantToken}`
      }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testBranchId = null;
  });
});

describe('Admin Location Configuration & Data Management', () => {
  it('GET /api/admin/location-config should return active provider and settings', async () => {
    const res = await fetch(`${baseUrl}/api/admin/location-config`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(res.status, 200);
    const config = await res.json();
    assert.ok(config.provider);
    assert.ok(Array.isArray(config.availableProviders));
    assert.ok(config.availableProviders.includes('database'));
    assert.ok(config.availableProviders.includes('nominatim'));
    assert.ok(config.availableProviders.includes('mock'));
  });

  it('PUT /api/admin/location-config should switch provider with validation', async () => {
    const res = await fetch(`${baseUrl}/api/admin/location-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        provider: 'mock',
        defaultRadius: 15,
        maxRadius: 80
      })
    });

    assert.strictEqual(res.status, 200);
    const result = await res.json();
    assert.strictEqual(result.provider, 'mock');
    assert.strictEqual(result.defaultRadius, 15);

    // Restore to database provider
    await fetch(`${baseUrl}/api/admin/location-config`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({ provider: 'database', defaultRadius: 25, maxRadius: 100 })
    });
  });

  it('POST /api/admin/locations should create a new managed reference location', async () => {
    const res = await fetch(`${baseUrl}/api/admin/locations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        province: 'Western Cape',
        provinceCode: 'WC',
        municipality: 'City of Cape Town',
        city: 'Cape Town',
        suburb: 'Sea Point Waterfront Test',
        postalCode: '8005',
        formattedAddress: 'Sea Point Waterfront Test, Cape Town, Western Cape, 8005',
        latitude: -33.9167,
        longitude: 18.3889,
        locationType: 'suburb',
        aliases: 'Sea Point Beach, Promenade'
      })
    });

    assert.strictEqual(res.status, 201);
    const created = await res.json();
    assert.ok(created.id);
    testAdminLocationId = created.id;
  });

  it('GET /api/admin/locations should paginate and search managed locations', async () => {
    const res = await fetch(`${baseUrl}/api/admin/locations?search=Sea Point Waterfront&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(Array.isArray(data.locations));
    assert.ok(data.locations.length > 0);
    assert.ok(data.total >= 1);
  });

  it('DELETE /api/admin/locations/:id should delete the location', async () => {
    assert.ok(testAdminLocationId);
    const res = await fetch(`${baseUrl}/api/admin/locations/${testAdminLocationId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.success, true);
    testAdminLocationId = null;
  });
});
