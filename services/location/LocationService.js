import { PrismaClient } from '@prisma/client';
import { LocationProvider } from './LocationProvider.js';
import { DatabaseLocationProvider, calculateHaversineKm } from './DatabaseLocationProvider.js';
import { NominatimLocationProvider } from './NominatimLocationProvider.js';
import { MockLocationProvider } from './MockLocationProvider.js';

const defaultPrisma = new PrismaClient();

/**
 * LocationService
 * Central domain service for geospatial discovery, address search, geocoding,
 * distance calculation, service-area matching, and multi-branch resolution.
 */
export class LocationService {
  constructor(prisma = defaultPrisma) {
    this.prisma = prisma;
    this.providers = new Map();

    // In-memory LRU-like cache for search and reverse geocode results
    this.cache = new Map();
    this.CACHE_MAX_SIZE = 500;
    this.CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

    // Register built-in providers
    this.databaseProvider = new DatabaseLocationProvider(prisma);
    this.nominatimProvider = new NominatimLocationProvider();
    this.mockProvider = new MockLocationProvider();

    this.registerProvider('database', this.databaseProvider);
    this.registerProvider('nominatim', this.nominatimProvider);
    this.registerProvider('mock', this.mockProvider);

    this.defaultProvider = process.env.LOCATION_PROVIDER || 'database';
  }

  /**
   * Registers a provider instance
   */
  registerProvider(name, providerInstance) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!(providerInstance instanceof LocationProvider)) {
      throw new TypeError(`Provider '${name}' must be an instance of LocationProvider`);
    }
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Gets an active provider instance
   */
  getProvider(name) {
    const key = (name || this.defaultProvider).toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      // Fall back to database provider if requested provider is unknown
      return this.databaseProvider;
    }
    return provider;
  }

  /**
   * Validates coordinate values
   */
  validateCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }

  /**
   * Calculates geodesic distance between two coordinate pairs in kilometers (Haversine formula)
   */
  calculateDistanceKm(lat1, lon1, lat2, lon2) {
    if (!this.validateCoordinates(lat1, lon1) || !this.validateCoordinates(lat2, lon2)) {
      return 0;
    }
    return calculateHaversineKm(lat1, lon1, lat2, lon2);
  }

  /**
   * Returns human-readable distance badge (e.g. "800 m away", "2.4 km away")
   */
  formatDistance(distanceKm) {
    const d = Number(distanceKm);
    if (isNaN(d)) return 'Nearby';
    if (d < 1) {
      const meters = Math.round(d * 1000);
      return `${meters} m away`;
    }
    return `${d.toFixed(1)} km away`;
  }

  /**
   * Internal cache key lookup
   */
  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Internal cache set
   */
  _setCached(key, value) {
    if (this.cache.size >= this.CACHE_MAX_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.CACHE_TTL_MS
    });
  }

  /**
   * Lists all 9 South African provinces with location counts
   */
  async getProvinces() {
    const cacheKey = 'sa:provinces';
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const locations = await this.prisma.location.findMany({
      where: { active: true },
      select: { province: true, provinceCode: true, city: true }
    });

    const provinceMap = new Map();
    for (const loc of locations) {
      if (!provinceMap.has(loc.province)) {
        provinceMap.set(loc.province, {
          province: loc.province,
          provinceCode: loc.provinceCode || '',
          cities: new Set(),
          totalLocations: 0
        });
      }
      const data = provinceMap.get(loc.province);
      data.cities.add(loc.city);
      data.totalLocations++;
    }

    const provinces = Array.from(provinceMap.values()).map(p => ({
      name: p.province,
      province: p.province,
      provinceCode: p.provinceCode,
      cityCount: p.cities.size,
      totalLocations: p.totalLocations
    }));

    provinces.sort((a, b) => a.province.localeCompare(b.province));
    this._setCached(cacheKey, provinces);
    return provinces;
  }

  /**
   * Lists cities/towns in South Africa, optionally filtered by province
   */
  async getCities(provinceFilter = null) {
    const cacheKey = `sa:cities:${provinceFilter || 'all'}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const where = { active: true };
    if (provinceFilter && provinceFilter.toLowerCase() !== 'all') {
      where.province = { equals: provinceFilter };
    }

    const locations = await this.prisma.location.findMany({
      where,
      select: {
        city: true,
        province: true,
        provinceCode: true,
        municipality: true,
        latitude: true,
        longitude: true,
        locationType: true
      }
    });

    const cityMap = new Map();
    for (const loc of locations) {
      if (!cityMap.has(loc.city)) {
        cityMap.set(loc.city, {
          name: loc.city,
          city: loc.city,
          province: loc.province,
          provinceCode: loc.provinceCode,
          municipality: loc.municipality,
          latitude: loc.latitude,
          longitude: loc.longitude,
          type: loc.locationType
        });
      }
    }

    const cities = Array.from(cityMap.values()).sort((a, b) => a.city.localeCompare(b.city));
    this._setCached(cacheKey, cities);
    return cities;
  }

  /**
   * Lists suburbs in a given city/town
   */
  async getSuburbs(city, province = null) {
    if (!city) return [];
    const cacheKey = `sa:suburbs:${city}:${province || 'all'}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const where = {
      active: true,
      city: { equals: city }
    };
    if (province && province.toLowerCase() !== 'all') {
      where.province = { equals: province };
    }

    const locations = await this.prisma.location.findMany({
      where,
      orderBy: { suburb: 'asc' }
    });

    const suburbs = locations.map(l => ({
      id: l.id,
      name: l.suburb || l.city,
      suburb: l.suburb || l.city,
      city: l.city,
      province: l.province,
      postalCode: l.postalCode,
      latitude: l.latitude,
      longitude: l.longitude,
      formattedAddress: l.formattedAddress
    }));

    this._setCached(cacheKey, suburbs);
    return suburbs;
  }

  /**
   * Searches for South African places / suburbs with autocomplete ranking
   */
  async searchPlaces(query, options = {}) {
    const q = (query || '').trim();
    if (!q || q.length < 2) return [];

    const cacheKey = `search:${q}:${options.limit || 10}:${options.province || 'all'}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const activeProvider = this.getProvider(options.provider);

    try {
      let results = await activeProvider.searchPlaces(q, options);

      // Fallback: If external provider returned no results or is not database, try local database
      if ((!results || results.length === 0) && activeProvider.getName() !== 'database') {
        results = await this.databaseProvider.searchPlaces(q, options);
      }

      this._setCached(cacheKey, results);
      return results;
    } catch (err) {
      console.warn(`[LocationService] Primary provider failed: ${err.message}. Falling back to database.`);
      const fallbackResults = await this.databaseProvider.searchPlaces(q, options);
      this._setCached(cacheKey, fallbackResults);
      return fallbackResults;
    }
  }

  /**
   * Forward geocodes an address or locality into coordinates
   */
  async geocode(address, options = {}) {
    if (!address || !address.trim()) return null;
    const cacheKey = `geocode:${address.trim().toLowerCase()}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const activeProvider = this.getProvider(options.provider);

    try {
      let result = await activeProvider.geocode(address);
      if (!result && activeProvider.getName() !== 'database') {
        result = await this.databaseProvider.geocode(address);
      }
      if (result) this._setCached(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[LocationService] Geocoding fallback: ${err.message}`);
      const fallbackResult = await this.databaseProvider.geocode(address);
      if (fallbackResult) this._setCached(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Reverse geocodes coordinates (lat, lng) to the nearest recognized South African area
   */
  async reverseGeocode(latitude, longitude, options = {}) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this.validateCoordinates(lat, lng)) {
      throw new Error(`Invalid coordinate bounds: latitude ${latitude}, longitude ${longitude}`);
    }

    const cacheKey = `rev:${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const cached = this._getCached(cacheKey);
    if (cached) return cached;

    const activeProvider = this.getProvider(options.provider);

    try {
      let result = await activeProvider.reverseGeocode(lat, lng);
      if (!result && activeProvider.getName() !== 'database') {
        result = await this.databaseProvider.reverseGeocode(lat, lng);
      }
      if (result) this._setCached(cacheKey, result);
      return result;
    } catch (err) {
      console.warn(`[LocationService] Reverse geocode fallback: ${err.message}`);
      const fallbackResult = await this.databaseProvider.reverseGeocode(lat, lng);
      if (fallbackResult) this._setCached(cacheKey, fallbackResult);
      return fallbackResult;
    }
  }

  /**
   * Nearby Geographic Discovery Engine
   * Discovers businesses, products, services, promotions, and resellers closest to active coordinates.
   */
  async getNearby(params = {}) {
    const rawLat = params.lat !== undefined && params.lat !== '' ? params.lat : params.latitude;
    const rawLng = params.lng !== undefined && params.lng !== '' ? params.lng : (params.lon !== undefined && params.lon !== '' ? params.lon : params.longitude);

    if (rawLat === undefined || rawLng === undefined || rawLat === '' || rawLng === '') {
      throw new Error('Both latitude and longitude coordinates are required for nearby discovery');
    }

    const lat = Number(rawLat);
    const lng = Number(rawLng);

    if (!this.validateCoordinates(lat, lng)) {
      throw new Error(`Invalid search coordinates: latitude ${rawLat}, longitude ${rawLng}`);
    }

    const rawRadius = params.radius !== undefined ? String(params.radius).toLowerCase().trim() : '10';
    const isViewAll = rawRadius === 'all' || rawRadius === 'view all' || rawRadius === '9999' || Number(rawRadius) >= 999;
    const radiusKm = isViewAll ? 9999 : (Number(rawRadius) || 10);

    const category = params.category && params.category !== 'All' ? params.category : null;
    const search = (params.search || params.q || '').trim().toLowerCase();
    const type = (params.type || 'all').toLowerCase(); // 'all' | 'businesses' | 'products' | 'services' | 'specials' | 'resellers'
    const sort = (params.sort || params.sortBy || 'nearest').toLowerCase(); // 'nearest' | 'rating' | 'popular' | 'newest'
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 12, 1), 100);

    // 1. Fetch approved merchants with their branch locations, products, and active promotions
    const merchantWhere = {
      status: 'Approved',
      ...(category ? { category: { equals: category } } : {})
    };

    const allMerchants = await this.prisma.merchant.findMany({
      where: merchantWhere,
      include: {
        branches: { where: { active: true } },
        products: { where: { inStock: true } },
        promotions: { where: { active: true } },
        reviews: { take: 5, orderBy: { createdAt: 'desc' } }
      }
    });

    // 2. Geospatial Distance & Service-Area Evaluation
    const matchingMerchants = [];

    for (const m of allMerchants) {
      const primaryLat = m.latitude !== null && m.latitude !== undefined ? m.latitude : -26.2625;
      const primaryLng = m.longitude !== null && m.longitude !== undefined ? m.longitude : 28.1250;

      // Evaluate distances to all branches + primary
      const locationCandidates = [];
      locationCandidates.push({
        branchId: 'primary',
        name: `${m.name} (Main)`,
        address: m.address || `${m.suburb}, ${m.city || 'Alberton'}`,
        suburb: m.suburb,
        city: m.city || 'Alberton',
        province: m.province || 'Gauteng',
        latitude: primaryLat,
        longitude: primaryLng,
        distanceKm: this.calculateDistanceKm(lat, lng, primaryLat, primaryLng)
      });

      if (Array.isArray(m.branches) && m.branches.length > 0) {
        for (const b of m.branches) {
          locationCandidates.push({
            branchId: b.id,
            name: b.name,
            address: b.address,
            suburb: b.suburb || m.suburb,
            city: b.city || m.city,
            province: b.province || m.province,
            latitude: b.latitude,
            longitude: b.longitude,
            distanceKm: this.calculateDistanceKm(lat, lng, b.latitude, b.longitude)
          });
        }
      }

      // Find nearest branch
      locationCandidates.sort((a, b) => a.distanceKm - b.distanceKm);
      const nearestBranch = locationCandidates[0];
      const minDistance = nearestBranch.distanceKm;

      // Service-Area vs Storefront Evaluation
      const isServiceArea = m.serviceType === 'service_area' || m.serviceType === 'hybrid';
      const serviceRadius = m.serviceRadius || 15;
      let isWithinServiceCoverage = false;

      if (isServiceArea) {
        // Discovered if user's search point is within provider's service radius
        if (minDistance <= Math.max(radiusKm, serviceRadius)) {
          isWithinServiceCoverage = true;
        }
        // Or if declared service areas match
        if (m.serviceAreas) {
          try {
            const areas = JSON.parse(m.serviceAreas);
            if (Array.isArray(areas) && areas.length > 0) {
              const matchedArea = areas.some(a =>
                (nearestBranch.city || '').toLowerCase().includes(a.toLowerCase()) ||
                (nearestBranch.suburb || '').toLowerCase().includes(a.toLowerCase())
              );
              if (matchedArea) isWithinServiceCoverage = true;
            }
          } catch (e) {}
        }
      }

      const isWithinPhysicalRadius = minDistance <= radiusKm;

      if (isViewAll || isWithinPhysicalRadius || isWithinServiceCoverage) {
        // Text search filter
        if (search) {
          const matchText = `${m.name} ${m.category} ${m.tagline} ${m.specialty} ${m.about} ${m.suburb} ${m.city}`.toLowerCase();
          if (!matchText.includes(search)) {
            continue;
          }
        }

        matchingMerchants.push({
          ...m,
          distanceKm: minDistance,
          distanceLabel: this.formatDistance(minDistance),
          nearestBranch,
          branchesCount: locationCandidates.length,
          isServiceCoverage: isWithinServiceCoverage && !isWithinPhysicalRadius
        });
      }
    }

    // 3. Sorting Strategies
    matchingMerchants.sort((a, b) => {
      if (sort === 'nearest') {
        return a.distanceKm - b.distanceKm;
      }
      if (sort === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (sort === 'popular') {
        return (b.reviewCount || 0) - (a.reviewCount || 0);
      }
      if (sort === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.distanceKm - b.distanceKm;
    });

    // 4. Derive Products, Services, Specials & Resellers from nearby merchants
    const nearbyProducts = [];
    const nearbyServices = [];
    const nearbySpecials = [];
    const nearbyResellers = [];

    for (const m of matchingMerchants) {
      if (m.kind === 'brand-agent' || (m.brandId && m.brandId !== 'none')) {
        nearbyResellers.push({
          ...m,
          _entityType: 'reseller'
        });
      }

      for (const p of m.products || []) {
        const productPayload = {
          ...p,
          merchantName: m.name,
          merchantSuburb: m.suburb,
          merchantCity: m.city,
          distanceKm: m.distanceKm,
          distanceLabel: m.distanceLabel,
          merchantRating: m.rating,
          merchantVerified: m.verified
        };

        if (p.isService) {
          nearbyServices.push({ ...productPayload, _entityType: 'service' });
        } else {
          nearbyProducts.push({ ...productPayload, _entityType: 'product' });
        }
      }

      for (const prom of m.promotions || []) {
        nearbySpecials.push({
          ...prom,
          merchantName: m.name,
          merchantCity: m.city,
          distanceKm: m.distanceKm,
          distanceLabel: m.distanceLabel,
          _entityType: 'special'
        });
      }
    }

    // 5. Build Unified Items according to type filter
    let combinedItems = [];
    if (type === 'businesses') {
      combinedItems = matchingMerchants.map(b => ({ ...b, _entityType: 'business' }));
    } else if (type === 'products') {
      combinedItems = nearbyProducts;
    } else if (type === 'services') {
      combinedItems = nearbyServices;
    } else if (type === 'specials') {
      combinedItems = nearbySpecials;
    } else if (type === 'resellers') {
      combinedItems = nearbyResellers;
    } else {
      combinedItems = [
        ...matchingMerchants.map(b => ({ ...b, _entityType: 'business' })),
        ...nearbyProducts,
        ...nearbyServices,
        ...nearbySpecials
      ];
      // Keep primary sort on combined feed
      if (sort === 'nearest') {
        combinedItems.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
      }
    }

    // 6. Pagination
    const total = combinedItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const startIndex = (page - 1) * limit;
    const paginatedItems = combinedItems.slice(startIndex, startIndex + limit);

    return {
      success: true,
      activeLocation: {
        latitude: lat,
        longitude: lng,
        radiusKm: isViewAll ? 'all' : radiusKm
      },
      merchants: matchingMerchants,
      businesses: matchingMerchants.slice(0, 10),
      counts: {
        all: matchingMerchants.length + nearbyProducts.length + nearbyServices.length + nearbySpecials.length,
        businesses: matchingMerchants.length,
        products: nearbyProducts.length,
        services: nearbyServices.length,
        specials: nearbySpecials.length,
        resellers: nearbyResellers.length
      },
      businesses: matchingMerchants.slice(0, 10),
      products: nearbyProducts.slice(0, 10),
      services: nearbyServices.slice(0, 10),
      specials: nearbySpecials.slice(0, 10),
      resellers: nearbyResellers.slice(0, 10),
      items: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // =========================================================================
  // USER SAVED LOCATIONS
  // =========================================================================

  async listSavedLocations(userId) {
    if (!userId) return [];
    return await this.prisma.userLocation.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }]
    });
  }

  async saveLocation(userId, data) {
    if (!userId) throw new Error('User authentication required to save locations');
    const { label, formattedAddress, suburb, city, province, latitude, longitude, locationMode = 'MANUAL_LOCATION', isDefault } = data;

    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error(`Invalid coordinates: latitude ${latitude}, longitude ${longitude}`);
    }

    if (isDefault) {
      await this.prisma.userLocation.updateMany({
        where: { userId },
        data: { isDefault: false }
      });
    }

    return await this.prisma.userLocation.create({
      data: {
        userId,
        label: label || 'Saved Location',
        formattedAddress: formattedAddress || `${suburb || ''}, ${city || ''}, ${province || ''}`.trim(),
        suburb: suburb || null,
        city: city || 'Johannesburg',
        province: province || 'Gauteng',
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationMode,
        isDefault: !!isDefault
      }
    });
  }

  async deleteSavedLocation(userId, locationId) {
    const existing = await this.prisma.userLocation.findUnique({
      where: { id: locationId }
    });
    if (!existing) throw new Error('Saved location not found');
    if (existing.userId !== userId) throw new Error('Forbidden: You can only delete your own saved locations');

    await this.prisma.userLocation.delete({ where: { id: locationId } });
    return { success: true };
  }

  // =========================================================================
  // BUSINESS BRANCH LOCATIONS
  // =========================================================================

  async listMerchantBranches(merchantId) {
    return await this.prisma.businessLocation.findMany({
      where: { merchantId, active: true },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }]
    });
  }

  async createMerchantBranch(merchantId, data) {
    const { name, address, suburb, city, province, postalCode, latitude, longitude, isPrimary, serviceRadius, serviceAreas, phone, email } = data;

    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error(`Invalid coordinates: latitude ${latitude}, longitude ${longitude}`);
    }

    if (isPrimary) {
      await this.prisma.businessLocation.updateMany({
        where: { merchantId },
        data: { isPrimary: false }
      });
    }

    return await this.prisma.businessLocation.create({
      data: {
        merchantId,
        name: name || 'Branch Location',
        address: address || `${city}, ${province}`,
        suburb: suburb || null,
        city: city || 'Johannesburg',
        province: province || 'Gauteng',
        postalCode: postalCode || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        isPrimary: !!isPrimary,
        locationVerified: true,
        serviceRadius: serviceRadius ? Number(serviceRadius) : 10.0,
        serviceAreas: serviceAreas ? (typeof serviceAreas === 'string' ? serviceAreas : JSON.stringify(serviceAreas)) : null,
        phone: phone || null,
        email: email || null
      }
    });
  }

  async updateMerchantBranch(merchantId, branchId, data) {
    const existing = await this.prisma.businessLocation.findUnique({
      where: { id: branchId }
    });
    if (!existing) throw new Error('Branch location not found');
    if (existing.merchantId !== merchantId) throw new Error('Forbidden: You cannot modify another business\'s branch location');

    const updateData = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.suburb !== undefined) updateData.suburb = data.suburb;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.province !== undefined) updateData.province = data.province;
    if (data.postalCode !== undefined) updateData.postalCode = data.postalCode;
    if (data.latitude !== undefined) {
      if (!this.validateCoordinates(data.latitude, data.longitude ?? existing.longitude)) {
        throw new Error('Invalid coordinates');
      }
      updateData.latitude = Number(data.latitude);
    }
    if (data.longitude !== undefined) {
      if (!this.validateCoordinates(data.latitude ?? existing.latitude, data.longitude)) {
        throw new Error('Invalid coordinates');
      }
      updateData.longitude = Number(data.longitude);
    }
    if (data.serviceRadius !== undefined) updateData.serviceRadius = Number(data.serviceRadius);
    if (data.serviceAreas !== undefined) {
      updateData.serviceAreas = typeof data.serviceAreas === 'string' ? data.serviceAreas : JSON.stringify(data.serviceAreas);
    }
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.active !== undefined) updateData.active = !!data.active;

    return await this.prisma.businessLocation.update({
      where: { id: branchId },
      data: updateData
    });
  }

  async deleteMerchantBranch(merchantId, branchId) {
    const existing = await this.prisma.businessLocation.findUnique({
      where: { id: branchId }
    });
    if (!existing) throw new Error('Branch location not found');
    if (existing.merchantId !== merchantId) throw new Error('Forbidden: You cannot modify another business\'s branch location');

    await this.prisma.businessLocation.delete({ where: { id: branchId } });
    return { success: true };
  }

  // =========================================================================
  // ADMIN LOCATION MANAGEMENT
  // =========================================================================

  async adminListLocations(options = {}) {
    const page = Math.max(parseInt(options.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 20, 1), 100);
    const province = options.province ? options.province.trim() : null;
    const search = options.search ? options.search.trim().toLowerCase() : null;

    const where = {};
    if (province && province !== 'All') {
      where.province = { equals: province };
    }
    if (search) {
      where.OR = [
        { city: { contains: search } },
        { suburb: { contains: search } },
        { municipality: { contains: search } },
        { province: { contains: search } },
        { aliases: { contains: search } }
      ];
    }

    const total = await this.prisma.location.count({ where });
    const locations = await this.prisma.location.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: [{ province: 'asc' }, { city: 'asc' }, { suburb: 'asc' }]
    });

    return {
      locations,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  async adminCreateLocation(data) {
    const { country = 'South Africa', countryCode = 'ZA', province, provinceCode, municipality, city, suburb, postalCode, formattedAddress, latitude, longitude, locationType = 'suburb', aliases } = data;

    if (!province || !city || !municipality) {
      throw new Error('Province, municipality, and city are required fields');
    }
    if (!this.validateCoordinates(latitude, longitude)) {
      throw new Error(`Invalid coordinate bounds: latitude ${latitude}, longitude ${longitude}`);
    }

    const addr = formattedAddress || `${suburb ? suburb + ', ' : ''}${city}, ${province}, ${postalCode || ''}`.trim();

    return await this.prisma.location.create({
      data: {
        country,
        countryCode,
        province,
        provinceCode: provinceCode || null,
        municipality,
        city,
        suburb: suburb || null,
        postalCode: postalCode || null,
        formattedAddress: addr,
        latitude: Number(latitude),
        longitude: Number(longitude),
        locationType,
        aliases: aliases || null,
        active: true
      }
    });
  }

  async adminUpdateLocation(id, data) {
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) throw new Error(`Location #${id} not found`);

    if (data.latitude !== undefined && data.longitude !== undefined) {
      if (!this.validateCoordinates(data.latitude, data.longitude)) {
        throw new Error(`Invalid coordinates: latitude ${data.latitude}, longitude ${data.longitude}`);
      }
      data.latitude = Number(data.latitude);
      data.longitude = Number(data.longitude);
    }

    return await this.prisma.location.update({
      where: { id },
      data
    });
  }

  async adminDeleteLocation(id) {
    const existing = await this.prisma.location.findUnique({ where: { id } });
    if (!existing) throw new Error(`Location #${id} not found`);
    await this.prisma.location.delete({ where: { id } });
    return { success: true };
  }

  async adminGetConfig() {
    const settings = await this.prisma.adminSetting.findFirst();
    const activeProvider = settings?.locationProvider || this.defaultProvider;
    return {
      provider: activeProvider,
      locationProvider: activeProvider,
      defaultRadius: settings?.defaultRadius || 10.0,
      radiusOptions: (settings?.radiusOptions || '1,2,5,10,25,50,100').split(',').map(Number),
      availableProviders: Array.from(this.providers.keys()),
      activeCacheEntries: this.cache.size,
      totalKnownLocations: await this.prisma.location.count({ where: { active: true } })
    };
  }

  async adminUpdateConfig(data) {
    const { defaultRadius, radiusOptions } = data;
    const providerCandidate = data.provider || data.locationProvider;
    const updateData = {};
    if (defaultRadius !== undefined) updateData.defaultRadius = Number(defaultRadius);
    if (radiusOptions !== undefined) {
      updateData.radiusOptions = Array.isArray(radiusOptions) ? radiusOptions.join(',') : String(radiusOptions);
    }
    if (providerCandidate !== undefined) {
      updateData.locationProvider = String(providerCandidate).toLowerCase();
      this.defaultProvider = updateData.locationProvider;
    }

    const saved = await this.prisma.adminSetting.upsert({
      where: { id: 1 },
      update: updateData,
      create: { id: 1, ...updateData }
    });

    const activeProvider = saved.locationProvider || this.defaultProvider;
    return {
      provider: activeProvider,
      locationProvider: activeProvider,
      defaultRadius: saved.defaultRadius || 10.0,
      radiusOptions: (saved.radiusOptions || '1,2,5,10,25,50,100').split(',').map(Number)
    };
  }
}

export const locationService = new LocationService();
export default locationService;
