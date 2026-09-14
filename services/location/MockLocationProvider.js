import { LocationProvider } from './LocationProvider.js';

/**
 * MockLocationProvider
 * Deterministic mock provider for unit tests, simulated offline testing,
 * and edge case validation (timeouts, network dropouts, coordinate anomalies).
 */
export class MockLocationProvider extends LocationProvider {
  constructor() {
    super('mock');
    this.shouldFail = false;
    this.failureError = 'Simulated location provider network timeout';
  }

  setShouldFail(shouldFail, errorMsg) {
    this.shouldFail = !!shouldFail;
    if (errorMsg) this.failureError = errorMsg;
  }

  async searchPlaces(query, options = {}) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }

    const q = (query || '').toLowerCase().trim();
    if (!q) return [];

    const mockPlaces = [
      {
        id: 'mock-plk-1',
        name: 'Polokwane, Limpopo',
        suburb: 'Polokwane Central',
        city: 'Polokwane',
        municipality: 'Polokwane Local Municipality',
        province: 'Limpopo',
        provinceCode: 'LP',
        country: 'South Africa',
        countryCode: 'ZA',
        postalCode: '0699',
        latitude: -23.9045,
        longitude: 29.4688,
        locationType: 'city',
        formattedAddress: 'Polokwane, Limpopo, South Africa, 0699'
      },
      {
        id: 'mock-sandton-1',
        name: 'Sandton, Johannesburg',
        suburb: 'Sandton',
        city: 'Johannesburg',
        municipality: 'City of Johannesburg',
        province: 'Gauteng',
        provinceCode: 'GP',
        country: 'South Africa',
        countryCode: 'ZA',
        postalCode: '2196',
        latitude: -26.1076,
        longitude: 28.0567,
        locationType: 'suburb',
        formattedAddress: 'Sandton, Johannesburg, Gauteng, South Africa, 2196'
      },
      {
        id: 'mock-cpt-1',
        name: 'Cape Town CBD, Western Cape',
        suburb: 'Cape Town CBD',
        city: 'Cape Town',
        municipality: 'City of Cape Town',
        province: 'Western Cape',
        provinceCode: 'WC',
        country: 'South Africa',
        countryCode: 'ZA',
        postalCode: '8001',
        latitude: -33.9249,
        longitude: 18.4241,
        locationType: 'city',
        formattedAddress: 'Cape Town CBD, Western Cape, South Africa, 8001'
      },
      {
        id: 'mock-dbn-1',
        name: 'Durban Central, KwaZulu-Natal',
        suburb: 'Durban Central',
        city: 'Durban',
        municipality: 'eThekwini Metropolitan Municipality',
        province: 'KwaZulu-Natal',
        provinceCode: 'KZN',
        country: 'South Africa',
        countryCode: 'ZA',
        postalCode: '4001',
        latitude: -29.8587,
        longitude: 31.0218,
        locationType: 'city',
        formattedAddress: 'Durban Central, KwaZulu-Natal, South Africa, 4001'
      }
    ];

    return mockPlaces.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.suburb.toLowerCase().includes(q) ||
      p.city.toLowerCase().includes(q) ||
      p.province.toLowerCase().includes(q)
    );
  }

  async geocode(address) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    const results = await this.searchPlaces(address, { limit: 1 });
    return results.length > 0 ? results[0] : null;
  }

  async reverseGeocode(latitude, longitude) {
    if (this.shouldFail) {
      throw new Error(this.failureError);
    }
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (!this.validateCoordinates(lat, lng)) {
      throw new Error(`Invalid coordinates: lat=${latitude}, lng=${longitude}`);
    }

    // Return Sandton for Gauteng coords, or Cape Town for Western Cape coords
    if (lat < -30) {
      return {
        id: 'mock-rev-cpt',
        name: 'Cape Town CBD, Western Cape',
        suburb: 'Cape Town CBD',
        city: 'Cape Town',
        municipality: 'City of Cape Town',
        province: 'Western Cape',
        provinceCode: 'WC',
        country: 'South Africa',
        countryCode: 'ZA',
        postalCode: '8001',
        latitude: lat,
        longitude: lng,
        locationType: 'city',
        formattedAddress: 'Detected near Cape Town, Western Cape'
      };
    }

    return {
      id: 'mock-rev-sandton',
      name: 'Sandton, Johannesburg',
      suburb: 'Sandton',
      city: 'Johannesburg',
      municipality: 'City of Johannesburg',
      province: 'Gauteng',
      provinceCode: 'GP',
      country: 'South Africa',
      countryCode: 'ZA',
      postalCode: '2196',
      latitude: lat,
      longitude: lng,
      locationType: 'suburb',
      formattedAddress: 'Detected near Sandton, Johannesburg, Gauteng'
    };
  }
}

export default MockLocationProvider;
