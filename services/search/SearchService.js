import { PrismaClient } from '@prisma/client';
import { locationService } from '../location/LocationService.js';

const defaultPrisma = new PrismaClient();

/**
 * SearchService
 * Central domain service for marketplace search across Businesses, Products, and Services.
 * Supports multi-field lexical search, combinatorial filtering, relevance scoring,
 * multi-attribute sorting, efficient pagination, and typeahead suggestions.
 */
export class SearchService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Calculates a relevance score for a given entity based on query match positions.
   * Higher score = higher ranking relevance.
   *
   * @param {Object} item
   * @param {string} query
   * @returns {number}
   */
  calculateRelevance(item, query) {
    if (!query) return 0;
    const q = query.trim().toLowerCase();
    if (!q) return 0;

    let score = 0;
    const name = (item.name || '').toLowerCase();
    const category = (item.category || '').toLowerCase();
    const tags = (item.tags || '').toLowerCase();
    const desc = (item.desc || item.about || item.tagline || item.specialty || '').toLowerCase();
    const suburb = (item.suburb || item.address || item.merchant?.suburb || '').toLowerCase();

    // 1. Exact Name match
    if (name === q) {
      score += 100;
    } else if (name.startsWith(q)) {
      score += 80;
    } else if (name.includes(q)) {
      score += 60;
    }

    // 2. Tags match
    if (tags.includes(q)) {
      score += 50;
      // Bonus if exact tag match
      const tagList = tags.split(',').map(t => t.trim().toLowerCase());
      if (tagList.includes(q)) score += 20;
    }

    // 3. Category match
    if (category === q) {
      score += 45;
    } else if (category.includes(q)) {
      score += 35;
    }

    // 4. Description / Specialty / Tagline match
    if (desc.includes(q)) {
      score += 25;
    }

    // 5. Location / Suburb match
    if (suburb === q) {
      score += 30;
    } else if (suburb.includes(q)) {
      score += 20;
    }

    // Secondary boost: rating quality boost (up to 5 points)
    const rating = Number(item.rating || item.merchant?.rating || 0);
    score += Math.min(Math.max(rating, 0), 5);

    return score;
  }

  /**
   * Unified marketplace search across Businesses, Products, and Services.
   *
   * @param {Object} params
   * @returns {Promise<Object>}
   */
  async search(params = {}) {
    const rawQuery = (params.q || params.search || params.query || '').trim();
    const query = rawQuery.toLowerCase();
    const type = (params.type || 'all').toLowerCase(); // 'all' | 'businesses' | 'products' | 'services'
    const category = params.category && params.category !== 'All' ? params.category : null;
    const suburb = params.suburb && params.suburb !== 'All' ? params.suburb : (params.location || null);
    const minPrice = params.minPrice !== undefined && params.minPrice !== '' ? Number(params.minPrice) : null;
    const maxPrice = params.maxPrice !== undefined && params.maxPrice !== '' ? Number(params.maxPrice) : null;
    const minRating = params.minRating !== undefined && params.minRating !== '' ? Number(params.minRating) : null;
    const openNow = params.openNow === true || params.openNow === 'true' || params.openNow === '1';
    const maxDistance = params.maxDistance !== undefined && params.maxDistance !== '' ? Number(params.maxDistance) : null;
    const businessType = params.businessType && params.businessType !== 'all' ? params.businessType : (params.kind || null);
    const sortBy = (params.sortBy || 'relevance').toLowerCase(); // 'relevance' | 'rating' | 'distance' | 'price-asc' | 'price-desc' | 'newest'
    const page = Math.max(parseInt(params.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.limit, 10) || 12, 1), 100);

    // Geospatial Discovery Parameters
    const hasGeo = params.latitude !== undefined && params.latitude !== '' && params.longitude !== undefined && params.longitude !== '';
    const userLat = hasGeo ? Number(params.latitude) : null;
    const userLng = hasGeo ? Number(params.longitude) : null;
    const rawRadius = params.radius !== undefined ? String(params.radius).toLowerCase().trim() : (maxDistance !== null ? String(maxDistance) : null);
    const isViewAll = rawRadius === 'all' || rawRadius === 'view all' || rawRadius === '9999' || Number(rawRadius) >= 999;
    const radiusKm = isViewAll ? 9999 : (rawRadius !== null ? Number(rawRadius) : null);

    // =========================================================================
    // 1. QUERY BUSINESSES (when type === 'all' or 'businesses')
    // =========================================================================
    let businesses = [];
    if (type === 'all' || type === 'businesses') {
      const merchantWhere = {
        status: 'Approved'
      };

      if (category) {
        merchantWhere.category = category;
      }

      if (suburb) {
        merchantWhere.suburb = { contains: suburb };
      }

      if (businessType) {
        merchantWhere.kind = businessType;
      }

      if (openNow) {
        merchantWhere.openNow = true;
      }

      if (minRating !== null && !isNaN(minRating)) {
        merchantWhere.rating = { gte: minRating };
      }

      // Legacy fallback: static distance filter only if lat/lng is NOT supplied
      if (!hasGeo && maxDistance !== null && !isNaN(maxDistance)) {
        merchantWhere.distanceKm = { lte: maxDistance };
      }

      // Text search matching across: Name, Description, Category, Location, Tags
      if (query) {
        merchantWhere.OR = [
          { name: { contains: query } },
          { category: { contains: query } },
          { tagline: { contains: query } },
          { about: { contains: query } },
          { specialty: { contains: query } },
          { suburb: { contains: query } },
          { address: { contains: query } },
          { tags: { contains: query } }
        ];
      }

      businesses = await this.prisma.merchant.findMany({
        where: merchantWhere,
        include: {
          branches: { where: { active: true } },
          products: {
            take: 4,
            select: { id: true, name: true, price: true, image: true, isService: true }
          }
        }
      });

      // True geodesic distance calculation when coordinates are provided
      if (hasGeo) {
        businesses = businesses.map(b => {
          const primaryDist = locationService.calculateDistanceKm(userLat, userLng, b.latitude ?? -26.2625, b.longitude ?? 28.1250);
          let minDist = primaryDist;
          let nearestBranch = null;
          if (Array.isArray(b.branches) && b.branches.length > 0) {
            for (const br of b.branches) {
              const brDist = locationService.calculateDistanceKm(userLat, userLng, br.latitude, br.longitude);
              if (brDist < minDist) {
                minDist = brDist;
                nearestBranch = br;
              }
            }
          }
          return {
            ...b,
            distanceKm: minDist,
            distanceLabel: locationService.formatDistance(minDist),
            nearestBranch
          };
        });

        if (radiusKm !== null && !isViewAll) {
          businesses = businesses.filter(b => {
            if (b.distanceKm <= radiusKm) return true;
            if (b.serviceType === 'service_area' || b.serviceType === 'hybrid') {
              const sRad = b.serviceRadius || 15;
              if (b.distanceKm <= Math.max(radiusKm, sRad)) return true;
            }
            return false;
          });
        }
      }

      // If price filters are applied and type is 'businesses',
      // only keep businesses that offer products/services in that price range
      if (minPrice !== null || maxPrice !== null) {
        businesses = businesses.filter(b => {
          if (!b.products || b.products.length === 0) return false;
          return b.products.some(p => {
            if (minPrice !== null && p.price < minPrice) return false;
            if (maxPrice !== null && p.price > maxPrice) return false;
            return true;
          });
        });
      }
    }

    // =========================================================================
    // 2. QUERY PRODUCTS & SERVICES (when type === 'all', 'products', or 'services')
    // =========================================================================
    let products = [];
    let services = [];

    if (type === 'all' || type === 'products' || type === 'services') {
      const productWhere = {};

      // Filter by product vs service
      if (type === 'products') {
        productWhere.isService = false;
      } else if (type === 'services') {
        productWhere.isService = true;
      }

      if (category) {
        productWhere.category = category;
      }

      // Price filter
      if (minPrice !== null && !isNaN(minPrice)) {
        productWhere.price = { ...productWhere.price, gte: minPrice };
      }
      if (maxPrice !== null && !isNaN(maxPrice)) {
        productWhere.price = { ...productWhere.price, lte: maxPrice };
      }

      // Text search matching across: Name, Description, Category, Tags
      if (query) {
        productWhere.OR = [
          { name: { contains: query } },
          { desc: { contains: query } },
          { category: { contains: query } },
          { tags: { contains: query } },
          { merchant: { name: { contains: query } } },
          { merchant: { suburb: { contains: query } } }
        ];
      }

      // Merchant-level filters (Rating, Distance, Suburb, Open now, Business type)
      const merchantFilter = { status: 'Approved' };
      let hasMerchantFilter = false;

      if (suburb) {
        merchantFilter.suburb = { contains: suburb };
        hasMerchantFilter = true;
      }

      if (minRating !== null && !isNaN(minRating)) {
        merchantFilter.rating = { gte: minRating };
        hasMerchantFilter = true;
      }

      if (openNow) {
        merchantFilter.openNow = true;
        hasMerchantFilter = true;
      }

      // Legacy static distance filter only if lat/lng is NOT supplied
      if (!hasGeo && maxDistance !== null && !isNaN(maxDistance)) {
        merchantFilter.distanceKm = { lte: maxDistance };
        hasMerchantFilter = true;
      }

      if (businessType) {
        merchantFilter.kind = businessType;
        hasMerchantFilter = true;
      }

      if (hasMerchantFilter) {
        productWhere.merchant = { ...productWhere.merchant, ...merchantFilter };
      }

      const allItems = await this.prisma.product.findMany({
        where: productWhere,
        include: {
          merchant: {
            include: {
              branches: { where: { active: true } }
            }
          }
        }
      });

      if (hasGeo) {
        allItems.forEach(item => {
          if (item.merchant) {
            const m = item.merchant;
            const primaryDist = locationService.calculateDistanceKm(userLat, userLng, m.latitude ?? -26.2625, m.longitude ?? 28.1250);
            let minDist = primaryDist;
            if (Array.isArray(m.branches) && m.branches.length > 0) {
              for (const br of m.branches) {
                const brDist = locationService.calculateDistanceKm(userLat, userLng, br.latitude, br.longitude);
                if (brDist < minDist) minDist = brDist;
              }
            }
            m.distanceKm = minDist;
            m.distanceLabel = locationService.formatDistance(minDist);
            item.distanceKm = minDist;
            item.distanceLabel = m.distanceLabel;
          }
        });

        if (radiusKm !== null && !isViewAll) {
          products = allItems.filter(p => !p.isService && (p.distanceKm === undefined || p.distanceKm <= radiusKm));
          services = allItems.filter(p => p.isService && (p.distanceKm === undefined || p.distanceKm <= radiusKm || (p.merchant?.serviceRadius && p.distanceKm <= p.merchant.serviceRadius)));
        } else {
          products = allItems.filter(p => !p.isService);
          services = allItems.filter(p => p.isService);
        }
      } else {
        products = allItems.filter(p => !p.isService);
        services = allItems.filter(p => p.isService);
      }
    }

    // =========================================================================
    // 3. ATTACH METADATA & RELEVANCE SCORES
    // =========================================================================
    const scoredBusinesses = businesses.map(b => ({
      ...b,
      _entityType: 'business',
      _relevance: this.calculateRelevance(b, query)
    }));

    const scoredProducts = products.map(p => ({
      ...p,
      _entityType: 'product',
      _relevance: this.calculateRelevance(p, query)
    }));

    const scoredServices = services.map(s => ({
      ...s,
      _entityType: 'service',
      _relevance: this.calculateRelevance(s, query)
    }));

    // Counts for faceting
    const counts = {
      all: scoredBusinesses.length + scoredProducts.length + scoredServices.length,
      businesses: scoredBusinesses.length,
      products: scoredProducts.length,
      services: scoredServices.length
    };

    // =========================================================================
    // 4. COMBINE & SORT
    // =========================================================================
    let combinedItems = [];
    if (type === 'businesses') {
      combinedItems = [...scoredBusinesses];
    } else if (type === 'products') {
      combinedItems = [...scoredProducts];
    } else if (type === 'services') {
      combinedItems = [...scoredServices];
    } else {
      combinedItems = [...scoredBusinesses, ...scoredProducts, ...scoredServices];
    }

    // Apply Sorting strategy
    combinedItems.sort((a, b) => {
      if (sortBy === 'rating') {
        const ratingA = a._entityType === 'business' ? (a.rating || 0) : (a.merchant?.rating || 0);
        const ratingB = b._entityType === 'business' ? (b.rating || 0) : (b.merchant?.rating || 0);
        if (ratingB !== ratingA) return ratingB - ratingA;
        return (b._relevance || 0) - (a._relevance || 0);
      }

      if (sortBy === 'distance') {
        const distA = a._entityType === 'business' ? (a.distanceKm || 999) : (a.merchant?.distanceKm || 999);
        const distB = b._entityType === 'business' ? (b.distanceKm || 999) : (b.merchant?.distanceKm || 999);
        if (distA !== distB) return distA - distB;
        return (b._relevance || 0) - (a._relevance || 0);
      }

      if (sortBy === 'price-asc') {
        const priceA = a.price !== undefined ? a.price : 0;
        const priceB = b.price !== undefined ? b.price : 0;
        if (priceA !== priceB) return priceA - priceB;
        return (b._relevance || 0) - (a._relevance || 0);
      }

      if (sortBy === 'price-desc') {
        const priceA = a.price !== undefined ? a.price : 0;
        const priceB = b.price !== undefined ? b.price : 0;
        if (priceB !== priceA) return priceB - priceA;
        return (b._relevance || 0) - (a._relevance || 0);
      }

      if (sortBy === 'newest') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      }

      // Default: 'relevance'
      const relDiff = (b._relevance || 0) - (a._relevance || 0);
      if (relDiff !== 0) return relDiff;
      // Secondary sort: rating desc
      const rA = a._entityType === 'business' ? (a.rating || 0) : (a.merchant?.rating || 0);
      const rB = b._entityType === 'business' ? (b.rating || 0) : (b.merchant?.rating || 0);
      return rB - rA;
    });

    // =========================================================================
    // 5. SERVER-SIDE PAGINATION
    // =========================================================================
    const total = combinedItems.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const safePage = Math.min(Math.max(page, 1), totalPages);
    const offset = (safePage - 1) * limit;
    const paginatedItems = combinedItems.slice(offset, offset + limit);

    // Segment paginated items by entity type for convenient frontend consumption
    const paginatedBusinesses = paginatedItems.filter(i => i._entityType === 'business');
    const paginatedProducts = paginatedItems.filter(i => i._entityType === 'product');
    const paginatedServices = paginatedItems.filter(i => i._entityType === 'service');

    return {
      query: rawQuery,
      filters: {
        type,
        category: category || 'All',
        suburb: suburb || 'All',
        minPrice,
        maxPrice,
        minRating,
        openNow,
        maxDistance,
        businessType: businessType || 'All'
      },
      sortBy,
      pagination: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasMore: safePage < totalPages,
        hasPrev: safePage > 1
      },
      counts,
      items: paginatedItems,
      businesses: paginatedBusinesses,
      products: paginatedProducts,
      services: paginatedServices
    };
  }

  /**
   * Generates live autocomplete search suggestions.
   * Matches across Businesses, Products, Services, Categories, and Tags.
   *
   * @param {string} query
   * @param {number} [limit=8]
   * @returns {Promise<Array<{ id?: string, text: string, type: string, category?: string, price?: number, merchantName?: string }>>}
   */
  async getSuggestions(query = '', limit = 8) {
    const q = (query || '').trim().toLowerCase();
    if (!q || q.length < 1) return [];

    const suggestions = [];
    const seenTexts = new Set();

    const addSuggestion = (item) => {
      const key = `${item.type}:${item.text.toLowerCase()}`;
      if (!seenTexts.has(key) && suggestions.length < limit) {
        seenTexts.add(key);
        suggestions.push(item);
      }
    };

    // 1. Matching Categories
    const categories = await this.prisma.category.findMany({
      where: {
        active: true,
        name: { contains: q }
      },
      take: 4,
      select: { name: true }
    });
    for (const cat of categories) {
      addSuggestion({
        text: cat.name,
        type: 'category'
      });
      if (suggestions.length >= limit) return suggestions;
    }

    // 2. Matching Businesses
    const merchants = await this.prisma.merchant.findMany({
      where: {
        status: 'Approved',
        OR: [
          { name: { contains: q } },
          { specialty: { contains: q } },
          { tags: { contains: q } }
        ]
      },
      take: 5,
      select: { id: true, name: true, category: true, suburb: true, rating: true }
    });
    for (const m of merchants) {
      addSuggestion({
        id: m.id,
        text: m.name,
        type: 'business',
        category: m.category,
        suburb: m.suburb,
        rating: m.rating
      });
      if (suggestions.length >= limit) return suggestions;
    }

    // 3. Matching Products & Services
    const products = await this.prisma.product.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { category: { contains: q } },
          { tags: { contains: q } }
        ]
      },
      take: 6,
      include: {
        merchant: { select: { name: true } }
      }
    });
    for (const p of products) {
      addSuggestion({
        id: p.id,
        text: p.name,
        type: p.isService ? 'service' : 'product',
        category: p.category,
        price: p.price,
        merchantName: p.merchant?.name
      });
      if (suggestions.length >= limit) return suggestions;
    }

    return suggestions;
  }
}

export const searchService = new SearchService();
