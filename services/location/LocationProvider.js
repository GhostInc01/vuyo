/**
 * LocationProvider Interface
 * Abstract base class for location, geocoding, and place autocomplete providers.
 * Follows the Provider Pattern to decouple LocalBiz from any specific mapping vendor
 * (Nominatim, Google Maps, Mapbox, local Database, etc.).
 */
export class LocationProvider {
  /**
   * @param {string} name
   */
  constructor(name = 'generic') {
    if (this.constructor === LocationProvider) {
      throw new TypeError('Abstract class "LocationProvider" cannot be instantiated directly.');
    }
    this.name = name;
  }

  /**
   * @returns {string} Provider identifier
   */
  getName() {
    return this.name;
  }

  /**
   * Searches for matching places, cities, towns, or suburbs
   * @param {string} query - Search term (e.g. "Polokwane", "Sandton")
   * @param {Object} [options] - Options like country, limit, province
   * @returns {Promise<Array<Object>>}
   */
  async searchPlaces(query, options = {}) {
    throw new Error('Method "searchPlaces()" must be implemented by subclass.');
  }

  /**
   * Forward geocodes an address or locality into geographic coordinates
   * @param {string} address
   * @returns {Promise<Object|null>} { latitude, longitude, formattedAddress, ... }
   */
  async geocode(address) {
    throw new Error('Method "geocode()" must be implemented by subclass.');
  }

  /**
   * Reverse geocodes coordinates (lat, lng) into a recognized South African locality
   * @param {number} latitude
   * @param {number} longitude
   * @returns {Promise<Object|null>} { suburb, city, province, formattedAddress, ... }
   */
  async reverseGeocode(latitude, longitude) {
    throw new Error('Method "reverseGeocode()" must be implemented by subclass.');
  }

  /**
   * Validates coordinate boundaries
   * @param {number} latitude
   * @param {number} longitude
   * @returns {boolean}
   */
  validateCoordinates(latitude, longitude) {
    const lat = Number(latitude);
    const lng = Number(longitude);
    return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}

export default LocationProvider;
