import { LocationProvider } from './LocationProvider.js';

/**
 * NominatimLocationProvider
 * Integrates with OpenStreetMap / Nominatim for live global and South African
 * forward geocoding, reverse geocoding, and place search.
 * Includes rate limit safety, User-Agent identification, and timeout management.
 */
export class NominatimLocationProvider extends LocationProvider {
  constructor(baseUrl = process.env.NOMINATIM_BASE_URL || 'https://nominatim.openstreetmap.org') {
    super('nominatim');
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.userAgent = process.env.LOCATION_USER_AGENT || 'LocalBizApp-SouthAfrica/2.0 (contact@localbiz.co.za)';
    this.timeoutMs = parseInt(process.env.LOCATION_API_TIMEOUT_MS, 10) || 4500;
  }

  /**
   * Helper to perform HTTP GET with timeout and user-agent
   */
  async _fetch(url) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'application/json',
          'Accept-Language': 'en-ZA,en;q=0.9'
        },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`Nominatim API returned HTTP status ${response.status}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Searches for places in South Africa
   * @param {string} query
   * @param {Object} [options]
   * @returns {Promise<Array<Object>>}
   */
  async searchPlaces(query, options = {}) {
    const q = (query || '').trim();
    if (!q) return [];

    const limit = Math.min(Math.max(parseInt(options.limit, 10) || 8, 1), 20);
    const countryCode = options.countryCode || 'za'; // Default South Africa

    const url = `${this.baseUrl}/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&countrycodes=${countryCode}&limit=${limit}`;

    try {
      const data = await this._fetch(url);
      if (!Array.isArray(data)) return [];

      return data.map(item => this._formatNominatimPlace(item));
    } catch (err) {
      console.warn(`[NominatimLocationProvider] searchPlaces error: ${err.message}`);
      return []; // Return empty to allow service-level fallback
    }
  }

  /**
   * Forward geocodes an address or locality
   * @param {string} address
   * @returns {Promise<Object|null>}
   */
  async geocode(address) {
    const results = await this.searchPlaces(address, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Reverse geocodes latitude/longitude to a recognized place
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>}
   */
  async reverseGeocode(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this.validateCoordinates(lat, lng)) {
      throw new Error(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
    }

    const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

    try {
      const data = await this._fetch(url);
      if (!data || data.error) return null;

      return this._formatNominatimPlace(data);
    } catch (err) {
      console.warn(`[NominatimLocationProvider] reverseGeocode error: ${err.message}`);
      return null; // Return null to allow service-level fallback
    }
  }

  /**
   * Normalizes Nominatim raw place payload to LocalBiz standard place contract
   */
  _formatNominatimPlace(item) {
    const addr = item.address || {};
    const suburb = addr.suburb || addr.neighbourhood || addr.quarter || addr.residential || addr.subdivision || addr.village || addr.town || addr.city || '';
    const city = addr.city || addr.town || addr.municipality || addr.county || addr.district || '';
    const province = addr.state || addr.province || addr.region || 'Gauteng';
    const postalCode = addr.postcode || '';
    const country = addr.country || 'South Africa';
    const countryCode = (addr.country_code || 'za').toUpperCase();

    const name = suburb && suburb !== city ? `${suburb}, ${city}` : (city || item.display_name.split(',')[0]);

    return {
      id: `nom-${item.place_id || item.osm_id || Math.random().toString(36).slice(2, 9)}`,
      name,
      suburb: suburb || city,
      city: city || suburb,
      municipality: addr.municipality || addr.county || '',
      province,
      provinceCode: this._mapProvinceCode(province),
      country,
      countryCode,
      postalCode,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      locationType: item.type || item.class || 'locality',
      formattedAddress: item.display_name,
      provider: 'nominatim'
    };
  }

  _mapProvinceCode(province) {
    const p = (province || '').toLowerCase();
    if (p.includes('gauteng')) return 'GP';
    if (p.includes('western cape')) return 'WC';
    if (p.includes('kwazulu') || p.includes('kzn')) return 'KZN';
    if (p.includes('eastern cape')) return 'EC';
    if (p.includes('free state')) return 'FS';
    if (p.includes('limpopo')) return 'LP';
    if (p.includes('mpumalanga')) return 'MP';
    if (p.includes('north west')) return 'NW';
    if (p.includes('northern cape')) return 'NC';
    return 'ZA';
  }
}

export default NominatimLocationProvider;
