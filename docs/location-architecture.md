# LocalBiz South African Geographic Discovery & Location Engine Architecture

## 1. Executive Overview

The LocalBiz Geographic Discovery & Location System transforms LocalBiz into a production-grade, nationwide hyperlocal platform tailored specifically for the Republic of South Africa.

Rather than relying purely on device GPS (which fails in desktop environments, when permissions are denied, or when users browse areas they plan to visit), LocalBiz implements an **Active Discovery Location Engine**. This system allows consumers, merchants, and administrators anywhere in the world to explore businesses, products, services, promotions, and brand resellers across South Africa.

```
+-------------------------------------------------------------------------------+
|                       LocalBiz Geographic Discovery System                     |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [Mode A: Real-Time GPS]    [Mode B: Reference Dataset]   [Mode C: Pinpoint]  |
|  • Geolocation API          • All 9 SA Provinces          • Custom Lat / Lng  |
|  • Permission Handling      • 48+ Metros, Cities, Towns   • Interactive Map   |
|  • Non-blocking fallback    • Suburbs & Postal Codes      • Reverse Geocode   |
|                                                                               |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                  Active Discovery Location State (Client & Server)            |
|  • Persisted in localStorage (`localbiz_active_location`)                     |
|  • Overrides physical GPS without silent overwriting                          |
|  • Dynamic Configurable Radius (1, 2, 5, 10, 25, 50, 100 km, View All)        |
+---------------------------------------+---------------------------------------+
                                        |
                                        v
+-------------------------------------------------------------------------------+
|                      Geospatial Service Layer (Backend)                       |
|  • Geodesic Haversine Calculation (km)                                        |
|  • Provider Registry: Database (Offline-First) | Nominatim | Mock             |
|  • Nearest Branch Resolution for Multi-Branch Businesses                      |
|  • Service-Area vs Storefront Matching Engine                                 |
|  • In-Memory LRU Cache & Dynamic Indexing                                     |
+-------------------------------------------------------------------------------+
```

---

## 2. Core Discovery Modes

### Mode A: Real-Time Device GPS (`CURRENT_LOCATION`)
- Uses the browser's native `navigator.geolocation.getCurrentPosition()`.
- Explicit user consent prompt with clear explanation of location benefit.
- **Graceful Permission Degradation**:
  - `PERMISSION_DENIED`: Fallback notification displayed with immediate prompt to select from South African reference places. No UI locking or blank states.
  - `POSITION_UNAVAILABLE` / `TIMEOUT`: Graceful fallback to default metro (Alberton / Johannesburg).
- Coordinates reverse-geocoded against the South African dataset to assign nearest recognized suburb and city.

### Mode B: South African Reference Dataset Search & Drilldown (`MANUAL_LOCATION`)
- Comprehensive verified South African geographic dataset covering:
  - All 9 Provinces: Gauteng (GP), Western Cape (WC), KwaZulu-Natal (KZN), Eastern Cape (EC), Free State (FS), Mpumalanga (MP), Limpopo (LP), North West (NW), Northern Cape (NC).
  - Metropolitan Municipalities: City of Johannesburg, City of Cape Town, eThekwini, City of Tshwane, Ekurhuleni, Nelson Mandela Bay, Buffalo City, Mangaung.
  - Secondary Cities & Major Towns: Polokwane, Mbombela (Nelspruit), Rustenburg, Kimberley, Mahikeng, Mthatha, George, Paarl, Pietermaritzburg, etc.
  - High-traffic suburbs and postal codes.
- **Two Exploration Paths**:
  1. *Instant Typeahead Search*: Fuzzy matching, postal code queries, and alias resolution (e.g. searching "Jo'burg", "Egoli", or "Sandton City").
  2. *Hierarchical Drilldown*: Province $\rightarrow$ City / Municipality $\rightarrow$ Suburb.

### Mode C: Coordinate Pinpoint Picker (`MAP_LOCATION`)
- Manual coordinate entry with coordinate boundary validation ($\text{Lat} \in [-90, 90], \text{Lng} \in [-180, 180]$).
- South African boundary verification (recommends coordinates within South African territory $\text{Lat} \approx -22^\circ \text{ to } -35^\circ, \text{Lng} \approx 16^\circ \text{ to } 33^\circ$).
- Reverse-geocodes input coordinates to determine the closest locality.

---

## 3. Pluggable Geospatial Provider Architecture

The geospatial subsystem is decoupled through the abstract base class `LocationProvider`:

```javascript
export class LocationProvider {
  async search(query, options) { throw new Error('Not implemented'); }
  async geocode(address, options) { throw new Error('Not implemented'); }
  async reverseGeocode(lat, lng, options) { throw new Error('Not implemented'); }
}
```

### Providers Available:
1. **`DatabaseLocationProvider` (Default & Offline-First)**:
   - Queries the SQLite/MySQL `Location` table.
   - Computes geodesic distance on-the-fly via spherical Haversine formula.
   - Calculates autocomplete relevance score using substring match position, locality type weighting, and alias weighting.
   - Zero external HTTP dependencies, sub-millisecond response latency.
2. **`NominatimLocationProvider` (OpenStreetMap Integration)**:
   - Connects to OpenStreetMap Nominatim API with South African country bounding (`countrycodes=za`).
   - Configurable timeout (5 seconds) with strict user-agent compliance.
   - Automatic fallback to `DatabaseLocationProvider` on network failure, timeout, or rate-limiting.
3. **`MockLocationProvider` (Deterministic Test Provider)**:
   - In-memory mock suite simulating latency, errors, and predefined South African coordinates.
   - Used for CI/CD, unit testing, and isolated end-to-end runs.

The active provider can be switched live in the Admin Hub (`/api/admin/location-config`) without application restart.

---

## 4. Mathematical Model: Spherical Geodesic Distance

LocalBiz computes exact great-circle distance using the spherical Haversine formula:

$$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

$$d = R \cdot \Delta\sigma$$

Where:
- $R = 6371\text{ km}$ (mean spherical Earth radius)
- $\phi_1, \phi_2$ are latitude coordinates in radians
- $\Delta\phi = \phi_2 - \phi_1$
- $\Delta\lambda = \lambda_2 - \lambda_1$ (longitude difference in radians)

### Distance Formatting Rules:
- Under 1 km: displayed in meters, rounded to nearest 50 m (e.g. `"450 m away"`).
- 1 km to 100 km: displayed with 1 decimal place (e.g. `"8.4 km away"`).
- Over 100 km: displayed rounded to nearest whole kilometer (e.g. `"120 km away"`).

---

## 5. Storefront vs. Service-Area Business Model

LocalBiz natively accommodates both fixed storefront businesses and mobile service providers:

| Attribute | Storefront Business (e.g. Bakery, Hair Salon, Farm Stall) | Service-Area Business (e.g. Plumber, Electrician, Mobile Mechanic) |
| :--- | :--- | :--- |
| **Discovery Logic** | Business appears if physical distance between customer discovery point and store is $\le \text{active radius}$. | Business appears if customer discovery point is within the provider's `serviceRadius` (e.g. 35 km) or matches `serviceAreas` suburbs. |
| **Distance Badge** | Shows distance to nearest store/branch (e.g. `"2.1 km away"`). | Shows distance from service dispatch base + `"Services your area"` badge. |
| **Multi-Branch** | Customer is automatically routed to nearest branch. | Each branch serves its own configurable service radius. |

---

## 6. Multi-Branch Architecture

Businesses with multiple operational hubs (e.g. primary bakery in Katlehong and distribution depot in Sandton) manage branches via the Merchant Hub:

- **Schema**: `BusinessLocation` model linked to `Merchant`.
- **Primary Flag**: Exactly one location marked `isPrimary = true`.
- **Nearest Branch Resolution**:
  When a customer searches with discovery coordinates $(lat_u, lng_u)$, the backend iterates across all active branches:
  $$d_{\min} = \min_{b \in \text{branches}} \text{Haversine}(lat_u, lng_u, lat_b, lng_b)$$
  The merchant card renders distance $d_{\min}$ and displays the nearest branch name (e.g. *"Nearest: Sandton Hub — 3.2 km away"*).

---

## 7. POPIA & Geolocation Privacy Compliance

In accordance with the South African Protection of Personal Information Act (POPIA):
1. **No Continuous Tracking**: LocalBiz never listens to continuous background GPS (`watchPosition`). Geolocation is only requested upon explicit user interaction ("Locate Me").
2. **Ephemeral Coordinate Processing**: Client coordinates passed to `/api/location/nearby` are processed in memory and not logged to persistent user profiles unless explicitly saved by the consumer.
3. **User Control**: Consumers can review, rename, or delete saved locations at any time.

---

## 8. Database Schema & Indexes

```sql
-- Managed South African Geographic Reference Locations
CREATE TABLE `locations` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `country` VARCHAR(100) NOT NULL DEFAULT 'South Africa',
    `province` VARCHAR(100) NOT NULL,
    `municipality` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `suburb` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `formatted_address` VARCHAR(255) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `location_type` ENUM('province', 'municipality', 'city', 'town', 'suburb', 'locality') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    `aliases` TEXT NULL,
    KEY `idx_locations_province` (`province`),
    KEY `idx_locations_city` (`city`),
    KEY `idx_locations_coords` (`latitude`, `longitude`)
);

-- Merchant Multi-Branch Storefronts & Dispatch Depots
CREATE TABLE `business_locations` (
    `id` VARCHAR(50) NOT NULL PRIMARY KEY,
    `merchant_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `address` VARCHAR(255) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT TRUE,
    `service_radius` DECIMAL(6, 2) DEFAULT 10.00,
    `service_areas` JSON NULL,
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    KEY `idx_bus_loc_merchant` (`merchant_id`),
    KEY `idx_bus_loc_coords` (`latitude`, `longitude`)
);
```
