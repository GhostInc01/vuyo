# LocalBiz Platform API Documentation

## Overview
LocalBiz provides a comprehensive RESTful JSON API supporting consumer browsing, order placement, service bookings, merchant operations, multi-branch management, administrative governance, and an advanced South African geographic discovery engine.

- **Base URL**: `http://localhost:3000/api` (or environment-specific root)
- **Content-Type**: `application/json`
- **Authentication**: Bearer Token in `Authorization: Bearer <JWT>` header

---

## 1. Geographic Discovery & Location Endpoints (Stage 23)

### 1.1 Geographic Hierarchy

#### `GET /api/location/provinces`
Lists all 9 South African provinces with active entity counts.
- **Auth**: Public
- **Response**:
```json
[
  {
    "name": "Gauteng",
    "province": "Gauteng",
    "provinceCode": "GP",
    "cityCount": 4,
    "totalLocations": 12
  },
  {
    "name": "Western Cape",
    "province": "Western Cape",
    "provinceCode": "WC",
    "cityCount": 3,
    "totalLocations": 8
  }
]
```

#### `GET /api/location/cities` / `GET /api/location/provinces/:province/cities`
Lists cities and major towns, optionally filtered by province.
- **Auth**: Public
- **Parameters**: `?province=Gauteng`
- **Response**: Array of city objects with province, municipality, and centroid coordinates.

#### `GET /api/location/suburbs` / `GET /api/location/cities/:city/suburbs`
Lists suburbs and localities for a specific city.
- **Auth**: Public
- **Parameters**: `?city=Johannesburg&province=Gauteng`
- **Response**: Array of suburb objects with postal codes, formatted addresses, and coordinates.

---

### 1.2 Search, Autocomplete & Geocoding

#### `GET /api/location/search`
Searches South African places, towns, suburbs, postal codes, and aliases with typeahead autocomplete ranking.
- **Auth**: Public
- **Parameters**:
  - `q` (string, min 2 chars): Search query (e.g. `"Sandton"`, `"2196"`, `"Kasi"`)
  - `limit` (int, default 10): Max results to return
  - `province` (optional string): Restrict results to a province
- **Response**:
```json
[
  {
    "id": "loc-gp-jhb-sandton",
    "formattedAddress": "Sandton, Johannesburg, Gauteng, 2196",
    "suburb": "Sandton",
    "city": "Johannesburg",
    "province": "Gauteng",
    "postalCode": "2196",
    "latitude": -26.1076,
    "longitude": 28.0567,
    "locationType": "suburb",
    "score": 100
  }
]
```

#### `GET /api/location/geocode`
Forward-geocodes an address or locality string.
- **Auth**: Public
- **Parameters**: `?address=Sandton City`
- **Response**: Location object with coordinates and metadata.

#### `GET /api/location/reverse` / `GET /api/location/reverse-geocode`
Reverse-geocodes coordinates $(\text{lat}, \text{lng})$ to the nearest recognized South African place.
- **Auth**: Public
- **Parameters**:
  - `lat` (float, -90 to 90): Latitude
  - `lng` (float, -180 to 180): Longitude
- **Response**: Nearest location object with calculated distance offset.

---

### 1.3 Nearby Discovery Engine

#### `GET /api/location/nearby`
Primary discovery endpoint returning businesses, products, services, specials, and brand resellers within active radius.
- **Auth**: Public
- **Parameters**:
  - `lat` (float, required): Active discovery latitude
  - `lng` (float, required): Active discovery longitude
  - `radius` (string, default `"10"`): `"1"`, `"2"`, `"5"`, `"10"`, `"25"`, `"50"`, `"100"`, or `"all"`
  - `category` (optional string): Filter by industry category
  - `type` (optional string): `"all"`, `"businesses"`, `"products"`, `"services"`, `"specials"`, `"resellers"`
  - `sort` (optional string): `"nearest"` (default), `"rating"`, `"popular"`, `"newest"`
  - `page` (int, default 1), `limit` (int, default 12)
- **Response**:
```json
{
  "success": true,
  "activeLocation": {
    "latitude": -26.2585,
    "longitude": 28.1232,
    "radiusKm": 10
  },
  "counts": {
    "all": 45,
    "businesses": 6,
    "products": 28,
    "services": 11,
    "specials": 3,
    "resellers": 2
  },
  "merchants": [
    {
      "id": "b-avon",
      "name": "Nomsa's Avon Corner",
      "category": "Beauty & Cosmetics",
      "distanceKm": 0.35,
      "distanceLabel": "350 m away",
      "nearestBranch": {
        "name": "Main Store & Dispatch",
        "distanceKm": 0.35
      }
    }
  ],
  "items": [...],
  "pagination": {
    "page": 1,
    "limit": 12,
    "total": 45,
    "totalPages": 4,
    "hasMore": true
  }
}
```

---

### 1.4 Saved User Locations

#### `GET /api/location/saved`
Retrieves saved home, work, and custom discovery places for the authenticated user.
- **Auth**: Consumer or Business (`requireAuth`)

#### `POST /api/location/saved`
Saves a new location with custom label.
- **Auth**: Consumer or Business (`requireAuth`)
- **Body**:
```json
{
  "label": "Home Office",
  "formattedAddress": "Sandton City, Sandton, Johannesburg, 2196",
  "suburb": "Sandton",
  "city": "Johannesburg",
  "province": "Gauteng",
  "latitude": -26.1076,
  "longitude": 28.0567,
  "locationMode": "MANUAL_LOCATION",
  "isDefault": true
}
```

#### `DELETE /api/location/saved/:id`
Removes a saved location.
- **Auth**: Location owner (`requireAuth`)

---

### 1.5 Merchant Multi-Branch Management

#### `GET /api/merchants/:id/branches`
Lists all active branch storefronts and dispatch hubs for a merchant.
- **Auth**: Public

#### `POST /api/merchants/:id/branches`
Creates a secondary branch location.
- **Auth**: Merchant Owner or Admin (`requireAuth`)
- **Body**:
```json
{
  "name": "Sandton Collection Hub",
  "address": "Sandton City Level 2",
  "suburb": "Sandton",
  "city": "Johannesburg",
  "province": "Gauteng",
  "postalCode": "2196",
  "latitude": -26.1076,
  "longitude": 28.0567,
  "isPrimary": false,
  "serviceRadius": 10.0,
  "phone": "+27 11 883 1234"
}
```

#### `PUT /api/merchants/:id/branches/:branchId` / `PATCH`
Updates branch details (hours, contact, coordinates, service radius).
- **Auth**: Merchant Owner or Admin (`requireAuth`)

#### `DELETE /api/merchants/:id/branches/:branchId`
Deletes a secondary branch.
- **Auth**: Merchant Owner or Admin (`requireAuth`)

---

### 1.6 Admin Location Configuration & Reference Management

#### `GET /api/admin/location-config`
Retrieves current geospatial settings, active provider, cache stats, and radius options.
- **Auth**: Admin (`requireAdmin`)

#### `PUT /api/admin/location-config` / `PATCH`
Switches active provider (`database`, `nominatim`, `mock`) and default radius.
- **Auth**: Admin (`requireAdmin`)
- **Body**:
```json
{
  "provider": "database",
  "defaultRadius": 25,
  "radiusOptions": [1, 2, 5, 10, 25, 50, 100]
}
```

#### `GET /api/admin/locations`
Paginated search over reference South African localities.
- **Auth**: Admin (`requireAdmin`)
- **Parameters**: `?search=Alberton&province=Gauteng&page=1&limit=20`

#### `POST /api/admin/locations`
Creates a new managed reference location in the system.
- **Auth**: Admin (`requireAdmin`)

#### `PUT /api/admin/locations/:id` / `PATCH`
Updates an existing reference location.
- **Auth**: Admin (`requireAdmin`)

#### `DELETE /api/admin/locations/:id`
Deactivates or removes a reference location.
- **Auth**: Admin (`requireAdmin`)

---

## 2. Core Marketplace Endpoints

### 2.1 Authentication & Users
- `POST /api/auth/register` - Consumer registration
- `POST /api/auth/register-business` - Merchant registration with KYC upload
- `POST /api/auth/login` - Issues JWT token
- `GET /api/auth/me` - Authenticated profile details
- `PATCH /api/auth/profile` - Profile updates with role elevation defense

### 2.2 Merchants
- `GET /api/merchants` - List approved merchants with distance resolution (`?lat=...&lng=...`)
- `GET /api/merchants/:id` - Merchant profile with products, services, branches, and distance calculation
- `PATCH /api/merchants/:id` - Merchant profile update (verified flag protected)

### 2.3 Orders & Cart Checkout
- `GET /api/orders` - Filtered orders for consumer or merchant
- `POST /api/orders` - Place new order with inventory decrement
- `PATCH /api/orders/:id/status` - State-machine guarded order status advance

### 2.4 Bookings & Appointments
- `GET /api/bookings` - List appointments
- `POST /api/bookings` - Book service slot with conflict detection
- `PATCH /api/bookings/:id/status` - Reschedule, confirm, complete, or cancel booking

### 2.5 Payments
- `POST /api/payments` - Process simulated PayFast/Ozow/SnapScan/Card payment (PCI-DSS compliant, raw PAN/CVV stripped)
- `GET /api/payments/:id` - Transaction receipt and audit proof
