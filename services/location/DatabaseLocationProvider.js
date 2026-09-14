import { LocationProvider } from './LocationProvider.js';
import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * Calculates geodesic distance using the Haversine formula
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometers
 */
export function calculateHaversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10; // Round to 1 decimal place
}

/**
 * DatabaseLocationProvider
 * High-performance, zero-API-cost provider that operates directly against
 * the South African geographic reference dataset stored in the database.
 * Provides instant responses, offline resilience, and zero vendor lock-in.
 */
export class DatabaseLocationProvider extends LocationProvider {
  constructor(prisma = defaultPrisma) {
    super('database');
    this.prisma = prisma;
  }

  /**
   * Searches for matching South African localities with relevance ranking
   * @param {string} query
   * @param {Object} [options]
   * @returns {Promise<Array<Object>>}
   */
  async searchPlaces(query, options = {}) {
    const q = (query || '').trim().toLowerCase();
    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 10, 1), 50);
    const provinceFilter = options.province ? options.province.trim().toLowerCase() : null;

    if (!q) {
      // If empty query, return top recognized cities
      const where = { active: true };
      if (provinceFilter) {
        where.province = { equals: options.province };
      }
      const topLocations = await this.prisma.location.findMany({
        where,
        take: limit,
        orderBy: [{ locationType: 'asc' }, { city: 'asc' }]
      });
      return topLocations.map(this.formatLocation);
    }

    // Retrieve active candidate locations
    const candidates = await this.prisma.location.findMany({
      where: {
        active: true,
        ...(provinceFilter ? { province: { equals: options.province } } : {})
      }
    });

    // Score and rank candidates
    const scored = [];
    for (const loc of candidates) {
      const suburb = (loc.suburb || '').toLowerCase();
      const city = (loc.city || '').toLowerCase();
      const prov = (loc.province || '').toLowerCase();
      const aliases = (loc.aliases || '').toLowerCase();
      const address = (loc.formattedAddress || '').toLowerCase();

      let score = 0;

      // Exact matches
      if (suburb === q || city === q) {
        score += 100;
      } else if (suburb.startsWith(q) || city.startsWith(q)) {
        score += 75;
      } else if (aliases.split(',').some(a => a.trim() === q)) {
        score += 70;
      } else if (suburb.includes(q) || city.includes(q)) {
        score += 50;
      } else if (aliases.includes(q)) {
        score += 40;
      } else if (prov.startsWith(q)) {
        score += 30;
      } else if (prov.includes(q) || address.includes(q)) {
        score += 20;
      }

      if (score > 0) {
        // Boost cities and towns slightly over generic suburbs when scoring is tied
        if (loc.locationType === 'city') score += 5;
        if (loc.locationType === 'town') score += 3;

        scored.push({ loc, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, limit).map(item => this.formatLocation(item.loc));
  }

  /**
   * Forward geocodes an address or locality name
   * @param {string} address
   * @returns {Promise<Object|null>}
   */
  async geocode(address) {
    if (!address || !address.trim()) return null;
    const results = await this.searchPlaces(address, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Reverse geocodes coordinates (lat, lng) to the nearest recognized South African locality
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async reverseGeocode(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this.validateCoordinates(lat, lng)) {
      throw new Error(`Invalid coordinate bounds: latitude ${latitude}, longitude ${longitude}`);
    }

    const allLocations = await this.prisma.location.findMany({
      where: { active: true }
    });

    if (allLocations.length === 0) return null;

    let nearest = null;
    let minDistance = Infinity;

    for (const loc of allLocations) {
      const dist = calculateHaversineKm(lat, lng, loc.latitude, loc.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        nearest = loc;
      }
    }

    if (!nearest) return null;

    return {
      ...this.formatLocation(nearest),
      distanceKm: minDistance,
      detectedCoordinates: { latitude: lat, longitude: lng }
    };
  }

  /**
   * Formats a database location record into standard API response contract
   * @param {Object} loc
   * @returns {Object}
   */
  formatLocation(loc) {
    const displayName = loc.suburb && loc.suburb !== loc.city
      ? `${loc.suburb}, ${loc.city}`
      : `${loc.city}, ${loc.province}`;

    return {
      id: loc.id,
      name: displayName,
      suburb: loc.suburb || loc.city,
      city: loc.city,
      municipality: loc.municipality,
      province: loc.province,
      provinceCode: loc.provinceCode,
      country: loc.country,
      countryCode: loc.countryCode,
      postalCode: loc.postalCode,
      latitude: loc.latitude,
      longitude: loc.longitude,
      locationType: loc.locationType,
      formattedAddress: loc.formattedAddress,
      aliases: loc.aliases ? loc.aliases.split(',').map(a => a.trim()) : []
    };
  }
}

export default DatabaseLocationProvider;
