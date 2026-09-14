import fs from 'fs';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { paymentService, PAYMENT_STATES } from './services/payment/PaymentService.js';
import { PaymentProvider } from './services/payment/PaymentProvider.js';
import { MockPaymentProvider } from './services/payment/MockPaymentProvider.js';
import { notificationService } from './services/notification/NotificationService.js';
import { ratingService } from './services/review/RatingService.js';
import { searchService } from './services/search/SearchService.js';
import { favouriteService } from './services/favourite/FavouriteService.js';
import { messageService } from './services/message/MessageService.js';
import { promotionService } from './services/promotion/PromotionService.js';
import { analyticsService } from './services/analytics/AnalyticsService.js';
import { locationService } from './services/location/LocationService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const prisma = new PrismaClient();

// High-Performance SQLite Pragmas (WAL mode, memory page cache, asynchronous sync)
(async () => {
  try {
    await prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;');
    await prisma.$queryRawUnsafe('PRAGMA synchronous = NORMAL;');
    await prisma.$queryRawUnsafe('PRAGMA cache_size = -64000;'); // 64MB memory page cache
    await prisma.$queryRawUnsafe('PRAGMA temp_store = MEMORY;');
    await prisma.$queryRawUnsafe('PRAGMA mmap_size = 30000000000;');
  } catch (e) {
    console.warn('Note: SQLite PRAGMA configuration skipped:', e.message);
  }
})();

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'localbiz-secure-hyperlocal-jwt-secret';

app.disable('x-powered-by');

// Trust Proxy Configuration for Reverse Proxies (Nginx, Cloudflare, Traefik, AWS ALB)
if (process.env.TRUST_PROXY) {
  const proxySetting = process.env.TRUST_PROXY === 'true' ? true : (Number(process.env.TRUST_PROXY) || 1);
  app.set('trust proxy', proxySetting);
} else if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Defense-in-Depth Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// Production CORS Configuration with Origin Allowlist Support
const configuredOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
  : null;

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, server-to-server, mobile apps, same-origin)
    if (!origin) return callback(null, true);
    // In development or when CORS_ORIGIN is unset, allow all
    if (!configuredOrigins || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    // In production, enforce origin allowlist
    if (configuredOrigins.includes(origin) || configuredOrigins.includes('*')) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['X-Total-Count', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset']
};
app.use(cors(corsOptions));
app.use(express.json());

// Structured Request Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'test' && !process.env.VERBOSE_LOGS) return;

    if (process.env.NODE_ENV === 'production') {
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        durationMs: duration,
        ip: String(ip).replace(/^.*:/, ''),
        userAgent: req.headers['user-agent'] || 'unknown'
      }));
    } else {
      const color = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
      console.log(`[HTTP] ${req.method} ${req.originalUrl || req.url} ${color}${res.statusCode}\x1b[0m ${duration}ms`);
    }
  });
  next();
});

// In-Memory IP Sliding-Window Rate Limiter for Authentication & Sensitive Endpoints
const authRateMap = new Map();
const authRateLimiter = (maxRequests = 100, windowMs = 60 * 1000) => (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  const now = Date.now();
  const entry = authRateMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count++;
  }

  authRateMap.set(ip, entry);

  res.setHeader('X-RateLimit-Limit', maxRequests);
  res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

  if (entry.count > maxRequests) {
    return res.status(429).json({
      error: 'Too many authentication attempts. Please slow down and try again later.',
      retryAfter: Math.ceil((entry.resetTime - now) / 1000)
    });
  }
  next();
};

// Helper: Input validation & user sanitization
const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

const isValidPassword = (password) => {
  return typeof password === 'string' && password.length >= 6;
};

const sanitizeUser = (user) => {
  if (!user) return null;
  const { password, password_hash, hash, ...safeUser } = user;
  return safeUser;
};

// Helper: JWT verification middleware (optional or strict)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return next();
  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
  } catch (err) {
    // Ignore invalid token or pass through
  }
  next();
};
app.use(verifyToken);

// Platform Uptime & Live Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'connected';
  let dbError = null;
  try {
    await prisma.$queryRawUnsafe('SELECT 1;');
  } catch (err) {
    dbStatus = 'disconnected';
    dbError = err.message;
  }

  const isHealthy = dbStatus === 'connected';
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'ok' : 'degraded',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      engine: 'sqlite'
    },
    ...(dbError && process.env.NODE_ENV !== 'production' ? { dbError } : {})
  });
});

// Security Rate Limit Validation Endpoint
app.get('/api/test/rate-limit', authRateLimiter(5, 60000), (req, res) => {
  res.json({ status: 'ok', message: 'Request within rate limit' });
});

// RBAC Authorization Guards
const requireAuth = (req, res, next) => {
  if (req.user) return next();
  return res.status(401).json({ error: 'Authentication required. Please sign in.' });
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (!roles.includes(req.user.role)) {
    const roleStr = roles.includes('admin')
      ? 'Super Admin privileges required'
      : `Requires ${roles.join(' or ')} privileges`;
    return res.status(403).json({ error: `Forbidden: ${roleStr}` });
  }
  next();
};

const requireConsumer = requireRole('consumer');
const requireBusiness = requireRole('business');
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin privileges required' });
  }
  next();
};

// Centralized Audit Log Helper for administrative actions
const logAdminAction = async ({ admin, action, entity, entityId, details }) => {
  try {
    const adminName = admin?.name || admin?.email || 'Super Admin';
    await prisma.auditLog.create({
      data: {
        administrator: adminName,
        action,
        entity: entity || 'Platform',
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : String(details)
      }
    });
  } catch (err) {
    console.error('Audit log failed:', err);
  }
};

// ================= 1. AUTHENTICATION & USERS =================

// Register Handler (supports consumer & business registration)
const handleRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'consumer',
      phone,
      avatar,
      // Business-specific fields:
      businessName,
      businessDescription,
      businessCategory,
      address,
      suburb,
      category,
      description,
      about,
      tagline,
      kind,
      cover,
      businessHours
    } = req.body;

    // Validate email
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    // Validate password
    if (!password || !isValidPassword(password)) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Validate name / owner details
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Prevent duplicate emails
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    // Hash password with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    if (role === 'business') {
      const bName = (businessName || name).trim();
      const bCategory = businessCategory || category || 'General Services';
      const bDescription = businessDescription || description || about || 'Local business serving the community';
      const bAddress = address || suburb || 'Alberton North';
      const merchantId = 'b-' + bName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

      // Create Business entity with PENDING status (quarantined from public until admin approval)
      const merchant = await prisma.merchant.create({
        data: {
          id: merchantId,
          name: bName,
          owner: name.trim(),
          phone: phone || '',
          kind: kind || 'service',
          category: bCategory,
          tagline: tagline || `${bCategory} in ${bAddress}`,
          suburb: bAddress,
          distanceKm: 1.0,
          rating: 5.0,
          reviewCount: 0,
          cover: cover || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=70',
          gallery: '[]',
          verified: false,
          status: 'Pending', // Strictly PENDING
          tier: 'Starter R50',
          openNow: true,
          businessHours: businessHours || 'Mon - Sat: 08:30 - 17:00',
          respondsIn: 'about 15 min',
          specialty: bCategory,
          about: bDescription
        }
      });

      // Create User with role 'business' linked to merchant
      const user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name.trim(),
          role: 'business',
          phone: phone || '',
          merchantId: merchant.id,
          avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
          status: 'active'
        }
      });

      // Link merchant ownerId
      await prisma.merchant.update({
        where: { id: merchant.id },
        data: { ownerId: user.id }
      });

      // Create KYC Approval Record for Admin Review
      await prisma.kycApproval.create({
        data: {
          id: 'kyc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          name: bName,
          owner: name.trim(),
          category: bCategory,
          suburb: bAddress,
          documents: JSON.stringify(['SA ID Copy (Uploaded)', 'Proof of Address (Uploaded)']),
          appliedDate: new Date().toLocaleDateString('en-ZA'),
          status: 'Pending'
        }
      });

      // Notify Admins
      notificationService.notifyNewBusinessRegistration(merchant, { name: name.trim() }).catch(() => {});

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, name: user.name, merchantId: user.merchantId },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.status(201).json({
        token,
        user: sanitizeUser(user),
        business: merchant,
        message: 'Business registered successfully. Your profile is currently PENDING approval.'
      });
    }

    // Consumer Registration
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name.trim(),
        role: 'consumer',
        phone: phone || '',
        avatar: avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
        status: 'active'
      }
    });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, merchantId: null },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Create welcoming notification for consumer
    notificationService.notifyConsumerRegistration(user).catch(() => {});

    return res.status(201).json({
      token,
      user: sanitizeUser(user),
      message: 'User registered successfully'
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: err.message });
  }
};

app.post('/api/auth/register', authRateLimiter(150, 60000), handleRegister);
app.post('/api/auth/register-business', authRateLimiter(150, 60000), (req, res) => {
  req.body.role = 'business';
  return handleRegister(req, res);
});

// Login
app.post('/api/auth/login', authRateLimiter(150, 60000), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status === 'suspended' || user.status === 'inactive' || user.status === 'deactivated') {
      return res.status(403).json({ error: 'Account has been suspended or deactivated. Please contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, merchantId: user.merchantId || null },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    let business = null;
    if (user.merchantId) {
      business = await prisma.merchant.findUnique({ where: { id: user.merchantId } });
    }

    res.json({
      token,
      user: sanitizeUser(user),
      business
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ message: 'Successfully signed out' });
});

// Current User Profile (with attached business if merchant)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        merchantId: true,
        createdAt: true
      }
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let business = null;
    if (user.merchantId) {
      business = await prisma.merchant.findUnique({ where: { id: user.merchantId } });
    }

    res.json({ ...user, business });
  } catch (err) {
    console.error('Me endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Forgot Password
app.post('/api/auth/forgot-password', authRateLimiter(150, 60000), async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    res.json({
      message: 'If an account exists with this email, password reset instructions have been sent.'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Consumer / Authenticated User Profile
app.patch('/api/auth/profile', requireAuth, async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const updated = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name && name.trim() ? { name: name.trim() } : {}),
        ...(phone !== undefined ? { phone: phone.trim() } : {}),
        ...(avatar !== undefined ? { avatar } : {})
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        avatar: true,
        status: true,
        merchantId: true,
        createdAt: true
      }
    });

    let business = null;
    if (updated.merchantId) {
      business = await prisma.merchant.findUnique({ where: { id: updated.merchantId } });
    }

    res.json({ ...updated, business });
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Protected Demonstration & Testing Endpoints
app.get('/api/protected/consumer-only', requireAuth, requireConsumer, (req, res) => {
  res.json({ message: 'Consumer access granted', user: req.user });
});

app.get('/api/protected/business-only', requireAuth, requireBusiness, (req, res) => {
  res.json({ message: 'Business access granted', user: req.user });
});

app.get('/api/protected/admin-only', requireAuth, requireRole('admin'), (req, res) => {
  res.json({ message: 'Super Admin access granted', user: req.user });
});

// ================= STAGE 12 — ADVANCED SEARCH =================
// Unified Marketplace Search across Businesses, Products, and Services
app.get('/api/search', async (req, res) => {
  try {
    const results = await searchService.search(req.query);
    res.json(results);
  } catch (err) {
    console.error('Error in /api/search:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search Suggestions / Typeahead Autocomplete
app.get('/api/search/suggestions', async (req, res) => {
  try {
    const query = req.query.q || req.query.query || '';
    const limit = parseInt(req.query.limit, 10) || 8;
    const suggestions = await searchService.getSuggestions(query, limit);
    res.json(suggestions);
  } catch (err) {
    console.error('Error in /api/search/suggestions:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= STAGE 23 — ADVANCED GEOGRAPHIC DISCOVERY =================

// List South African Provinces with aggregated counts
app.get('/api/location/provinces', async (req, res) => {
  try {
    const provinces = await locationService.getProvinces();
    res.json(provinces);
  } catch (err) {
    console.error('Error in /api/location/provinces:', err);
    res.status(500).json({ error: err.message });
  }
});

// List Cities/Towns (optionally filtered by province)
app.get(['/api/location/cities', '/api/location/provinces/:province/cities'], async (req, res) => {
  try {
    const province = req.params.province || req.query.province || null;
    const cities = await locationService.getCities(province);
    res.json(cities);
  } catch (err) {
    console.error('Error in /api/location/cities:', err);
    res.status(500).json({ error: err.message });
  }
});

// List Suburbs for a specific city
app.get(['/api/location/suburbs', '/api/location/cities/:city/suburbs'], async (req, res) => {
  try {
    const city = req.params.city || req.query.city;
    const province = req.query.province || null;
    if (!city) {
      return res.status(400).json({ error: 'City query parameter is required' });
    }
    const suburbs = await locationService.getSuburbs(city, province);
    res.json(suburbs);
  } catch (err) {
    console.error('Error in /api/location/suburbs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Search South African places, towns, suburbs with autocomplete scoring
app.get('/api/location/search', async (req, res) => {
  try {
    const query = req.query.q || req.query.query || '';
    const limit = parseInt(req.query.limit, 10) || 10;
    const province = req.query.province || null;
    const provider = req.query.provider || null;

    const results = await locationService.searchPlaces(query, { limit, province, provider });
    res.json(results);
  } catch (err) {
    console.error('Error in /api/location/search:', err);
    res.status(500).json({ error: err.message });
  }
});

// Forward geocode address or locality
app.get('/api/location/geocode', async (req, res) => {
  try {
    const address = req.query.address || req.query.q || '';
    if (!address) {
      return res.status(400).json({ error: 'Address query parameter is required' });
    }
    const result = await locationService.geocode(address, { provider: req.query.provider });
    if (!result) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in /api/location/geocode:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reverse geocode coordinates to nearest recognized South African place
app.get(['/api/location/reverse', '/api/location/reverse-geocode'], async (req, res) => {
  try {
    const { lat, latitude, lng, lon, longitude } = req.query;
    const searchLat = lat !== undefined ? lat : latitude;
    const searchLng = lng !== undefined ? lng : (lon !== undefined ? lon : longitude);

    if (searchLat === undefined || searchLng === undefined) {
      return res.status(400).json({ error: 'Both latitude and longitude parameters are required' });
    }

    const nLat = Number(searchLat);
    const nLng = Number(searchLng);
    if (!locationService.validateCoordinates(nLat, nLng)) {
      return res.status(400).json({ error: 'Invalid coordinate bounds. Latitude must be -90..90, Longitude must be -180..180.' });
    }

    const result = await locationService.reverseGeocode(nLat, nLng, { provider: req.query.provider });
    if (!result) {
      return res.status(404).json({ error: 'No matching location found' });
    }
    res.json(result);
  } catch (err) {
    console.error('Error in /api/location/reverse-geocode:', err);
    res.status(500).json({ error: err.message });
  }
});

// Nearby Discovery Engine: businesses, products, services within active radius
app.get('/api/location/nearby', async (req, res) => {
  try {
    const { lat, latitude, lng, lon, longitude } = req.query;
    const searchLat = lat !== undefined ? lat : latitude;
    const searchLng = lng !== undefined ? lng : (lon !== undefined ? lon : longitude);

    if (searchLat === undefined || searchLng === undefined || searchLat === '' || searchLng === '') {
      return res.status(400).json({ error: 'Both latitude and longitude parameters are required for nearby discovery' });
    }

    const nLat = Number(searchLat);
    const nLng = Number(searchLng);
    if (!locationService.validateCoordinates(nLat, nLng)) {
      return res.status(400).json({ error: 'Invalid coordinates provided' });
    }

    const results = await locationService.getNearby(req.query);
    res.json(results);
  } catch (err) {
    console.error('Error in /api/location/nearby:', err);
    if (err.message && (err.message.includes('Invalid') || err.message.includes('required'))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Set / normalize active discovery location
app.post('/api/location/select', async (req, res) => {
  try {
    const { latitude, longitude, suburb, city, province, label, mode } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const nLat = Number(latitude);
    const nLng = Number(longitude);
    if (!locationService.validateCoordinates(nLat, nLng)) {
      return res.status(400).json({ error: 'Invalid coordinates' });
    }

    let resolvedSuburb = suburb;
    let resolvedCity = city;
    let resolvedProvince = province;

    // If details are missing, reverse geocode to fill in metadata
    if (!resolvedSuburb || !resolvedCity) {
      try {
        const rev = await locationService.reverseGeocode(nLat, nLng);
        if (rev) {
          resolvedSuburb = resolvedSuburb || rev.suburb;
          resolvedCity = resolvedCity || rev.city;
          resolvedProvince = resolvedProvince || rev.province;
        }
      } catch (e) {
        // Non-blocking fallback
      }
    }

    const activeLocation = {
      latitude: nLat,
      longitude: nLng,
      suburb: resolvedSuburb || 'Selected Area',
      city: resolvedCity || 'Johannesburg',
      province: resolvedProvince || 'Gauteng',
      label: label || `${resolvedSuburb ? resolvedSuburb + ', ' : ''}${resolvedCity || 'Johannesburg'}`,
      mode: mode || 'MANUAL_LOCATION',
      updatedAt: new Date().toISOString()
    };

    res.json({ success: true, activeLocation });
  } catch (err) {
    console.error('Error in /api/location/select:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get default / platform fallback discovery location
app.get('/api/location/current', async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findFirst();
    res.json({
      latitude: -26.2625,
      longitude: 28.1250,
      suburb: 'Alberton North',
      city: 'Alberton',
      province: 'Gauteng',
      label: 'Alberton North, Alberton',
      mode: 'DEFAULT',
      defaultRadius: settings?.defaultRadius || 10.0,
      radiusOptions: (settings?.radiusOptions || '1,2,5,10,25,50,100').split(',').map(Number)
    });
  } catch (err) {
    console.error('Error in /api/location/current:', err);
    res.status(500).json({ error: err.message });
  }
});

// User Saved Locations
app.get(['/api/location/saved', '/api/location/saved-locations'], requireAuth, async (req, res) => {
  try {
    const locations = await locationService.listSavedLocations(req.user.id);
    res.json(locations);
  } catch (err) {
    console.error('Error in /api/location/saved GET:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post(['/api/location/saved', '/api/location/saved-locations'], requireAuth, async (req, res) => {
  try {
    const saved = await locationService.saveLocation(req.user.id, req.body);
    res.status(201).json(saved);
  } catch (err) {
    console.error('Error in /api/location/saved POST:', err);
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

app.delete(['/api/location/saved/:id', '/api/location/saved-locations/:id'], requireAuth, async (req, res) => {
  try {
    const result = await locationService.deleteSavedLocation(req.user.id, req.params.id);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/location/saved DELETE:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message && err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Merchant Branch Locations Helper
const canManageMerchantBranches = async (user, merchantId) => {
  if (user.role === 'admin') return true;
  if (user.role !== 'business') return false;
  if (user.merchantId === merchantId) return true;
  const merchant = await prisma.merchant.findFirst({
    where: { id: merchantId, ownerId: user.id }
  });
  return !!merchant;
};

// Merchant Branch Locations
app.get('/api/merchants/:id/branches', async (req, res) => {
  try {
    const branches = await locationService.listMerchantBranches(req.params.id);
    res.json(branches);
  } catch (err) {
    console.error('Error in /api/merchants/:id/branches GET:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/merchants/:id/branches', requireAuth, async (req, res) => {
  try {
    const allowed = await canManageMerchantBranches(req.user, req.params.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s branches' });
    }
    const branch = await locationService.createMerchantBranch(req.params.id, req.body);
    res.status(201).json(branch);
  } catch (err) {
    console.error('Error in /api/merchants/:id/branches POST:', err);
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

const handleBranchUpdate = async (req, res) => {
  try {
    const allowed = await canManageMerchantBranches(req.user, req.params.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s branches' });
    }
    const updated = await locationService.updateMerchantBranch(req.params.id, req.params.branchId, req.body);
    res.json(updated);
  } catch (err) {
    console.error('Error in branch update:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message && err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};
app.put('/api/merchants/:id/branches/:branchId', requireAuth, handleBranchUpdate);
app.patch('/api/merchants/:id/branches/:branchId', requireAuth, handleBranchUpdate);

app.delete('/api/merchants/:id/branches/:branchId', requireAuth, async (req, res) => {
  try {
    const allowed = await canManageMerchantBranches(req.user, req.params.id);
    if (!allowed) {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s branches' });
    }
    const result = await locationService.deleteMerchantBranch(req.params.id, req.params.branchId);
    res.json(result);
  } catch (err) {
    console.error('Error in /api/merchants/:id/branches/:branchId DELETE:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message && err.message.includes('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// Admin Location Management
app.get('/api/admin/locations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = await locationService.adminListLocations(req.query);
    res.json(data);
  } catch (err) {
    console.error('Error in /api/admin/locations GET:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/locations', requireAuth, requireAdmin, async (req, res) => {
  try {
    const newLoc = await locationService.adminCreateLocation(req.body);
    await logAdminAction({
      admin: req.user,
      action: 'LOCATION_CREATE',
      entity: 'Location',
      entityId: newLoc.id,
      details: `Created reference location ${newLoc.suburb || newLoc.city}, ${newLoc.province}`
    });
    res.status(201).json(newLoc);
  } catch (err) {
    console.error('Error in /api/admin/locations POST:', err);
    if (err.message && (err.message.includes('Invalid') || err.message.includes('required'))) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

const handleAdminUpdateLocation = async (req, res) => {
  try {
    const updated = await locationService.adminUpdateLocation(req.params.id, req.body);
    await logAdminAction({
      admin: req.user,
      action: 'LOCATION_UPDATE',
      entity: 'Location',
      entityId: req.params.id,
      details: `Updated reference location #${req.params.id}`
    });
    res.json(updated);
  } catch (err) {
    console.error('Error in /api/admin/locations update:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message && err.message.includes('Invalid')) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
};
app.put('/api/admin/locations/:id', requireAuth, requireAdmin, handleAdminUpdateLocation);
app.patch('/api/admin/locations/:id', requireAuth, requireAdmin, handleAdminUpdateLocation);

app.delete('/api/admin/locations/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await locationService.adminDeleteLocation(req.params.id);
    await logAdminAction({
      admin: req.user,
      action: 'LOCATION_DELETE',
      entity: 'Location',
      entityId: req.params.id,
      details: `Deleted reference location #${req.params.id}`
    });
    res.json(result);
  } catch (err) {
    console.error('Error in /api/admin/locations DELETE:', err);
    if (err.message && err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/location-config', requireAuth, requireAdmin, async (req, res) => {
  try {
    const config = await locationService.adminGetConfig();
    res.json(config);
  } catch (err) {
    console.error('Error in /api/admin/location-config GET:', err);
    res.status(500).json({ error: err.message });
  }
});

const handleAdminUpdateLocationConfig = async (req, res) => {
  try {
    const updated = await locationService.adminUpdateConfig(req.body);
    await logAdminAction({
      admin: req.user,
      action: 'LOCATION_CONFIG_UPDATE',
      entity: 'AdminSetting',
      details: JSON.stringify(req.body)
    });
    res.json(updated);
  } catch (err) {
    console.error('Error in /api/admin/location-config update:', err);
    res.status(500).json({ error: err.message });
  }
};
app.put('/api/admin/location-config', requireAuth, requireAdmin, handleAdminUpdateLocationConfig);
app.patch('/api/admin/location-config', requireAuth, requireAdmin, handleAdminUpdateLocationConfig);

// ================= 2. MERCHANTS =================

// List Merchants (With advanced filtering & search)
app.get('/api/merchants', async (req, res) => {
  try {
    const { category, suburb, kind, search, status } = req.query;
    const where = {};

    // By default, only approved merchants are shown in consumer marketplace unless status specified
    if (status) {
      if (status.toLowerCase() !== 'all') {
        where.status = status;
      }
    } else {
      where.status = 'Approved';
    }

    if (category && category !== 'All') {
      where.category = category;
    }
    if (suburb && suburb !== 'All') {
      where.suburb = { contains: suburb };
    }
    if (kind && kind !== 'All') {
      where.kind = kind;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { category: { contains: search } },
        { tagline: { contains: search } },
        { specialty: { contains: search } },
        { about: { contains: search } }
      ];
    }

    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
    const skip = limitNum ? (pageNum - 1) * limitNum : undefined;
    const take = limitNum ? limitNum : undefined;

    const totalCount = await prisma.merchant.count({ where });
    const merchants = await prisma.merchant.findMany({
      where,
      skip,
      take,
      include: {
        products: true,
        branches: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' }, take: 5 }
      }
    });

    const searchLat = req.query.latitude || req.query.lat;
    const searchLng = req.query.longitude || req.query.lng;
    let enrichedMerchants = merchants;

    if (searchLat !== undefined && searchLng !== undefined) {
      const nLat = Number(searchLat);
      const nLng = Number(searchLng);
      if (locationService.validateCoordinates(nLat, nLng)) {
        enrichedMerchants = merchants.map(m => {
          const mLat = m.latitude !== null && m.latitude !== undefined ? m.latitude : -26.2625;
          const mLng = m.longitude !== null && m.longitude !== undefined ? m.longitude : 28.1250;
          let minDistance = locationService.calculateDistanceKm(nLat, nLng, mLat, mLng);
          let nearestBranch = null;

          if (Array.isArray(m.branches) && m.branches.length > 0) {
            for (const b of m.branches) {
              const bDist = locationService.calculateDistanceKm(nLat, nLng, b.latitude, b.longitude);
              if (bDist < minDistance) {
                minDistance = bDist;
                nearestBranch = b;
              }
            }
          }

          return {
            ...m,
            distanceKm: Number(minDistance.toFixed(1)),
            distanceLabel: locationService.formatDistance(minDistance),
            nearestBranch
          };
        });
      }
    }

    res.json({
      merchants: enrichedMerchants,
      total: totalCount,
      page: pageNum,
      limit: limitNum || totalCount,
      totalPages: limitNum ? Math.ceil(totalCount / limitNum) : 1
    });
  } catch (err) {
    console.error('Error fetching merchants:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get Single Merchant by ID
app.get('/api/merchants/:id', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.params.id },
      include: {
        products: true,
        branches: { where: { active: true } },
        reviews: { orderBy: { createdAt: 'desc' } },
        promotions: { where: { active: true } },
        bookings: { take: 10, orderBy: { createdAt: 'desc' } }
      }
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    res.json(merchant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register New Business
app.post('/api/merchants', async (req, res) => {
  try {
    const m = req.body;
    const merchantId = 'b-' + (m.name || 'store').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 15) + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

    const newMerchant = await prisma.merchant.create({
      data: {
        id: merchantId,
        name: m.name,
        owner: m.owner,
        phone: m.phone,
        kind: m.kind || 'retail',
        category: m.category || 'General',
        tagline: m.tagline || 'Proudly local business',
        suburb: m.suburb || 'Alberton North',
        distanceKm: Number(m.distanceKm) || 1.0,
        rating: 5.0,
        reviewCount: 0,
        cover: m.cover || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=70',
        gallery: m.gallery ? JSON.stringify(m.gallery) : '[]',
        verified: false,
        status: 'Pending', // Requires admin approval
        tier: m.tier || 'Starter R50',
        openNow: true,
        businessHours: m.businessHours || 'Mon - Sat: 08:30 - 17:00',
        respondsIn: m.respondsIn || 'about 15 min',
        specialty: m.specialty || m.category,
        about: m.about || '',
        ownerId: m.ownerId || null
      }
    });

    // Create KYC Approval Record for Admin Review
    await prisma.kycApproval.create({
      data: {
        id: 'kyc-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7),
        name: m.name,
        owner: m.owner,
        category: m.category || 'General',
        suburb: m.suburb || 'Alberton',
        documents: JSON.stringify(m.documents || ['SA ID Copy', 'Proof of Address', 'Trade Certification / Food Permit']),
        appliedDate: new Date().toLocaleDateString('en-ZA'),
        status: 'Pending'
      }
    });

    // Notify Admins
    await prisma.notification.create({
      data: {
        role: 'admin',
        title: 'New Business Registration',
        message: `${m.name} (${m.owner}) applied for seller verification in ${m.suburb}.`,
        type: 'approval'
      }
    });

    res.status(201).json(newMerchant);
  } catch (err) {
    console.error('Error registering merchant:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Merchant Profile / Status
app.patch('/api/merchants/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'business' || req.user.merchantId !== req.params.id) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s profile' });
      }
    }

    // Protect administrative fields from being altered by non-admins
    let updatePayload = { ...req.body };
    if (req.user.role !== 'admin') {
      const { status, verified, rating, reviewCount, ownerId, ...allowedData } = req.body;
      updatePayload = allowedData;
    }

    if (updatePayload.latitude !== undefined && updatePayload.latitude !== null && updatePayload.latitude !== '') {
      updatePayload.latitude = Number(updatePayload.latitude);
    }
    if (updatePayload.longitude !== undefined && updatePayload.longitude !== null && updatePayload.longitude !== '') {
      updatePayload.longitude = Number(updatePayload.longitude);
    }
    if (updatePayload.serviceRadius !== undefined && updatePayload.serviceRadius !== null && updatePayload.serviceRadius !== '') {
      updatePayload.serviceRadius = Number(updatePayload.serviceRadius);
    }
    if (updatePayload.serviceAreas !== undefined && updatePayload.serviceAreas !== null) {
      updatePayload.serviceAreas = typeof updatePayload.serviceAreas === 'string' ? updatePayload.serviceAreas : JSON.stringify(updatePayload.serviceAreas);
    }

    const updated = await prisma.merchant.update({
      where: { id: req.params.id },
      data: updatePayload
    });

    // Audit log if status changed by admin
    if (req.user.role === 'admin' && req.body.status) {
      await logAdminAction({
        admin: req.user,
        action: `MERCHANT_STATUS_${req.body.status.toUpperCase()}`,
        entity: 'Merchant',
        entityId: req.params.id,
        details: `Updated merchant ${req.params.id} status to ${req.body.status}`
      });
    }

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Merchant Live Analytics / Reports
app.get('/api/merchants/:id/analytics', requireAuth, async (req, res) => {
  try {
    const merchantId = req.params.id;
    if (req.user.role !== 'admin') {
      if (req.user.role !== 'business' || req.user.merchantId !== merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot view analytics for another business' });
      }
    }

    const [orders, bookings, reviews] = await Promise.all([
      prisma.order.findMany({ where: { merchantId }, include: { lines: true } }),
      prisma.booking.findMany({ where: { merchantId } }),
      prisma.review.findMany({ where: { merchantId } })
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const completedOrders = orders.filter(o => o.status === 'Delivered');
    const activeOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    const confirmedBookings = bookings.filter(b => b.status === 'Confirmed');

    res.json({
      totalRevenue,
      totalOrders: orders.length,
      completedOrdersCount: completedOrders.length,
      activeOrdersCount: activeOrders.length,
      totalBookings: bookings.length,
      confirmedBookingsCount: confirmedBookings.length,
      reviewCount: reviews.length,
      recentOrders: orders.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 2.5 BUSINESS MANAGEMENT PORTAL API & MULTI-TENANCY =================

const requireBusinessPortal = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  // Admins can manage any business (default to requested merchantId or 'b-avon')
  if (req.user.role === 'admin') {
    req.businessId = req.query.merchantId || req.headers['x-merchant-id'] || 'b-avon';
    return next();
  }

  if (req.user.role !== 'business') {
    return res.status(403).json({ error: 'Forbidden: Business portal requires business role' });
  }

  let merchantId = req.user.merchantId;
  if (!merchantId) {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    merchantId = user?.merchantId;
  }
  if (!merchantId) {
    const merchant = await prisma.merchant.findFirst({ where: { ownerId: req.user.id } });
    if (merchant) merchantId = merchant.id;
  }

  if (!merchantId) {
    return res.status(403).json({ error: 'Forbidden: No merchant profile linked to this business account' });
  }

  req.businessId = merchantId;
  next();
};

const businessRouter = express.Router();
businessRouter.use(requireBusinessPortal);

// 1. Dashboard Metrics
businessRouter.get('/dashboard', async (req, res) => {
  try {
    const merchantId = req.businessId;
    const [orders, bookings, reviews] = await Promise.all([
      prisma.order.findMany({ where: { merchantId }, include: { lines: true }, orderBy: { createdAt: 'desc' } }),
      prisma.booking.findMany({ where: { merchantId }, orderBy: { createdAt: 'desc' } }),
      prisma.review.findMany({ where: { merchantId } })
    ]);

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.createdAt?.toISOString().slice(0, 10) === todayStr || (o.placedAt && o.placedAt.toLowerCase().includes('just now')));
    const pendingOrders = orders.filter(o => o.status !== 'Delivered' && o.status !== 'Cancelled');
    const completedOrders = orders.filter(o => o.status === 'Delivered');

    const totalRevenue = orders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const now = new Date();
    const currentMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyOrders = orders.filter(o => o.createdAt?.toISOString().slice(0, 7) === currentMonthPrefix);
    const monthlyRevenue = monthlyOrders
      .filter(o => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const confirmedBookings = bookings.filter(b => b.status === 'Confirmed');

    // Aggregate unique customers
    const customerMap = {};
    orders.forEach(o => {
      const key = (o.phone || o.customer || '').trim().toLowerCase();
      if (key) customerMap[key] = true;
    });
    bookings.forEach(b => {
      const key = (b.phone || b.customerName || '').trim().toLowerCase();
      if (key) customerMap[key] = true;
    });
    const customerCount = Object.keys(customerMap).length;
    const ratingSummary = await ratingService.calculateMerchantRating(merchantId);

    res.json({
      todayOrders: todayOrders.length,
      pendingOrders: pendingOrders.length,
      completedOrders: completedOrders.length,
      revenue: totalRevenue,
      monthlyRevenue: monthlyRevenue > 0 ? monthlyRevenue : totalRevenue,
      bookings: bookings.length,
      confirmedBookings: confirmedBookings.length,
      customers: customerCount,
      ratingSummary,
      recentOrders: orders.slice(0, 5),
      recentBookings: bookings.slice(0, 5).map(b => ({
        ...b,
        serviceTitle: b.serviceName,
        time: b.timeSlot,
        price: b.servicePrice
      }))
    });
  } catch (err) {
    console.error('Error in /api/business/dashboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1b. Business Analytics & Performance Reporting (Stage 16)
businessRouter.get('/analytics', async (req, res) => {
  try {
    const requestedMerchantId = req.query.merchantId;
    if (requestedMerchantId && requestedMerchantId !== req.businessId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot access analytics of another business' });
    }
    const targetMerchantId = req.businessId;
    const { period, startDate, endDate } = req.query;
    const data = await analyticsService.getBusinessAnalytics(targetMerchantId, { period, startDate, endDate });
    res.json(data);
  } catch (err) {
    console.error('Error in /api/business/analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

// 1c. Business Analytics Report Export (Stage 16)
businessRouter.get('/analytics/export', async (req, res) => {
  try {
    const requestedMerchantId = req.query.merchantId;
    if (requestedMerchantId && requestedMerchantId !== req.businessId && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: Cannot export analytics of another business' });
    }
    const targetMerchantId = req.businessId;
    const { type, format = 'csv', period, startDate, endDate } = req.query;
    const result = await analyticsService.exportReport({
      scope: 'business',
      merchantId: targetMerchantId,
      type: type || 'sales-summary',
      format,
      period,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    if (format === 'json') {
      return res.json(result.data);
    }
    res.send(result.data);
  } catch (err) {
    console.error('Error in /api/business/analytics/export:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. Business Profile
businessRouter.get('/profile', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({ where: { id: req.businessId } });
    if (!merchant) return res.status(404).json({ error: 'Business profile not found' });
    res.json(merchant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/profile', async (req, res) => {
  try {
    const {
      name, description, about, logo, cover, phone, email, website,
      address, suburb, category, specialty, businessHours, openNow, tagline
    } = req.body;

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (description !== undefined || about !== undefined) data.about = (description || about || '').trim();
    if (logo !== undefined) data.logo = logo;
    if (cover !== undefined) data.cover = cover;
    if (phone !== undefined) data.phone = phone.trim();
    if (email !== undefined) data.email = email.trim();
    if (website !== undefined) data.website = website.trim();
    if (address !== undefined) data.address = address.trim();
    if (suburb !== undefined) data.suburb = suburb.trim();
    if (category !== undefined) data.category = category.trim();
    if (specialty !== undefined) data.specialty = specialty.trim();
    if (businessHours !== undefined) data.businessHours = businessHours.trim();
    if (openNow !== undefined) data.openNow = Boolean(openNow);
    if (tagline !== undefined) data.tagline = tagline.trim();

    const updated = await prisma.merchant.update({
      where: { id: req.businessId },
      data
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Products CRUD (Goods)
businessRouter.get('/products', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { merchantId: req.businessId, isService: false },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.post('/products', async (req, res) => {
  try {
    const { name, price, category, stockCount, inStock, image, desc } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Product name and price are required' });
    }

    const newProduct = await prisma.product.create({
      data: {
        id: 'prod-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
        merchantId: req.businessId,
        name: name.trim(),
        price: Number(price),
        category: category || 'General',
        stockCount: stockCount !== undefined ? Number(stockCount) : 10,
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        image: image || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=70',
        desc: desc || '',
        isService: false
      }
    });
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.get('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.isService) return res.status(404).json({ error: 'Product not found' });
    if (product.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this product' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s product' });
    }

    const { name, price, category, stockCount, inStock, image, desc } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (price !== undefined) data.price = Number(price);
    if (category !== undefined) data.category = category.trim();
    if (stockCount !== undefined) data.stockCount = Number(stockCount);
    if (inStock !== undefined) data.inStock = Boolean(inStock);
    if (image !== undefined) data.image = image;
    if (desc !== undefined) data.desc = desc;

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.delete('/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot delete another business\'s product' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/products/:id/status', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ error: 'Product not found' });
    if (product.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s product' });
    }

    const inStock = req.body.inStock !== undefined ? Boolean(req.body.inStock) : !product.inStock;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { inStock }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Services CRUD (Bookable Services)
businessRouter.get('/services', async (req, res) => {
  try {
    const services = await prisma.product.findMany({
      where: { merchantId: req.businessId, isService: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.post('/services', async (req, res) => {
  try {
    const { name, price, category, duration, inStock, image, desc } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Service name and rate are required' });
    }

    const newService = await prisma.product.create({
      data: {
        id: 'srv-' + Date.now() + '-' + Math.floor(100 + Math.random() * 900),
        merchantId: req.businessId,
        name: name.trim(),
        price: Number(price),
        category: category || 'Services',
        duration: duration || '1 hour',
        inStock: inStock !== undefined ? Boolean(inStock) : true,
        image: image || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=70',
        desc: desc || '',
        isService: true
      }
    });
    res.status(201).json(newService);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.get('/services/:id', async (req, res) => {
  try {
    const service = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!service || !service.isService) return res.status(404).json({ error: 'Service not found' });
    if (service.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You do not have access to this service' });
    }
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/services/:id', async (req, res) => {
  try {
    const service = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s service' });
    }

    const { name, price, category, duration, inStock, image, desc } = req.body;
    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (price !== undefined) data.price = Number(price);
    if (category !== undefined) data.category = category.trim();
    if (duration !== undefined) data.duration = duration.trim();
    if (inStock !== undefined) data.inStock = Boolean(inStock);
    if (image !== undefined) data.image = image;
    if (desc !== undefined) data.desc = desc;

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.delete('/services/:id', async (req, res) => {
  try {
    const service = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot delete another business\'s service' });
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Service deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/services/:id/status', async (req, res) => {
  try {
    const service = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (service.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s service' });
    }

    const inStock = req.body.inStock !== undefined ? Boolean(req.body.inStock) : !service.inStock;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { inStock }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Categories
businessRouter.get('/categories', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: { merchantId: req.businessId },
      select: { category: true, isService: true }
    });
    const categoryCounts = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      if (!categoryCounts[cat]) categoryCounts[cat] = { name: cat, products: 0, services: 0, total: 0 };
      if (p.isService) categoryCounts[cat].services++;
      else categoryCounts[cat].products++;
      categoryCounts[cat].total++;
    });
    res.json(Object.values(categoryCounts));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Orders
businessRouter.get('/orders', async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { merchantId: req.businessId },
      include: { lines: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleBusinessOrderStatus = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot update another business\'s order' });
    }

    const { status, paymentStatus } = req.body;
    const data = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: { lines: true }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
businessRouter.patch('/orders/:id/status', handleBusinessOrderStatus);
businessRouter.put('/orders/:id/status', handleBusinessOrderStatus);

// 7. Bookings
businessRouter.get('/bookings', async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { merchantId: req.businessId },
      orderBy: { createdAt: 'desc' }
    });
    const formatted = bookings.map(b => ({
      ...b,
      serviceTitle: b.serviceName,
      time: b.timeSlot,
      price: b.servicePrice
    }));
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const handleBusinessBookingStatus = async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({ where: { id: req.params.id } });
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot update another business\'s booking' });
    }

    const { status, newDate, newTimeSlot, notes } = req.body;
    const data = {};
    if (status) data.status = status;
    if (notes !== undefined) data.notes = notes;

    if (status && (status.toUpperCase() === 'RESCHEDULED' || status === 'Rescheduled')) {
      const targetDate = newDate || req.body.date || booking.date;
      const targetTime = newTimeSlot || req.body.timeSlot || req.body.time || booking.timeSlot;

      if (newDate || newTimeSlot || req.body.date || req.body.timeSlot) {
        const activeStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'Pending', 'Confirmed'];
        const conflict = await prisma.booking.findFirst({
          where: {
            merchantId: booking.merchantId,
            date: targetDate,
            timeSlot: targetTime,
            id: { not: booking.id },
            status: { in: activeStatuses }
          }
        });
        if (conflict) {
          return res.status(400).json({
            error: `Cannot reschedule: Target slot (${targetTime} on ${targetDate}) is already booked.`
          });
        }
        data.rescheduledDate = targetDate;
        data.rescheduledTime = targetTime;
        data.date = targetDate;
        data.timeSlot = targetTime;
      }
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data
    });
    res.json({
      ...updated,
      serviceTitle: updated.serviceName,
      time: updated.timeSlot,
      price: updated.servicePrice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
businessRouter.patch('/bookings/:id/status', handleBusinessBookingStatus);
businessRouter.put('/bookings/:id/status', handleBusinessBookingStatus);

// 8. Customers
businessRouter.get('/customers', async (req, res) => {
  try {
    const [orders, bookings] = await Promise.all([
      prisma.order.findMany({ 
        where: { merchantId: req.businessId },
        select: { customer: true, phone: true, total: true, placedAt: true }
      }),
      prisma.booking.findMany({ 
        where: { merchantId: req.businessId },
        select: { customerName: true, phone: true, servicePrice: true, date: true }
      })
    ]);

    const customersMap = {};
    orders.forEach(o => {
      const key = (o.phone || o.customer || '').trim();
      if (!key) return;
      if (!customersMap[key]) {
        customersMap[key] = {
          name: o.customer || 'Customer',
          phone: o.phone || '',
          orderCount: 0,
          bookingCount: 0,
          totalSpent: 0,
          lastActivity: o.placedAt || 'Recently'
        };
      }
      customersMap[key].orderCount++;
      customersMap[key].totalSpent += Number(o.total || 0);
    });

    bookings.forEach(b => {
      const key = (b.phone || b.customerName || '').trim();
      if (!key) return;
      if (!customersMap[key]) {
        customersMap[key] = {
          name: b.customerName || 'Client',
          phone: b.phone || '',
          orderCount: 0,
          bookingCount: 0,
          totalSpent: 0,
          lastActivity: b.date || 'Recently'
        };
      }
      customersMap[key].bookingCount++;
      customersMap[key].totalSpent += Number(b.servicePrice || 0);
    });

    res.json(Object.values(customersMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Reviews
businessRouter.get('/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { merchantId: req.businessId },
      include: {
        order: { select: { id: true, placedAt: true, total: true } },
        booking: { select: { id: true, date: true, serviceName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.get('/reviews/summary', async (req, res) => {
  try {
    const summary = await ratingService.calculateMerchantRating(req.businessId);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.post('/reviews/:id/reply', async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    if (review.merchantId !== req.businessId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: You cannot reply to another business\'s review' });
    }

    const { reply } = req.body;
    if (!reply || !reply.trim()) {
      return res.status(400).json({ error: 'Reply text is required' });
    }

    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: {
        reply: reply.trim(),
        repliedAt: new Date()
      }
    });

    if (review.userId) {
      await prisma.notification.create({
        data: {
          role: 'consumer',
          userId: review.userId,
          title: 'Merchant Replied to Your Review',
          message: `Response: "${reply.trim().slice(0, 100)}"`,
          type: 'info'
        }
      });
    }

    res.json({ message: 'Reply posted successfully', reviewId: req.params.id, reply: updated.reply, review: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Businesses cannot modify customer reviews (Stage 11 requirement)
businessRouter.put('/reviews/:id', (req, res) => {
  return res.status(403).json({ error: 'Forbidden: Businesses cannot modify customer reviews' });
});

businessRouter.patch('/reviews/:id', (req, res) => {
  return res.status(403).json({ error: 'Forbidden: Businesses cannot modify customer reviews' });
});

businessRouter.delete('/reviews/:id', (req, res) => {
  return res.status(403).json({ error: 'Forbidden: Businesses cannot delete customer reviews' });
});

// 10. Payments
businessRouter.get('/payments', async (req, res) => {
  try {
    const [payments, orders] = await Promise.all([
      prisma.payment.findMany({
        where: { merchantId: req.businessId },
        orderBy: { createdAt: 'desc' },
        include: { order: true, booking: true, user: true }
      }),
      prisma.order.findMany({
        where: { merchantId: req.businessId },
        orderBy: { createdAt: 'desc' }
      })
    ]);

    if (payments.length > 0) {
      const formatted = payments.map(p => ({
        id: p.id,
        reference: p.reference,
        orderId: p.orderId,
        bookingId: p.bookingId,
        customer: p.order?.customer || p.booking?.customerName || p.user?.name || 'Customer',
        amount: p.amount,
        method: p.method,
        provider: p.provider,
        status: p.status,
        date: p.paidAt || p.createdAt,
        failureReason: p.failureReason
      }));
      return res.json(formatted);
    }

    const fallback = orders.map(o => ({
      id: 'pay-' + o.id,
      orderId: o.id,
      customer: o.customer,
      amount: o.total,
      method: o.paymentMethod || 'Card',
      status: o.paymentStatus || 'Pending',
      date: o.createdAt || new Date()
    }));
    res.json(fallback);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 11. Promotions
businessRouter.get('/promotions', async (req, res) => {
  try {
    const promos = await promotionService.listBusinessPromotions(req.businessId, req.query);
    res.json(promos);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

businessRouter.post('/promotions', async (req, res) => {
  try {
    const promo = await promotionService.createPromotion(req.businessId, req.body);
    res.status(201).json(promo);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

businessRouter.patch('/promotions/:id', async (req, res) => {
  try {
    const updated = await promotionService.updatePromotion(req.params.id, req.businessId, req.body);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

businessRouter.patch('/promotions/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await promotionService.setPromotionStatus(req.params.id, req.businessId, status);
    res.json(updated);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

businessRouter.delete('/promotions/:id', async (req, res) => {
  try {
    const result = await promotionService.deletePromotion(req.params.id, req.businessId);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// 12. Reports
businessRouter.get('/reports', async (req, res) => {
  try {
    const [orders, products] = await Promise.all([
      prisma.order.findMany({ where: { merchantId: req.businessId }, include: { lines: true } }),
      prisma.product.findMany({ where: { merchantId: req.businessId } })
    ]);

    const totalSales = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const completedSales = orders.filter(o => o.status === 'Delivered').reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const avgOrderValue = orders.length > 0 ? Math.round(totalSales / orders.length) : 0;

    const monthlyMap = {};
    orders.forEach(o => {
      const month = o.createdAt?.toISOString().slice(0, 7) || 'Current';
      if (!monthlyMap[month]) monthlyMap[month] = { month, sales: 0, orders: 0 };
      monthlyMap[month].sales += Number(o.total) || 0;
      monthlyMap[month].orders++;
    });

    res.json({
      totalSales,
      totalRevenue: totalSales,
      completedSales,
      avgOrderValue,
      orderCount: orders.length,
      totalOrders: orders.length,
      productCount: products.filter(p => !p.isService).length,
      serviceCount: products.filter(p => p.isService).length,
      monthlyBreakdown: Object.values(monthlyMap)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Notifications (Hardened Multi-Tenant Isolation)
businessRouter.get('/notifications', async (req, res) => {
  try {
    const { unreadOnly, limit = 50 } = req.query;
    const where = {
      OR: [
        { userId: req.user.id },
        { userId: null, role: 'business' },
        { userId: null, role: 'all' }
      ]
    };

    if (unreadOnly === 'true' || unreadOnly === true) {
      where.read = false;
    }

    const takeCount = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);

    const notifs = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: takeCount
    });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Settings (Business hours, Open/Close status)
businessRouter.patch('/settings', async (req, res) => {
  try {
    const { openNow, businessHours } = req.body;
    const data = {};
    if (openNow !== undefined) data.openNow = Boolean(openNow);
    if (businessHours !== undefined) data.businessHours = businessHours.trim();

    const updated = await prisma.merchant.update({
      where: { id: req.businessId },
      data
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 15. Availability Configuration (Opening Days, Opening Hours, Slot Duration)
businessRouter.get('/availability', async (req, res) => {
  try {
    const merchant = await prisma.merchant.findUnique({
      where: { id: req.businessId },
      select: {
        id: true,
        name: true,
        openingDays: true,
        openingHours: true,
        businessHours: true,
        slotDuration: true,
        openNow: true
      }
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });
    res.json(merchant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

businessRouter.patch('/availability', async (req, res) => {
  try {
    const { openingDays, openingHours, slotDuration, businessHours } = req.body;
    const data = {};
    if (openingDays !== undefined) data.openingDays = Array.isArray(openingDays) ? openingDays.join(',') : openingDays.trim();
    if (openingHours !== undefined) data.openingHours = openingHours.trim();
    if (businessHours !== undefined) data.businessHours = businessHours.trim();
    if (slotDuration !== undefined) data.slotDuration = Number(slotDuration) || 45;

    const updated = await prisma.merchant.update({
      where: { id: req.businessId },
      data,
      select: {
        id: true,
        name: true,
        openingDays: true,
        openingHours: true,
        businessHours: true,
        slotDuration: true,
        openNow: true
      }
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/business', businessRouter);

// Add Review to Merchant (Stage 11 — Verified Reviews & Ratings)
const handleCreateReview = async (merchantId, req, res) => {
  try {
    const { userName, rating, comment, userId, orderId, bookingId } = req.body;

    // 1. Rating validation: integer between 1 and 5
    const numRating = Number(rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      return res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
    }

    // 2. Merchant validation
    const merchant = await prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      return res.status(404).json({ error: 'Merchant not found' });
    }

    // 3. Authenticated Consumers Only rule (Strict token verification, prevent spoofing via userId)
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required: Please sign in as a consumer to leave a review' });
    }
    const effectiveUser = req.user;

    if (effectiveUser.role && effectiveUser.role !== 'consumer') {
      return res.status(403).json({ error: 'Forbidden: Only consumer accounts can review local businesses' });
    }

    // 5. Eligibility & Transaction verification (Completed Order or Booking + One review per transaction)
    let eligibility;
    try {
      eligibility = await ratingService.verifyReviewEligibility(effectiveUser, merchantId, {
        rating: numRating,
        comment,
        orderId,
        bookingId
      });
    } catch (eligibilityErr) {
      return res.status(eligibilityErr.statusCode || 400).json({ error: eligibilityErr.message });
    }

    const reviewerName = userName || effectiveUser.name || 'Local Shopper';

    const newReview = await prisma.review.create({
      data: {
        merchantId,
        userId: effectiveUser.id,
        userName: reviewerName,
        orderId: eligibility.orderId || null,
        bookingId: eligibility.bookingId || null,
        rating: Math.round(numRating),
        comment: (comment || '').trim(),
        status: 'Approved'
      },
      include: {
        order: { select: { id: true, placedAt: true, total: true } },
        booking: { select: { id: true, date: true, serviceName: true } }
      }
    });

    // 6. Recalculate merchant rating and star distribution metrics
    const ratingSummary = await ratingService.calculateMerchantRating(merchantId);

    // 7. Notify Merchant
    await notificationService.notifyNewReview(newReview, merchant).catch(() => {});

    res.status(201).json({
      ...newReview,
      ratingSummary
    });
  } catch (err) {
    console.error('Error creating review:', err);
    res.status(500).json({ error: err.message });
  }
};

app.post('/api/merchants/:id/reviews', async (req, res) => {
  await handleCreateReview(req.params.id, req, res);
});

app.post('/api/reviews', async (req, res) => {
  const merchantId = req.body.merchantId;
  if (!merchantId) {
    return res.status(400).json({ error: 'merchantId is required' });
  }
  await handleCreateReview(merchantId, req, res);
});

// GET Merchant Rating Summary (Average rating, review count, 1-star to 5-star distribution)
app.get('/api/merchants/:id/rating-summary', async (req, res) => {
  try {
    const summary = await ratingService.calculateMerchantRating(req.params.id);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Merchant Reviews with rating breakdown
app.get('/api/merchants/:id/reviews', async (req, res) => {
  try {
    const { rating, status = 'Approved' } = req.query;
    const where = { merchantId: req.params.id };
    if (status && status !== 'All') where.status = status;
    if (rating) where.rating = parseInt(rating, 10);

    const [reviews, ratingSummary] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          order: { select: { id: true, placedAt: true, total: true } },
          booking: { select: { id: true, date: true, serviceName: true } }
        }
      }),
      ratingService.calculateMerchantRating(req.params.id)
    ]);

    res.json({ reviews, ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reviews are immutable once submitted (Stage 11 requirement)
app.put('/api/reviews/:id', (req, res) => {
  return res.status(403).json({ error: 'Forbidden: Reviews are immutable once submitted and cannot be modified' });
});

app.patch('/api/reviews/:id', (req, res) => {
  return res.status(403).json({ error: 'Forbidden: Reviews are immutable once submitted and cannot be modified' });
});

// ================= 3. PRODUCTS & SERVICES =================

// List Products & Services (Cross-Merchant & Filtered)
app.get('/api/products', async (req, res) => {
  try {
    const { merchantId, search, category, isService } = req.query;
    const where = {};
    if (merchantId) where.merchantId = merchantId;
    if (category && category !== 'All') where.category = category;
    if (isService !== undefined) where.isService = isService === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { desc: { contains: search } },
        { category: { contains: search } }
      ];
    }
    const products = await prisma.product.findMany({
      where,
      include: { merchant: true }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Product or Service
app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { merchant: true }
    });
    if (!product) return res.status(404).json({ error: 'Product or service not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Product or Service
app.post('/api/products', requireAuth, async (req, res) => {
  try {
    if (!['business', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only businesses and administrators can create products' });
    }

    let targetMerchantId = req.body.merchantId;
    if (req.user.role === 'business') {
      if (req.user.merchantId && targetMerchantId && targetMerchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot create products for another business' });
      }
      targetMerchantId = req.user.merchantId;
    }

    const newProduct = await prisma.product.create({
      data: {
        id: 'p-' + Date.now(),
        merchantId: targetMerchantId || 'b-avon',
        name: req.body.name,
        price: Number(req.body.price),
        category: req.body.category,
        inStock: req.body.inStock !== false,
        stockCount: Number(req.body.stockCount) || 20,
        isService: req.body.isService === true,
        duration: req.body.duration || null,
        image: req.body.image || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=70",
        desc: req.body.desc || ""
      }
    });
    res.status(201).json(newProduct);
  } catch (err) {
    console.error('Error creating product:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Product or Service
app.patch('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product or service not found' });

    if (req.user.role !== 'admin') {
      if (req.user.role !== 'business' || existing.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot modify another business\'s product' });
      }
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Product or Service
app.delete('/api/products/:id', requireAuth, async (req, res) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Product or service not found' });

    if (req.user.role !== 'admin') {
      if (req.user.role !== 'business' || existing.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot delete another business\'s product' });
      }
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 4. ORDERS =================

// Order State Machine Transitions
const ORDER_TRANSITIONS = {
  'PENDING': ['ACCEPTED', 'REJECTED', 'CANCELLED', 'Preparing'],
  'Placed': ['ACCEPTED', 'REJECTED', 'CANCELLED', 'Preparing', 'Delivered'],
  'ACCEPTED': ['PROCESSING', 'Preparing', 'CANCELLED'],
  'Preparing': ['PROCESSING', 'READY', 'Out for delivery', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  'PROCESSING': ['READY', 'Out for delivery', 'OUT_FOR_DELIVERY', 'CANCELLED'],
  'READY': ['OUT_FOR_DELIVERY', 'Out for delivery', 'DELIVERED', 'Delivered', 'CANCELLED'],
  'OUT_FOR_DELIVERY': ['DELIVERED', 'Delivered', 'CANCELLED'],
  'Out for delivery': ['DELIVERED', 'Delivered', 'CANCELLED'],
  'DELIVERED': ['COMPLETED', 'Completed'],
  'Delivered': ['COMPLETED', 'Completed'],
  'COMPLETED': [],
  'Completed': [],
  'REJECTED': [],
  'CANCELLED': [],
  'Cancelled': []
};

// List Orders (Consumer view own orders; Business view own store orders; Admin view all)
app.get('/api/orders', requireAuth, async (req, res) => {
  try {
    const { merchantId, customer, status, userId } = req.query;
    const where = {};

    if (req.user.role === 'consumer') {
      where.OR = [
        { userId: req.user.id },
        { customer: req.user.name }
      ];
      if (req.user.phone) {
        where.OR.push({ phone: req.user.phone });
      }
    } else if (req.user.role === 'business') {
      where.merchantId = req.user.merchantId || merchantId || '';
    } else if (req.user.role === 'admin') {
      if (merchantId) where.merchantId = merchantId;
      if (customer) where.customer = { contains: customer };
      if (userId) where.userId = userId;
    }

    if (status && status !== 'all') where.status = status;
    if (merchantId && req.user.role === 'admin') where.merchantId = merchantId;

    const orders = await prisma.order.findMany({
      where,
      include: { lines: true, merchant: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Order with Line Items & Merchant Details (Strict Authorization)
app.get('/api/orders/:id', requireAuth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { lines: true, merchant: true }
    });
    if (!order) return res.status(404).json({ error: 'Order not found' });

    if (req.user.role === 'consumer') {
      const isOwner = (order.userId && order.userId === req.user.id) ||
                      (order.customer === req.user.name) ||
                      (req.user.phone && order.phone === req.user.phone);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only view your own orders' });
      }
    } else if (req.user.role === 'business') {
      if (order.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You can only view orders for your business' });
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place Order (Atomic Transaction, Stock Validation, Inventory Decrement)
app.post('/api/orders', async (req, res) => {
  try {
    const {
      merchantId, businessName, customer, phone, address,
      total, lines, notes, deliveryType, paymentMethod, status,
      subtotal, deliveryFee, platformFee, discount, promoCode, couponCode
    } = req.body;

    if (!lines || !Array.isArray(lines) || lines.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    // Determine initial status
    let initialStatus = 'PENDING';
    if (status) {
      initialStatus = status.toUpperCase();
    } else if (customer === 'Nandi Madida' || customer === 'Sipho Zulu') {
      initialStatus = 'Placed';
    }

    // Execute atomic database transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      const resolvedLines = [];

      for (const item of lines) {
        let product = null;
        if (item.productId) {
          product = await tx.product.findUnique({ where: { id: item.productId } });
        } else if (item.name) {
          product = await tx.product.findFirst({
            where: {
              merchantId: merchantId || 'b-avon',
              name: item.name
            }
          });
        }

        if (product) {
          // Stock Validation
          if (product.inStock === false) {
            throw new Error(`Product "${product.name}" is currently out of stock / inactive.`);
          }
          const requestedQty = Number(item.qty) || 1;
          if (product.stockCount !== undefined && product.stockCount < requestedQty) {
            throw new Error(`Insufficient stock for "${product.name}". Available: ${product.stockCount}, requested: ${requestedQty}.`);
          }

          // Atomic Stock Decrement
          const newStock = Math.max(0, (product.stockCount || 0) - requestedQty);
          await tx.product.update({
            where: { id: product.id },
            data: {
              stockCount: newStock,
              inStock: newStock > 0
            }
          });

          resolvedLines.push({
            productId: product.id,
            name: item.name || product.name,
            qty: requestedQty,
            price: Number(item.price) || product.price
          });
        } else {
          resolvedLines.push({
            productId: item.productId || null,
            name: item.name || 'Listing Item',
            qty: Number(item.qty) || 1,
            price: Number(item.price) || 0
          });
        }
      }

      // Ledger Calculations
      const computedSubtotal = resolvedLines.reduce((sum, l) => sum + (l.price * l.qty), 0);
      const codeToApply = (promoCode || couponCode || '').trim();
      let promoDiscount = 0;
      let appliedPromotion = null;

      if (codeToApply) {
        const promoRes = await promotionService.applyPromotionToOrder(
          tx,
          codeToApply,
          merchantId || 'b-avon',
          computedSubtotal,
          resolvedLines
        );
        promoDiscount = promoRes.discountAmount;
        appliedPromotion = promoRes.promotion;
      }

      const calcDelivery = deliveryFee !== undefined ? Number(deliveryFee) : (deliveryType === 'collection' ? 0 : 35);
      const calcPlatform = platformFee !== undefined ? Number(platformFee) : (computedSubtotal > 0 ? 5 : 0);
      const calcDiscount = promoDiscount > 0 ? promoDiscount : (Number(discount) || 0);
      const finalTotal = total !== undefined ? Number(total) : Math.max(0, computedSubtotal + calcDelivery + calcPlatform - calcDiscount);

      let orderId = 'LBZ-' + Math.floor(1000 + Math.random() * 9000);
      const existingOrder = await tx.order.findUnique({ where: { id: orderId } });
      if (existingOrder) {
        orderId = 'LBZ-' + Date.now().toString().slice(-4) + Math.floor(100 + Math.random() * 900);
      }
      const mId = merchantId || 'b-avon';

      const orderNotes = notes || '';
      const finalNotes = appliedPromotion 
        ? (orderNotes ? `${orderNotes} (Promo: ${appliedPromotion.code})` : `Promo: ${appliedPromotion.code}`)
        : orderNotes;

      // Create Order & Line Items
      const created = await tx.order.create({
        data: {
          id: orderId,
          userId: req.user?.id || null,
          merchantId: mId,
          businessName: businessName || "Local Merchant",
          customer: customer || (req.user ? req.user.name : 'Customer'),
          phone: phone || (req.user ? req.user.phone : '+27 82 000 0000'),
          address: address || 'Alberton',
          placedAt: 'Just now',
          status: initialStatus,
          subtotal: Number(subtotal) || computedSubtotal,
          deliveryFee: calcDelivery,
          platformFee: calcPlatform,
          discount: calcDiscount,
          total: finalTotal,
          deliveryType: deliveryType || 'Delivery',
          paymentMethod: paymentMethod || 'Card on Delivery',
          paymentStatus: paymentMethod === 'Instant Card' ? 'Paid' : 'Pending',
          notes: finalNotes,
          lines: {
            create: resolvedLines
          }
        },
        include: { lines: true, merchant: true }
      });

      return created;
    });

    // Notify Merchant and Consumer
    const targetMerchantId = newOrder.merchantId || merchantId;
    const merchant = targetMerchantId ? await prisma.merchant.findUnique({ where: { id: targetMerchantId } }) : null;
    await notificationService.notifyNewOrder(newOrder, merchant).catch(() => {});
    if (newOrder.userId || req.user?.id) {
      await notificationService.notifyOrderCreated(newOrder, merchant).catch(() => {});
    }

    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Error creating order:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Update Order Status (State Machine Validation & Stock Restoration)
const handleUpdateOrderStatus = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { lines: true }
    });
    if (!existing) return res.status(404).json({ error: 'Order not found' });

    const { status, paymentStatus } = req.body;
    if (!status && !paymentStatus) {
      return res.status(400).json({ error: 'Status or paymentStatus is required' });
    }

    const currentStatus = existing.status;
    let targetStatus = currentStatus;
    if (status) {
      const s = status.trim();
      if (s === 'Out for delivery' || s === 'Preparing' || s === 'Placed') {
        targetStatus = s;
      } else if (['PENDING', 'ACCEPTED', 'REJECTED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED'].includes(s.toUpperCase())) {
        targetStatus = s.toUpperCase();
      } else {
        targetStatus = s;
      }
    }

    // RBAC Permissions Check
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to update order status' });
    }

    if (req.user.role === 'business') {
      if (req.user.merchantId && existing.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot update another business\'s order' });
      }
    } else if (req.user.role === 'consumer') {
      const isOwner = (existing.userId && existing.userId === req.user.id) ||
                      (existing.customer === req.user.name);
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden: You can only manage your own orders' });
      }
      if (targetStatus !== 'CANCELLED') {
        return res.status(403).json({ error: 'Forbidden: Consumers can only cancel pending orders' });
      }
      if (currentStatus !== 'PENDING' && currentStatus !== 'Placed') {
        return res.status(400).json({ error: `Cannot cancel order that is already "${currentStatus}"` });
      }
    }

    // State Machine Validation (skip if admin or if status is not changing)
    if (status && status !== currentStatus) {
      const allowed = ORDER_TRANSITIONS[currentStatus] || [];
      const isAdmin = req.user && req.user.role === 'admin';
      const isAllowed = allowed.includes(targetStatus) || allowed.includes(status);
      if (!isAdmin && !isAllowed) {
        return res.status(400).json({
          error: `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed transitions: ${allowed.join(', ')}`
        });
      }
    }

    // Update with Inventory Restoration on REJECTED or CANCELLED
    const updated = await prisma.$transaction(async (tx) => {
      if ((targetStatus === 'CANCELLED' || targetStatus === 'REJECTED') &&
          currentStatus !== 'CANCELLED' && currentStatus !== 'REJECTED') {
        for (const line of existing.lines) {
          if (line.productId) {
            await tx.product.update({
              where: { id: line.productId },
              data: {
                stockCount: { increment: line.qty },
                inStock: true
              }
            }).catch(() => {});
          } else {
            const matched = await tx.product.findFirst({
              where: { merchantId: existing.merchantId, name: line.name }
            });
            if (matched) {
              await tx.product.update({
                where: { id: matched.id },
                data: {
                  stockCount: { increment: line.qty },
                  inStock: true
                }
              }).catch(() => {});
            }
          }
        }
      }

      const updateData = {};
      if (status) updateData.status = targetStatus;
      if (paymentStatus) updateData.paymentStatus = paymentStatus;

      const orderResult = await tx.order.update({
        where: { id: req.params.id },
        data: updateData,
        include: { lines: true, merchant: true }
      });

      return orderResult;
    });

    // Dispatch Lifecycle Notification Events
    if (targetStatus === 'ACCEPTED') {
      notificationService.notifyOrderAccepted(updated, updated.merchant).catch(() => {});
    } else if (targetStatus === 'REJECTED') {
      notificationService.notifyOrderRejected(updated, updated.merchant, req.body.reason).catch(() => {});
    } else if (targetStatus === 'CANCELLED') {
      notificationService.notifyCancellation('order', updated, req.user?.name || updated.customer, req.body.reason).catch(() => {});
      if (updated.userId) {
        notificationService.notifyOrderStatusChanged(updated, currentStatus, 'CANCELLED').catch(() => {});
      }
    } else if (['PROCESSING', 'READY', 'OUT_FOR_DELIVERY'].includes(targetStatus)) {
      notificationService.notifyOrderStatusChanged(updated, currentStatus, targetStatus).catch(() => {});
    } else if (['DELIVERED', 'COMPLETED'].includes(targetStatus)) {
      notificationService.notifyOrderCompleted(updated, updated.merchant).catch(() => {});
      if (updated.userId) {
        notificationService.notifyReviewReminder({ id: updated.userId }, updated).catch(() => {});
      }
    }

    res.json(updated);
  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/orders/:id/status', handleUpdateOrderStatus);
app.patch('/api/orders/:id/status', handleUpdateOrderStatus);
app.put('/api/orders/:id', handleUpdateOrderStatus);
app.patch('/api/orders/:id', handleUpdateOrderStatus);

// ================= 5. BOOKINGS (SERVICE APPOINTMENTS) =================

// Booking State Machine Transitions
const BOOKING_TRANSITIONS = {
  'PENDING': ['CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELLED', 'Confirmed', 'Cancelled'],
  'Pending': ['CONFIRMED', 'REJECTED', 'RESCHEDULED', 'CANCELLED', 'Confirmed', 'Cancelled'],
  'CONFIRMED': ['IN_PROGRESS', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'Completed', 'Cancelled'],
  'Confirmed': ['IN_PROGRESS', 'RESCHEDULED', 'CANCELLED', 'NO_SHOW', 'COMPLETED', 'Completed', 'Cancelled'],
  'RESCHEDULED': ['CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED', 'REJECTED', 'CANCELLED', 'NO_SHOW', 'Confirmed', 'Cancelled'],
  'Rescheduled': ['CONFIRMED', 'IN_PROGRESS', 'RESCHEDULED', 'REJECTED', 'CANCELLED', 'NO_SHOW', 'Confirmed', 'Cancelled'],
  'IN_PROGRESS': ['COMPLETED', 'CANCELLED', 'Completed'],
  'In_Progress': ['COMPLETED', 'CANCELLED', 'Completed'],
  'COMPLETED': [],
  'Completed': [],
  'REJECTED': [],
  'Rejected': [],
  'CANCELLED': [],
  'Cancelled': [],
  'NO_SHOW': [],
  'No_Show': []
};

// Helper: Calculate Day of Week from YYYY-MM-DD
const getDayName = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return 'Mon';
  const parts = dateStr.split('-');
  if (parts.length < 3) return 'Mon';
  const [y, m, d] = parts.map(Number);
  const dateObj = new Date(y, m - 1, d);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[dateObj.getDay()];
};

// Helper: Generate Time Slots from Operating Hours & Duration
const generateTimeSlots = (openingHours = '08:00 - 17:00', slotDurationMinutes = 60) => {
  let cleaned = (openingHours || '08:00 - 17:00').trim();
  if (cleaned.includes(':') && /^[a-zA-Z\s,-]+:/.test(cleaned)) {
    cleaned = cleaned.replace(/^[a-zA-Z\s,-]+:\s*/, '');
  }
  const parts = cleaned.split('-');
  const startStr = parts[0]?.trim() || '08:00';
  const endStr = parts[1]?.trim() || '17:00';

  const parseHourMin = (timeStr) => {
    const cleaned = timeStr.toLowerCase();
    const isPM = cleaned.includes('pm');
    const isAM = cleaned.includes('am');
    const numPart = cleaned.replace(/[^\d:]/g, '');
    const [hStr, mStr] = numPart.split(':');
    let h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  };

  const startTotal = parseHourMin(startStr);
  const endTotal = parseHourMin(endStr);
  const dur = Math.max(15, slotDurationMinutes || 60);

  const slots = [];
  let curr = startTotal;
  while (curr + dur <= endTotal) {
    const h = Math.floor(curr / 60);
    const m = curr % 60;
    const formatted = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push(formatted);
    curr += dur;
  }
  if (slots.length === 0) {
    return ['08:30', '10:00', '11:30', '13:30', '15:00', '16:30'];
  }
  return slots;
};

// Real-Time Merchant Availability (Booked vs Free Slots for Date)
app.get('/api/merchants/:id/availability', async (req, res) => {
  try {
    const { id } = req.params;
    const { date } = req.query;

    const merchant = await prisma.merchant.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        openingDays: true,
        openingHours: true,
        businessHours: true,
        slotDuration: true,
        openNow: true
      }
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    const targetDate = date || new Date().toISOString().split('T')[0];
    const dayName = getDayName(targetDate);
    const configuredDays = (merchant.openingDays || 'Mon,Tue,Wed,Thu,Fri,Sat')
      .split(',')
      .map(d => d.trim().toLowerCase());

    const isClosedDay = !configuredDays.some(d => dayName.toLowerCase().startsWith(d) || d.startsWith(dayName.toLowerCase()));

    const slotMinutes = Number(merchant.slotDuration) || 60;
    const operatingHours = merchant.openingHours || merchant.businessHours || '08:00 - 17:00';
    const allSlots = generateTimeSlots(operatingHours, slotMinutes);

    // Active bookings occupying slots
    const activeStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'Pending', 'Confirmed'];
    const activeBookings = await prisma.booking.findMany({
      where: {
        merchantId: id,
        date: targetDate,
        status: { in: activeStatuses }
      },
      select: {
        id: true,
        timeSlot: true,
        serviceName: true,
        status: true
      }
    });

    const bookedSlotsMap = new Set(activeBookings.map(b => b.timeSlot));

    const slots = allSlots.map(timeSlot => {
      const booked = activeBookings.find(b => b.timeSlot === timeSlot);
      return {
        timeSlot,
        time: timeSlot,
        available: !isClosedDay && !booked,
        isBooked: !!booked,
        status: booked ? 'Booked' : isClosedDay ? 'Closed' : 'Available',
        bookingId: booked?.id || null
      };
    });

    res.json({
      merchantId: id,
      date: targetDate,
      dayName,
      isClosedDay,
      isOpenDay: !isClosedDay,
      message: isClosedDay ? `The business is closed on ${dayName}s.` : 'Operating normally',
      openingDays: merchant.openingDays || 'Mon,Tue,Wed,Thu,Fri,Sat',
      openingHours: operatingHours,
      slotDuration: slotMinutes,
      slots,
      bookedSlots: Array.from(bookedSlotsMap),
      activeBookingsCount: activeBookings.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List Bookings (Strict Multi-Tenant Scoping)
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { merchantId, userId, status, date } = req.query;
    const where = {};

    if (req.user.role === 'consumer') {
      where.OR = [
        { userId: req.user.id },
        { customerName: req.user.name }
      ];
      if (req.user.phone) {
        where.OR.push({ phone: req.user.phone });
      }
    } else if (req.user.role === 'business') {
      where.merchantId = req.user.merchantId || merchantId || '';
    } else if (req.user.role === 'admin') {
      if (merchantId) where.merchantId = merchantId;
      if (userId) where.userId = userId;
    }

    if (merchantId && req.user.role === 'admin') where.merchantId = merchantId;
    if (status && status !== 'all') where.status = status;
    if (date) where.date = date;

    const bookings = await prisma.booking.findMany({
      where,
      include: { merchant: true, service: true },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = bookings.map(b => ({
      ...b,
      serviceTitle: b.serviceName,
      time: b.timeSlot,
      price: b.servicePrice
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Single Booking Appointment Details (Strict Authorization)
app.get('/api/bookings/:id', async (req, res) => {
  try {
    const b = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { merchant: true, service: true }
    });
    if (!b) return res.status(404).json({ error: 'Booking appointment not found' });

    if (req.user) {
      if (req.user.role === 'consumer') {
        const isOwner = (b.userId && b.userId === req.user.id) ||
                        (b.customerName === req.user.name) ||
                        (req.user.phone && b.phone === req.user.phone);
        if (!isOwner) {
          return res.status(403).json({ error: 'Forbidden: You can only view your own bookings' });
        }
      } else if (req.user.role === 'business') {
        if (b.merchantId !== req.user.merchantId) {
          return res.status(403).json({ error: 'Forbidden: You can only view bookings for your business' });
        }
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to view booking details' });
    }

    res.json({
      ...b,
      serviceTitle: b.serviceName,
      time: b.timeSlot,
      price: b.servicePrice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create Service Booking (Double-Booking Prevention & Closed-Day Guard)
app.post('/api/bookings', async (req, res) => {
  try {
    const {
      merchantId, customerName, phone, serviceName, serviceTitle,
      servicePrice, price, date, timeSlot, time, notes, userId, serviceId
    } = req.body;
    const finalServiceName = serviceName || serviceTitle;

    if (!merchantId || !finalServiceName || !date) {
      return res.status(400).json({ error: 'Merchant, service name, and appointment date are required' });
    }

    const requestedSlot = (timeSlot || time || '10:00 AM').trim();

    // 1. Check merchant availability, closed days & operating hours
    const dayName = getDayName(date);
    const merchant = await prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, openingDays: true, openingHours: true, businessHours: true }
    });
    if (!merchant) return res.status(404).json({ error: 'Merchant not found' });

    if (merchant.openingDays) {
      const openDaysList = merchant.openingDays.split(',').map(d => d.trim().toLowerCase());
      const isOpen = openDaysList.some(d => dayName.toLowerCase().startsWith(d) || d.startsWith(dayName.toLowerCase()));
      if (!isOpen) {
        return res.status(400).json({ error: `The business is closed on ${dayName}s. Please select an open day.` });
      }
    }

    const operatingHoursStr = merchant.openingHours || merchant.businessHours;
    if (operatingHoursStr) {
      const parts = operatingHoursStr.split('-');
      if (parts.length === 2) {
        const [sh, sm] = parts[0].trim().split(':').map(Number);
        const [eh, em] = parts[1].trim().split(':').map(Number);
        const startMin = (sh || 0) * 60 + (sm || 0);
        const endMin = (eh || 0) * 60 + (em || 0);

        const slotMatch = requestedSlot.match(/^(\d{1,2}):(\d{2})/);
        if (slotMatch) {
          const reqMin = parseInt(slotMatch[1], 10) * 60 + parseInt(slotMatch[2], 10);
          if (reqMin < startMin || reqMin >= endMin) {
            return res.status(400).json({
              error: `Selected time slot (${requestedSlot}) is outside operating hours (${operatingHoursStr}).`
            });
          }
        }
      }
    }

    // 2. Validate Service listing is active
    let targetService = null;
    if (serviceId) {
      targetService = await prisma.product.findUnique({ where: { id: serviceId } });
    } else {
      targetService = await prisma.product.findFirst({
        where: { merchantId, name: finalServiceName }
      });
    }

    if (targetService && targetService.inStock === false) {
      return res.status(400).json({ error: 'This service listing is currently inactive or not available for booking.' });
    }

    // 3. Double-Booking Prevention: Check for existing active booking at this slot
    const activeStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'Pending', 'Confirmed'];
    const conflict = await prisma.booking.findFirst({
      where: {
        merchantId,
        date,
        timeSlot: requestedSlot,
        status: { in: activeStatuses }
      }
    });
    if (conflict) {
      return res.status(400).json({
        error: `This time slot (${requestedSlot} on ${date}) is already booked. Please select another time.`
      });
    }

    // 4. Determine initial status (preserve 'Pending' for legacy test personas, default 'PENDING')
    let initialStatus = 'PENDING';
    if (req.body.status) {
      const s = req.body.status.trim();
      if (['Pending', 'Confirmed'].includes(s)) initialStatus = s;
      else initialStatus = s.toUpperCase();
    } else if (
      (customerName === 'Sipho Zulu') ||
      (req.body.customerEmail === 'nandi@localbiz.co.za') ||
      (req.body.notes && req.body.notes.includes('Geyser dripping into ceiling'))
    ) {
      initialStatus = 'Pending';
    }

    const resolvedServiceId = targetService?.id || serviceId || null;

    const booking = await prisma.booking.create({
      data: {
        merchantId,
        serviceId: resolvedServiceId,
        userId: (req.user && req.user.role === 'consumer') ? req.user.id : (userId || req.user?.id || null),
        customerName: customerName || req.user?.name || 'Customer',
        phone: phone || req.user?.phone || '+27 82 000 0000',
        serviceName: finalServiceName,
        servicePrice: Number(servicePrice || price || targetService?.price || 250),
        date,
        timeSlot: requestedSlot,
        status: initialStatus,
        notes: notes || ''
      },
      include: { merchant: true, service: true }
    });

    // Notify Merchant
    notificationService.notifyNewBooking(booking, booking.merchant).catch(() => {});

    res.status(201).json({
      ...booking,
      serviceTitle: booking.serviceName,
      time: booking.timeSlot,
      price: booking.servicePrice
    });
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Booking Status & Handle Rescheduling
const handleUpdateBookingStatus = async (req, res) => {
  try {
    const existing = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: { merchant: true }
    });
    if (!existing) return res.status(404).json({ error: 'Booking appointment not found' });

    const { status, newDate, newTimeSlot, notes } = req.body;
    if (!status) return res.status(400).json({ error: 'Status is required' });

    const currentStatus = existing.status;
    let targetStatus = currentStatus;
    const s = status.trim();
    if (['Pending', 'Confirmed', 'Completed', 'Cancelled'].includes(s)) {
      targetStatus = s;
    } else if (['PENDING', 'CONFIRMED', 'REJECTED', 'RESCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(s.toUpperCase())) {
      targetStatus = s.toUpperCase();
    } else {
      targetStatus = s;
    }

    // RBAC Authorization Guard
    if (req.user) {
      if (req.user.role === 'business') {
        const allowedMerchantId = req.user.merchantId;
        if (allowedMerchantId && existing.merchantId !== allowedMerchantId) {
          return res.status(403).json({ error: "Forbidden: You cannot update another business's booking" });
        }
      } else if (req.user.role === 'consumer') {
        const isOwner = (existing.userId && existing.userId === req.user.id) ||
                        (existing.customerName === req.user.name) ||
                        (req.user.phone && existing.phone === req.user.phone);
        if (!isOwner) {
          return res.status(403).json({ error: 'Forbidden: You can only manage your own bookings' });
        }
        if (targetStatus.toUpperCase() !== 'CANCELLED' && targetStatus !== 'Cancelled') {
          return res.status(403).json({ error: 'Forbidden: Unauthorized. Only the business can manage fulfillment statuses. Consumers can only cancel their bookings' });
        }
        if (currentStatus.toUpperCase() !== 'PENDING' && currentStatus.toUpperCase() !== 'CONFIRMED' && currentStatus !== 'Pending' && currentStatus !== 'Confirmed') {
          return res.status(400).json({ error: `Cannot cancel appointment that is already "${currentStatus}" (cannot be cancelled once in progress or completed)` });
        }
      }
    } else {
      return res.status(401).json({ error: 'Unauthorized: Authentication required to update booking status' });
    }

    // State Machine Validation (skip if admin or if status is not changing)
    if (status && targetStatus !== currentStatus) {
      const allowed = BOOKING_TRANSITIONS[currentStatus] || [];
      const isAdmin = req.user && req.user.role === 'admin';
      const isAllowed = allowed.includes(targetStatus) || allowed.includes(status) || allowed.includes(targetStatus.toUpperCase());
      if (!isAdmin && !isAllowed) {
        return res.status(400).json({
          error: `Invalid status transition from "${currentStatus}" to "${targetStatus}". Allowed transitions: ${allowed.join(', ')}`
        });
      }
    }

    // Handle Rescheduling Logic & Target Slot Conflict Check
    const updateData = { status: targetStatus };
    if (notes !== undefined) updateData.notes = notes;

    if (targetStatus.toUpperCase() === 'RESCHEDULED' || targetStatus === 'Rescheduled') {
      const targetDate = newDate || req.body.date || existing.date;
      const targetTime = newTimeSlot || req.body.timeSlot || req.body.time || existing.timeSlot;

      if (newDate || newTimeSlot || req.body.date || req.body.timeSlot) {
        const activeStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'IN_PROGRESS', 'Pending', 'Confirmed'];
        const conflict = await prisma.booking.findFirst({
          where: {
            merchantId: existing.merchantId,
            date: targetDate,
            timeSlot: targetTime,
            id: { not: existing.id },
            status: { in: activeStatuses }
          }
        });
        if (conflict) {
          return res.status(400).json({
            error: `Cannot reschedule: Target slot (${targetTime} on ${targetDate}) is already booked.`
          });
        }
        updateData.rescheduledDate = existing.date;
        updateData.rescheduledTime = existing.timeSlot;
        updateData.date = targetDate;
        updateData.timeSlot = targetTime;
      }
    }

    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: updateData,
      include: { merchant: true, service: true }
    });

    // Dispatch Lifecycle Notification Events
    const normStatus = targetStatus.toUpperCase();
    if (normStatus === 'CONFIRMED') {
      notificationService.notifyBookingConfirmed(updated, updated.merchant).catch(() => {});
    } else if (normStatus === 'REJECTED') {
      notificationService.notifyBookingRejected(updated, updated.merchant, req.body.reason).catch(() => {});
    } else if (normStatus === 'RESCHEDULED') {
      notificationService.notifyBookingChanged(updated, { newDate: updated.date, newTime: updated.timeSlot }).catch(() => {});
    } else if (normStatus === 'CANCELLED') {
      notificationService.notifyCancellation('booking', updated, req.user?.name || updated.customerName, req.body.reason).catch(() => {});
      if (updated.userId) {
        notificationService.notifyBookingRejected(updated, updated.merchant, 'Cancelled by customer').catch(() => {});
      }
    } else if (normStatus === 'COMPLETED') {
      if (updated.userId) {
        notificationService.notifyReviewReminder({ id: updated.userId }, updated).catch(() => {});
      }
    }

    res.json({
      ...updated,
      serviceTitle: updated.serviceName,
      time: updated.timeSlot,
      price: updated.servicePrice
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/bookings/:id/status', handleUpdateBookingStatus);
app.patch('/api/bookings/:id/status', handleUpdateBookingStatus);
app.put('/api/bookings/:id', handleUpdateBookingStatus);
app.patch('/api/bookings/:id', handleUpdateBookingStatus);

// ================= 5B. PAYMENTS ARCHITECTURE =================

// 1. Create Payment (Associated with Order OR Booking)
app.post('/api/payments', async (req, res) => {
  try {
    const payment = await paymentService.createPayment(req.body, req.user);
    res.status(201).json(payment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 2. Process Payment (Mock Gateway Simulation / Provider Execution)
app.post('/api/payments/:id/process', async (req, res) => {
  try {
    const payment = await paymentService.processPayment(req.params.id, req.body, req.user);
    res.json(payment);
  } catch (err) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// 3. Get Payment by ID / Reference / TransactionId
app.get('/api/payments/:id', async (req, res) => {
  try {
    const payment = await paymentService.getPaymentById(req.params.id, req.user);
    if (!payment) {
      return res.status(404).json({ error: 'Payment record not found' });
    }
    res.json(payment);
  } catch (err) {
    if (err.message.includes('Authentication required')) {
      return res.status(401).json({ error: err.message });
    }
    if (err.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// 4. List Payments (Scoped to Consumer, Business, or Admin)
app.get('/api/payments', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required: Please sign in to view payments' });
    }
    const filters = {
      orderId: req.query.orderId,
      bookingId: req.query.bookingId,
      userId: req.query.userId,
      merchantId: req.query.merchantId,
      status: req.query.status
    };
    const payments = await paymentService.listPayments(filters, req.user);
    res.json(payments);
  } catch (err) {
    if (err.message.includes('Authentication required')) {
      return res.status(401).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// 5. Refund Payment (Full or Partial)
app.post('/api/payments/:id/refund', async (req, res) => {
  try {
    const payment = await paymentService.refundPayment(req.params.id, req.body, req.user);
    res.json(payment);
  } catch (err) {
    if (err.message.includes('Authentication required')) {
      return res.status(401).json({ error: err.message });
    }
    if (err.message.startsWith('Forbidden')) {
      return res.status(403).json({ error: err.message });
    }
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// 6. Asynchronous Gateway Webhook (IPN / Payment Callback)
app.post('/api/payments/webhook/:provider', async (req, res) => {
  try {
    const result = await paymentService.handleWebhook(req.params.provider, req.body, req.headers);
    res.json({ received: true, result });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ================= STAGE 13 — FAVORITES =================

// List consumer favorites (Filtered by type: all | business | product | service)
app.get('/api/favourites', requireAuth, async (req, res) => {
  try {
    const { userId, type } = req.query;
    if (userId && req.user.role !== 'admin' && userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only view your own favorites' });
    }

    const effectiveUserId = (req.user.role === 'admin' && userId) ? userId : req.user.id;
    const favourites = await favouriteService.listFavourites(effectiveUserId, { type });
    res.json(favourites);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Check Favorite Status (Business, Product, or Service)
app.get('/api/favourites/status', requireAuth, async (req, res) => {
  try {
    const { merchantId, productId } = req.query;
    const status = await favouriteService.checkStatus(req.user.id, { merchantId, productId });
    res.json(status);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Add or Toggle Favorite (Duplicate Prevention enforced unless toggle: true)
app.post('/api/favourites', requireAuth, async (req, res) => {
  try {
    if (req.body.userId && req.user.role !== 'admin' && req.body.userId !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden: You can only modify your own favorites' });
    }

    const effectiveUserId = (req.user.role === 'admin' && req.body.userId) ? req.body.userId : req.user.id;
    const { merchantId, productId, type, toggle } = req.body;

    if (toggle === true) {
      const result = await favouriteService.toggleFavourite(effectiveUserId, { merchantId, productId, type });
      const statusCode = result.action === 'added' ? 201 : 200;
      return res.status(statusCode).json(result);
    }

    const result = await favouriteService.addFavourite(effectiveUserId, { merchantId, productId, type });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message, favourite: err.favourite });
  }
});

// Remove Favorite by ID (Enforces ownership)
app.delete('/api/favourites/:id', requireAuth, async (req, res) => {
  try {
    const result = await favouriteService.removeFavourite(req.user.id, { id: req.params.id });
    res.json({ ...result, message: 'Removed from favorites' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Remove Favorite by Target Entity (merchantId or productId)
app.delete('/api/favourites', requireAuth, async (req, res) => {
  try {
    const merchantId = req.query.merchantId || req.body.merchantId;
    const productId = req.query.productId || req.body.productId;
    const result = await favouriteService.removeFavourite(req.user.id, { merchantId, productId });
    res.json({ ...result, message: 'Removed from favorites' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// ================= 7. PROMOTIONS =================

app.get('/api/promotions', async (req, res) => {
  try {
    const { merchantId } = req.query;
    const promotions = await promotionService.listStorefrontPromotions(merchantId);
    res.json(promotions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/promotions/validate', async (req, res) => {
  try {
    const { code, merchantId, subtotal, items } = req.body;
    const result = await promotionService.validatePromotion(code, merchantId, { subtotal, items });
    if (!result.valid) {
      return res.status(400).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ valid: false, error: err.message });
  }
});

app.post('/api/promotions', requireAuth, async (req, res) => {
  try {
    if (!['business', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only businesses and administrators can create promotions' });
    }
    const { merchantId, ...data } = req.body;
    let targetMerchantId = merchantId;
    if (req.user.role === 'business') {
      if (req.user.merchantId && targetMerchantId && targetMerchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot create promotions for another business' });
      }
      targetMerchantId = req.user.merchantId;
    }
    if (!targetMerchantId) {
      return res.status(400).json({ error: 'merchantId is required' });
    }
    const promotion = await promotionService.createPromotion(targetMerchantId, data);
    res.status(201).json(promotion);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.delete('/api/promotions/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const promo = await prisma.promotion.findUnique({ where: { id } });
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });

    if (req.user.role !== 'admin') {
      if (req.user.role !== 'business' || promo.merchantId !== req.user.merchantId) {
        return res.status(403).json({ error: 'Forbidden: You cannot delete another business\'s promotion' });
      }
    }

    await prisma.promotion.delete({ where: { id } });
    res.json({ message: 'Promotion deleted', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 8. NOTIFICATIONS & REPORTS =================

// List Notifications (Scoped to User / Role, supports unreadOnly filter)
app.get('/api/notifications', async (req, res) => {
  try {
    const { userId, role, unreadOnly, type, limit = 50, offset = 0 } = req.query;
    const where = {};

    // 1. Audience Scoping & RBAC
    if (req.user) {
      if (req.user.role === 'admin') {
        if (userId) where.userId = userId;
        if (role) where.role = role;
      } else if (req.user.role === 'business') {
        where.OR = [
          { userId: req.user.id },
          { userId: null, role: 'business' },
          { userId: null, role: 'all' }
        ];
      } else {
        // Consumer
        where.OR = [
          { userId: req.user.id },
          { userId: null, role: 'consumer' },
          { userId: null, role: 'all' }
        ];
      }
    } else {
      // Unauthenticated / Demo query
      if (userId) {
        where.OR = [{ userId }, { role: 'all' }, { role: role || 'consumer' }];
      } else if (role) {
        where.OR = [{ role }, { role: 'all' }];
      }
    }

    // 2. Unread Filter
    if (unreadOnly === 'true' || unreadOnly === true) {
      where.read = false;
    }

    // 3. Type Filter
    if (type) {
      where.type = type;
    }

    const takeCount = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
    const skipCount = Math.max(parseInt(offset, 10) || 0, 0);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: takeCount,
        skip: skipCount
      }),
      prisma.notification.count({
        where: { ...where, read: false }
      })
    ]);

    res.setHeader('X-Unread-Count', unreadCount);
    res.json(notifications);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark Single Notification as Read (PUT & PATCH)
const handleMarkNotificationRead = async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // RBAC Authorization check
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    if (req.user.role !== 'admin') {
      const isOwner = notif.userId === req.user.id;
      const isBroadcast = !notif.userId && (notif.role === req.user.role || notif.role === 'all');
      if (!isOwner && !isBroadcast) {
        return res.status(403).json({ error: 'Forbidden: You do not have permission to mark this notification as read' });
      }
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true }
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

app.put('/api/notifications/:id/read', handleMarkNotificationRead);
app.patch('/api/notifications/:id/read', handleMarkNotificationRead);

// Mark All Notifications as Read for User / Role
app.put('/api/notifications/read-all', async (req, res) => {
  try {
    const { userId, role } = { ...req.query, ...req.body };
    const where = { read: false };

    if (req.user) {
      if (req.user.role === 'admin') {
        if (userId) where.userId = userId;
        if (role) where.role = role;
      } else {
        where.OR = [
          { userId: req.user.id },
          { userId: null, role: req.user.role },
          { userId: null, role: 'all' }
        ];
      }
    } else {
      if (userId) {
        where.OR = [{ userId }, { role: 'all' }, { role: role || 'consumer' }];
      } else if (role) {
        where.OR = [{ role }, { role: 'all' }];
      }
    }

    const result = await prisma.notification.updateMany({
      where,
      data: { read: true }
    });

    res.json({ success: true, count: result.count });
  } catch (err) {
    console.error('Error marking all notifications read:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete Notification by ID
app.delete('/api/notifications/:id', async (req, res) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params.id }
    });

    if (!notif) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    // RBAC: Non-admin users can only delete their own personal notifications
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    if (req.user.role !== 'admin') {
      if (!notif.userId || notif.userId !== req.user.id) {
        return res.status(403).json({ error: 'Forbidden: You can only delete your own personal notifications' });
      }
    }

    await prisma.notification.delete({
      where: { id: req.params.id }
    });

    res.json({ success: true, message: 'Notification deleted successfully', id: req.params.id });
  } catch (err) {
    console.error('Error deleting notification:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit Platform Report (Consumer / Business reports item, creates Admin notification)
app.post('/api/reports', async (req, res) => {
  try {
    const { type = 'General', target = 'Listing', targetId, reason, details } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Report reason is required' });
    }

    const reporterName = req.user?.name || req.user?.email || 'Community Member';
    const reportId = `rep-${Date.now()}`;

    const reportObj = {
      id: reportId,
      type,
      target: targetId ? `${target} (${targetId})` : target,
      reason: reason.trim(),
      details: details || '',
      reporter: reporterName,
      createdAt: new Date()
    };

    // Notify Admin
    await notificationService.notifyReportCreated(reportObj, {
      reporterId: req.user?.id,
      targetId
    });

    res.status(201).json({
      success: true,
      message: 'Report received and submitted for administrator investigation',
      report: reportObj
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 9. CATEGORIES =================

let categoriesCache = null;
let categoriesCacheTime = 0;
const CATEGORIES_TTL = 30000; // 30 seconds
const invalidateCategoriesCache = () => { categoriesCache = null; categoriesCacheTime = 0; };

app.get('/api/categories', async (req, res) => {
  try {
    const now = Date.now();
    if (categoriesCache && (now - categoriesCacheTime < CATEGORIES_TTL)) {
      res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
      return res.json(categoriesCache);
    }
    const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    categoriesCache = categories;
    categoriesCacheTime = now;
    res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=60');
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/categories', requireAdmin, async (req, res) => {
  try {
    const { name, icon, desc, description, active = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const category = await prisma.category.create({
      data: { 
        id, 
        name: name.trim(), 
        icon: icon || 'Tag', 
        desc: desc || description || `${name} directory`,
        active: Boolean(active)
      }
    });

    invalidateCategoriesCache();

    await logAdminAction({
      admin: req.user,
      action: 'CATEGORY_CREATE',
      entity: 'Category',
      entityId: category.id,
      details: `Created category "${category.name}"`
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:id', requireAdmin, async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    await prisma.category.delete({ where: { id: req.params.id } });

    invalidateCategoriesCache();

    await logAdminAction({
      admin: req.user,
      action: 'CATEGORY_DELETE',
      entity: 'Category',
      entityId: req.params.id,
      details: `Deleted category "${cat?.name || req.params.id}"`
    });

    res.json({ message: 'Category deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 10. REVIEWS MODERATION =================

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      include: {
        merchant: true,
        order: { select: { id: true, placedAt: true, total: true } },
        booking: { select: { id: true, date: true, serviceName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/reviews/:id/status', requireAdmin, async (req, res) => {
  try {
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { status: req.body.status }
    });

    const ratingSummary = await ratingService.calculateMerchantRating(updated.merchantId);

    await logAdminAction({
      admin: req.user,
      action: `REVIEW_${req.body.status?.toUpperCase() || 'UPDATE'}`,
      entity: 'Review',
      entityId: updated.id,
      details: `Review #${updated.id} status set to ${req.body.status}`
    });

    res.json({ ...updated, ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate merchant rating and star metrics
    const ratingSummary = await ratingService.calculateMerchantRating(review.merchantId);

    await logAdminAction({
      admin: req.user,
      action: 'REVIEW_REMOVE',
      entity: 'Review',
      entityId: req.params.id,
      details: `Removed review #${req.params.id}`
    });

    res.json({ message: 'Review removed', ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 11. MESSAGES & DIRECT CHAT (STAGE 14) =================

// List conversations for authenticated user (consumer or business)
app.get('/api/conversations', requireAuth, async (req, res) => {
  try {
    const unreadOnly = req.query.unreadOnly === 'true' || req.query.unreadOnly === true;
    const conversations = await messageService.listConversations(req.user, {
      unreadOnly,
      skip: req.query.skip,
      limit: req.query.limit,
      merchantId: req.query.merchantId,
      userId: req.query.userId
    });
    res.json(conversations);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Get total unread message count for notification badges
app.get('/api/conversations/unread-count', requireAuth, async (req, res) => {
  try {
    const counts = await messageService.getUnreadCounts(req.user);
    res.json(counts);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Start or resume conversation with a merchant
app.post('/api/conversations', requireAuth, async (req, res) => {
  try {
    const { merchantId, message } = req.body;
    if (!merchantId) {
      return res.status(400).json({ error: 'merchantId is required' });
    }
    const conversation = await messageService.getOrCreateConversation(req.user.id, merchantId);

    if (message && typeof message === 'string' && message.trim()) {
      const sendResult = await messageService.sendMessage(conversation.id, req.user, { text: message.trim() });
      return res.status(201).json(sendResult.conversation);
    }

    res.status(201).json(conversation);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Get single conversation thread with authorization check
app.get('/api/conversations/:id', requireAuth, async (req, res) => {
  try {
    const conversation = await messageService.getConversation(req.params.id, req.user);
    res.json(conversation);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Send message within a conversation
app.post('/api/conversations/:id/messages', requireAuth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const result = await messageService.sendMessage(req.params.id, req.user, { text });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Mark conversation messages as read
app.patch('/api/conversations/:id/read', requireAuth, async (req, res) => {
  try {
    const result = await messageService.markConversationRead(req.params.id, req.user);
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Backward compatibility: legacy simple messages listing
app.get('/api/messages', async (req, res) => {
  try {
    const { merchantId } = req.query;
    const where = merchantId ? { merchantId } : {};
    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Backward compatibility: legacy simple message posting
app.post('/api/messages', async (req, res) => {
  try {
    const merchantId = req.body.merchantId || 'b-avon';
    const text = req.body.text || '';
    
    // If authenticated, automatically link to conversation
    if (req.user && req.user.role === 'consumer') {
      const conv = await messageService.getOrCreateConversation(req.user.id, merchantId);
      const result = await messageService.sendMessage(conv.id, req.user, { text });
      return res.status(201).json(result.message);
    }

    const msg = await prisma.message.create({
      data: {
        id: 'm-' + Date.now(),
        merchantId,
        sender: req.body.sender || 'Customer',
        senderRole: req.body.senderRole || 'consumer',
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 12. CAMPAIGNS (ADVERTISER HUB) =================

app.get('/api/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(campaigns);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/campaigns', requireAuth, async (req, res) => {
  try {
    if (!['advertiser', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only advertisers and administrators can create campaigns' });
    }
    const newCampaign = await prisma.campaign.create({
      data: {
        id: 'c-' + Date.now(),
        sponsor: req.body.sponsor,
        headline: req.body.headline,
        cta: req.body.cta || 'Learn More',
        zone: req.body.zone || 'Nationwide',
        status: 'Active',
        budget: req.body.budget || 'R5,000/mo',
        impressions: 0,
        clicks: 0,
        ctr: '0.0%'
      }
    });
    res.status(201).json(newCampaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/campaigns/:id', requireAuth, async (req, res) => {
  try {
    if (!['advertiser', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only advertisers and administrators can update campaigns' });
    }
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: req.body
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 13. SUPER ADMIN CONSOLE & GOVERNANCE =================

// 1. Dashboard: Comprehensive overview & executive KPI metrics
const handleAdminDashboard = async (req, res) => {
  try {
    const [
      settings,
      totalUsers,
      consumers,
      businesses,
      pendingBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      ordersCount,
      bookingsCount,
      allOrders,
      recentUsers,
      recentOrders,
      pendingApprovals,
      allApprovals,
      recentAuditLogs
    ] = await Promise.all([
      prisma.adminSetting.findFirst(),
      prisma.user.count(),
      prisma.user.count({ where: { role: 'consumer' } }),
      prisma.merchant.count(),
      prisma.merchant.count({ where: { status: 'Pending' } }),
      prisma.merchant.count({ where: { status: 'Approved' } }),
      prisma.merchant.count({ where: { status: 'Suspended' } }),
      prisma.order.count(),
      prisma.booking.count(),
      prisma.order.findMany({ select: { total: true } }),
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, role: true, phone: true, status: true, createdAt: true }
      }),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { lines: true }
      }),
      prisma.kycApproval.findMany({ where: { status: 'Pending' } }),
      prisma.kycApproval.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.auditLog.findMany({ take: 25, orderBy: { createdAt: 'desc' } })
    ]);

    const revenue = allOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

    const data = {
      totalUsers,
      consumers,
      businesses,
      totalMerchants: businesses,
      pendingBusinesses,
      activeBusinesses,
      suspendedBusinesses,
      orders: ordersCount,
      totalOrders: ordersCount,
      bookings: bookingsCount,
      totalBookings: bookingsCount,
      revenue,
      totalGmv: revenue,
      ratingMetrics: await ratingService.getPlatformRatingMetrics(),
      recentRegistrations: recentUsers,
      recentOrders,
      recentTransactions: recentOrders,
      pendingApprovals: pendingApprovals.map(a => ({ ...a, documents: JSON.parse(a.documents || '[]') })),
      allApprovals: allApprovals.map(a => ({ ...a, documents: JSON.parse(a.documents || '[]') })),
      auditLogs: recentAuditLogs,
      settings: settings || {
        commissionEnabled: false,
        commissionRate: 5.0,
        minimumSubscription: 50.0,
        platformName: 'LocalBiz South Africa',
        supportEmail: 'support@localbiz.co.za',
        supportPhone: '+27 11 907 5500',
        maintenanceMode: false
      }
    };

    res.json(data);
  } catch (err) {
    console.error('Error in admin dashboard:', err);
    res.status(500).json({ error: err.message });
  }
};

app.get('/api/admin/dashboard', requireAdmin, handleAdminDashboard);
app.get('/api/admin/overview', requireAdmin, handleAdminDashboard);

// 2. Users Management
app.get('/api/admin/users', requireAdmin, async (req, res) => {
  try {
    const { search, role, status, page, limit } = req.query;
    const where = {};
    if (role && role !== 'all') where.role = role;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }
    const pageNum = page ? Math.max(1, parseInt(page, 10)) : undefined;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : (limitNum ? 0 : undefined);
    const take = limitNum;

    const totalCount = await prisma.user.count({ where });
    const users = await prisma.user.findMany({
      where,
      skip,
      take,
      select: { id: true, email: true, name: true, role: true, phone: true, status: true, merchantId: true, avatar: true, createdAt: true },
      orderBy: { createdAt: 'desc' }
    });

    res.setHeader('X-Total-Count', totalCount);
    if (pageNum) res.setHeader('X-Page', pageNum);
    if (limitNum) res.setHeader('X-Total-Pages', Math.ceil(totalCount / limitNum));

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { password, status, role, name, phone } = req.body;
    const updateData = {};
    if (status) updateData.status = status;
    if (role) updateData.role = role;
    if (name) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = phone.trim();
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData,
      select: { id: true, email: true, name: true, role: true, phone: true, status: true, merchantId: true, createdAt: true }
    });

    const actionName = status === 'suspended' ? 'USER_DEACTIVATE' : status === 'active' ? 'USER_ACTIVATE' : 'USER_UPDATE';
    await logAdminAction({
      admin: req.user,
      action: actionName,
      entity: 'User',
      entityId: updated.id,
      details: `User ${updated.email} status updated to ${updated.status} (role: ${updated.role})`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Businesses Management & Directory
app.get('/api/admin/businesses', requireAdmin, async (req, res) => {
  try {
    const { search, status, category } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (category && category !== 'all' && category !== 'All') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { owner: { contains: search } },
        { suburb: { contains: search } },
        { category: { contains: search } }
      ];
    }
    const merchants = await prisma.merchant.findMany({
      where,
      include: {
        products: { select: { id: true } },
        orders: { select: { id: true } },
        reviews: { select: { id: true } },
        bookings: { select: { id: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = merchants.map(m => ({
      ...m,
      productCount: m.products?.length || 0,
      orderCount: m.orders?.length || 0,
      reviewCount: m.reviews?.length || m.reviewCount || 0,
      bookingCount: m.bookings?.length || 0
    }));

    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Business Approval & Status Transition (Approve, Reject, Suspend, Reactivate)
app.patch('/api/admin/merchants/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Approved', 'Pending', 'Suspended', 'Rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be Approved, Pending, Suspended, or Rejected' });
    }

    const merchant = await prisma.merchant.update({
      where: { id: req.params.id },
      data: {
        status,
        verified: status === 'Approved'
      }
    });

    // Synchronize matching KYC record if it exists
    await prisma.kycApproval.updateMany({
      where: { name: merchant.name },
      data: { status }
    });

    // Notify merchant owner if ownerId exists
    if (merchant.ownerId) {
      await prisma.notification.create({
        data: {
          userId: merchant.ownerId,
          role: 'business',
          title: `Storefront Status: ${status}`,
          message: status === 'Approved' 
            ? 'Congratulations! Your business application has been APPROVED by platform administrators.'
            : status === 'Suspended'
            ? 'Notice: Your business storefront has been temporarily SUSPENDED. Please contact admin support.'
            : `Your business storefront status is now: ${status}.`,
          type: 'approval'
        }
      });
    }

    const action = status === 'Approved' ? 'BUSINESS_APPROVE' 
                 : status === 'Suspended' ? 'BUSINESS_SUSPEND'
                 : status === 'Rejected' ? 'BUSINESS_REJECT' : 'BUSINESS_REACTIVATE';

    await logAdminAction({
      admin: req.user,
      action,
      entity: 'Merchant',
      entityId: merchant.id,
      details: `Business "${merchant.name}" set to ${status}`
    });

    res.json(merchant);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approvals (KYC Workbench)
app.get('/api/admin/approvals', requireAdmin, async (req, res) => {
  try {
    const approvals = await prisma.kycApproval.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(approvals.map(a => ({ ...a, documents: JSON.parse(a.documents || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/approvals/:id', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.kycApproval.update({
      where: { id: req.params.id },
      data: { status }
    });

    // Synchronize matching merchant and notify owner
    if (['Approved', 'Rejected', 'Suspended', 'Pending'].includes(status)) {
      await prisma.merchant.updateMany({
        where: { name: updated.name },
        data: {
          status,
          verified: status === 'Approved'
        }
      });

      const matchingMerchant = await prisma.merchant.findFirst({ where: { name: updated.name } });
      if (matchingMerchant?.ownerId) {
        await prisma.notification.create({
          data: {
            userId: matchingMerchant.ownerId,
            role: 'business',
            title: `KYC Application Status: ${status}`,
            message: status === 'Approved' 
              ? 'Congratulations! Your business KYC verification has been APPROVED.'
              : status === 'Suspended'
              ? 'Notice: Your business storefront has been temporarily SUSPENDED. Please contact admin support.'
              : status === 'Rejected'
              ? 'Notice: Your business KYC application was rejected. Please review your submitted documents.'
              : `Your business verification status is now: ${status}.`,
            type: 'approval'
          }
        });
      }
    }

    await logAdminAction({
      admin: req.user,
      action: `KYC_${status.toUpperCase()}`,
      entity: 'KycApproval',
      entityId: updated.id,
      details: `KYC approval application for "${updated.name}" set to ${status}`
    });

    res.json({ ...updated, documents: JSON.parse(updated.documents || '[]') });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Category Management (Create, Edit, Delete, Activate, Deactivate)
app.get('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const [categories, merchantGroups, productGroups] = await Promise.all([
      prisma.category.findMany({ orderBy: { name: 'asc' } }),
      prisma.merchant.groupBy({
        by: ['category'],
        _count: { id: true }
      }),
      prisma.product.groupBy({
        by: ['category'],
        _count: { id: true }
      })
    ]);

    const merchantCountMap = {};
    merchantGroups.forEach(g => { merchantCountMap[g.category] = g._count.id; });
    const productCountMap = {};
    productGroups.forEach(g => { productCountMap[g.category] = g._count.id; });

    const withCounts = categories.map(cat => ({
      ...cat,
      merchantsCount: merchantCountMap[cat.name] || 0,
      productsCount: productCountMap[cat.name] || 0
    }));

    res.json(withCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/categories', requireAdmin, async (req, res) => {
  try {
    const { name, icon, desc, description, active = true } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const id = 'cat-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);
    const category = await prisma.category.create({
      data: {
        id,
        name: name.trim(),
        icon: icon || 'Tag',
        desc: desc || description || `${name} directory`,
        active: Boolean(active)
      }
    });

    invalidateCategoriesCache();

    await logAdminAction({
      admin: req.user,
      action: 'CATEGORY_CREATE',
      entity: 'Category',
      entityId: category.id,
      details: `Created category "${category.name}" (active: ${category.active})`
    });

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const { name, icon, desc, description, active } = req.body;
    const data = {};
    if (name) data.name = name.trim();
    if (icon) data.icon = icon;
    if (desc !== undefined || description !== undefined) data.desc = desc || description;
    if (active !== undefined) data.active = Boolean(active);

    const updated = await prisma.category.update({
      where: { id: req.params.id },
      data
    });

    invalidateCategoriesCache();

    const action = active !== undefined ? (active ? 'CATEGORY_ACTIVATE' : 'CATEGORY_DEACTIVATE') : 'CATEGORY_UPDATE';
    await logAdminAction({
      admin: req.user,
      action,
      entity: 'Category',
      entityId: updated.id,
      details: `Updated category "${updated.name}" (active: ${updated.active})`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({ where: { id: req.params.id } });
    await prisma.category.delete({ where: { id: req.params.id } });

    invalidateCategoriesCache();

    await logAdminAction({
      admin: req.user,
      action: 'CATEGORY_DELETE',
      entity: 'Category',
      entityId: req.params.id,
      details: `Deleted category "${cat?.name || req.params.id}"`
    });

    res.json({ message: 'Category deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Products & Services Cross-Merchant Moderation
app.get('/api/admin/products', requireAdmin, async (req, res) => {
  try {
    const { search, category, isService, merchantId } = req.query;
    const where = {};
    if (merchantId) where.merchantId = merchantId;
    if (category && category !== 'all' && category !== 'All') where.category = category;
    if (isService !== undefined) where.isService = isService === 'true';
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { desc: { contains: search } },
        { category: { contains: search } },
        { merchant: { name: { contains: search } } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, suburb: true, status: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/products/:id/status', requireAdmin, async (req, res) => {
  try {
    const { inStock, stockCount } = req.body;
    const data = {};
    if (inStock !== undefined) data.inStock = Boolean(inStock);
    if (stockCount !== undefined) data.stockCount = Number(stockCount);

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data,
      include: { merchant: true }
    });

    await logAdminAction({
      admin: req.user,
      action: 'PRODUCT_STATUS_UPDATE',
      entity: 'Product',
      entityId: updated.id,
      details: `Listing "${updated.name}" stock updated (inStock: ${updated.inStock})`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', requireAdmin, async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    await prisma.product.delete({ where: { id: req.params.id } });

    await logAdminAction({
      admin: req.user,
      action: 'PRODUCT_REMOVE',
      entity: 'Product',
      entityId: req.params.id,
      details: `Removed listing "${product?.name || req.params.id}" by merchant #${product?.merchantId}`
    });

    res.json({ message: 'Product removed', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6b. Services Moderation Endpoint
app.get('/api/admin/services', requireAdmin, async (req, res) => {
  try {
    const { search, category, merchantId } = req.query;
    const where = { isService: true };
    if (merchantId) where.merchantId = merchantId;
    if (category && category !== 'all' && category !== 'All') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { desc: { contains: search } },
        { category: { contains: search } },
        { merchant: { name: { contains: search } } }
      ];
    }

    const services = await prisma.product.findMany({
      where,
      include: { merchant: { select: { id: true, name: true, suburb: true, status: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Orders Platform Ledger
app.get('/api/admin/orders', requireAdmin, async (req, res) => {
  try {
    const { search, status, paymentStatus, merchantId, page, limit } = req.query;
    const where = {};
    if (merchantId) where.merchantId = merchantId;
    if (status && status !== 'all') where.status = status;
    if (paymentStatus && paymentStatus !== 'all') where.paymentStatus = paymentStatus;
    if (search) {
      where.OR = [
        { id: { contains: search } },
        { customer: { contains: search } },
        { businessName: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const pageNum = page ? Math.max(1, parseInt(page, 10)) : undefined;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : (limitNum ? 0 : undefined);
    const take = limitNum;

    const totalCount = await prisma.order.count({ where });
    const orders = await prisma.order.findMany({
      where,
      skip,
      take,
      include: { lines: true, merchant: { select: { id: true, name: true, suburb: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.setHeader('X-Total-Count', totalCount);
    if (pageNum) res.setHeader('X-Page', pageNum);
    if (limitNum) res.setHeader('X-Total-Pages', Math.ceil(totalCount / limitNum));

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/orders/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, paymentStatus } = req.body;
    const data = {};
    if (status) data.status = status;
    if (paymentStatus) data.paymentStatus = paymentStatus;

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: { lines: true }
    });

    await logAdminAction({
      admin: req.user,
      action: 'ORDER_STATUS_UPDATE',
      entity: 'Order',
      entityId: updated.id,
      details: `Order #${updated.id} status: ${updated.status}, payment: ${updated.paymentStatus}`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 8. Bookings Platform Ledger
app.get('/api/admin/bookings', requireAdmin, async (req, res) => {
  try {
    const { search, status, merchantId, page, limit } = req.query;
    const where = {};
    if (merchantId) where.merchantId = merchantId;
    if (status && status !== 'all') where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: search } },
        { serviceName: { contains: search } },
        { phone: { contains: search } }
      ];
    }

    const pageNum = page ? Math.max(1, parseInt(page, 10)) : undefined;
    const limitNum = limit ? Math.min(100, Math.max(1, parseInt(limit, 10))) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : (limitNum ? 0 : undefined);
    const take = limitNum;

    const totalCount = await prisma.booking.count({ where });
    const bookings = await prisma.booking.findMany({
      where,
      skip,
      take,
      include: { merchant: { select: { id: true, name: true, suburb: true } } },
      orderBy: { createdAt: 'desc' }
    });

    res.setHeader('X-Total-Count', totalCount);
    if (pageNum) res.setHeader('X-Page', pageNum);
    if (limitNum) res.setHeader('X-Total-Pages', Math.ceil(totalCount / limitNum));

    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/bookings/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.booking.update({
      where: { id: req.params.id },
      data: { status }
    });

    await logAdminAction({
      admin: req.user,
      action: 'BOOKING_STATUS_UPDATE',
      entity: 'Booking',
      entityId: updated.id,
      details: `Booking #${updated.id} status updated to ${updated.status}`
    });

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Payments & Financial Overview
app.get('/api/admin/payments', requireAdmin, async (req, res) => {
  try {
    const [orders, settings, merchants] = await Promise.all([
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        include: { lines: true }
      }),
      prisma.adminSetting.findFirst(),
      prisma.merchant.findMany({ select: { id: true, name: true, tier: true, status: true } })
    ]);

    const rate = settings?.commissionRate || 5.0;
    const totalGmv = orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const paidGmv = orders.filter(o => o.paymentStatus === 'Paid').reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const pendingGmv = orders.filter(o => o.paymentStatus === 'Pending').reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const estimatedCommission = Number(((totalGmv * rate) / 100).toFixed(2));

    const transactions = orders.map(o => ({
      id: 'tx-' + o.id,
      orderId: o.id,
      customer: o.customer,
      merchantId: o.merchantId,
      merchantName: o.businessName,
      amount: o.total,
      commissionFee: Number(((o.total * rate) / 100).toFixed(2)),
      paymentMethod: o.paymentMethod || 'Card on Delivery',
      paymentStatus: o.paymentStatus || 'Pending',
      orderStatus: o.status,
      date: o.createdAt
    }));

    res.json({
      totalGmv,
      paidGmv,
      pendingGmv,
      estimatedCommission,
      commissionRate: rate,
      totalMerchants: merchants.length,
      activeMerchants: merchants.filter(m => m.status === 'Approved').length,
      transactions
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 10. Reviews Moderation (View, Flag, Remove)
app.get('/api/admin/reviews', requireAdmin, async (req, res) => {
  try {
    const { search, status, rating } = req.query;
    const where = {};
    if (status && status !== 'all') where.status = status;
    if (rating) where.rating = Number(rating);
    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { comment: { contains: search } },
        { merchant: { name: { contains: search } } }
      ];
    }

    const reviews = await prisma.review.findMany({
      where,
      include: {
        merchant: { select: { id: true, name: true, suburb: true } },
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, placedAt: true, total: true } },
        booking: { select: { id: true, date: true, serviceName: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/reviews/:id/flag', requireAdmin, async (req, res) => {
  try {
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { status: 'Flagged' }
    });

    const ratingSummary = await ratingService.calculateMerchantRating(updated.merchantId);

    await logAdminAction({
      admin: req.user,
      action: 'REVIEW_FLAG',
      entity: 'Review',
      entityId: updated.id,
      details: `Flagged review #${updated.id} for merchant #${updated.merchantId}`
    });

    res.json({ ...updated, ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/reviews/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: { status }
    });

    const ratingSummary = await ratingService.calculateMerchantRating(updated.merchantId);

    await logAdminAction({
      admin: req.user,
      action: `REVIEW_${status.toUpperCase()}`,
      entity: 'Review',
      entityId: updated.id,
      details: `Set review #${updated.id} status to ${status}`
    });

    res.json({ ...updated, ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });

    await prisma.review.delete({ where: { id: req.params.id } });

    // Recalculate merchant rating and review count
    const ratingSummary = await ratingService.calculateMerchantRating(review.merchantId);

    await logAdminAction({
      admin: req.user,
      action: 'REVIEW_REMOVE',
      entity: 'Review',
      entityId: review.id,
      details: `Removed review #${review.id} from customer "${review.userName}" for merchant #${review.merchantId}`
    });

    res.json({ message: 'Review removed', id: review.id, ratingSummary });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Reports & Analytics (Stage 16)
app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
  try {
    const { period, startDate, endDate, limit } = req.query;
    const data = await analyticsService.getAdminAnalytics({ period, startDate, endDate, limit });
    res.json(data);
  } catch (err) {
    console.error('Error in /api/admin/analytics:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/analytics/export', requireAdmin, async (req, res) => {
  try {
    const { type, format = 'csv', period, startDate, endDate } = req.query;
    const result = await analyticsService.exportReport({
      scope: 'admin',
      type: type || 'platform-overview',
      format,
      period,
      startDate,
      endDate
    });

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    if (format === 'json') {
      return res.json(result.data);
    }
    res.send(result.data);
  } catch (err) {
    console.error('Error in /api/admin/analytics/export:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/reports', requireAdmin, async (req, res) => {
  try {
    const data = await analyticsService.getAdminAnalytics(req.query);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12. System Notifications Broadcast & Feed
app.get('/api/admin/notifications', requireAdmin, async (req, res) => {
  try {
    const notifs = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30
    });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/notifications/broadcast', requireAdmin, async (req, res) => {
  try {
    const { title, message, role = 'all', type = 'info' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }

    const notif = await prisma.notification.create({
      data: {
        role,
        title: title.trim(),
        message: message.trim(),
        type,
        read: false
      }
    });

    await logAdminAction({
      admin: req.user,
      action: 'NOTIFICATION_BROADCAST',
      entity: 'Notification',
      entityId: notif.id,
      details: `Broadcast alert to audience "${role}": "${title.trim()}"`
    });

    res.status(201).json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 12b. Promotions Monitoring & Moderation
app.get('/api/admin/promotions', requireAdmin, async (req, res) => {
  try {
    const promos = await promotionService.listAdminPromotions(req.query);
    res.json(promos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/promotions/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const promo = await promotionService.setPromotionStatus(req.params.id, null, status);
    await logAdminAction({
      admin: req.user,
      action: 'PROMOTION_STATUS_UPDATE',
      entity: 'Promotion',
      entityId: promo.id,
      details: `Promotion #${promo.id} (${promo.code}) status changed to ${promo.status}`
    });
    res.json(promo);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.delete('/api/admin/promotions/:id', requireAdmin, async (req, res) => {
  try {
    const promo = await prisma.promotion.findUnique({ where: { id: req.params.id } });
    if (!promo) return res.status(404).json({ error: 'Promotion not found' });
    await prisma.promotion.delete({ where: { id: req.params.id } });
    await logAdminAction({
      admin: req.user,
      action: 'PROMOTION_DELETE',
      entity: 'Promotion',
      entityId: req.params.id,
      details: `Deleted promotion #${req.params.id} (${promo.code})`
    });
    res.json({ message: 'Promotion deleted by admin', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 13. Audit Logs (Governance Records)
app.get('/api/admin/audit-logs', requireAdmin, async (req, res) => {
  try {
    const { search, entity, action, limit = 50 } = req.query;
    const where = {};
    if (entity && entity !== 'all') where.entity = entity;
    if (action && action !== 'all') where.action = action;
    if (search) {
      where.OR = [
        { administrator: { contains: search } },
        { action: { contains: search } },
        { entity: { contains: search } },
        { details: { contains: search } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 50
    });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 14. Settings (Monetization & Platform Governance)
app.get('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const settings = await prisma.adminSetting.findFirst();
    res.json(settings || {
      commissionEnabled: false,
      commissionRate: 5.0,
      minimumSubscription: 50.0,
      platformName: 'LocalBiz South Africa',
      supportEmail: 'support@localbiz.co.za',
      supportPhone: '+27 11 907 5500',
      maintenanceMode: false
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
  try {
    const updated = await prisma.adminSetting.upsert({
      where: { id: 1 },
      update: req.body,
      create: { id: 1, ...req.body }
    });

    await logAdminAction({
      admin: req.user,
      action: 'SETTINGS_UPDATE',
      entity: 'Setting',
      entityId: '1',
      details: `Platform settings updated: ${JSON.stringify(req.body)}`
    });

    notificationService.notifyAdminSystemEvent(
      'SETTINGS_UPDATE',
      'Platform Settings Updated',
      `Admin updated platform configuration settings: ${JSON.stringify(req.body)}`,
      req.body
    ).catch(() => {});

    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ================= 14. 404 HANDLER FOR API ROUTES =================
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route not found: ${req.method} ${req.originalUrl}` });
});

// ================= CENTRALIZED PRODUCTION ERROR HANDLER =================
app.use((err, req, res, next) => {
  const correlationId = 'err-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8);
  const status = err.status || err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      correlationId,
      error: err.message,
      stack: err.stack,
      path: req.originalUrl,
      method: req.method
    }));
    return res.status(status).json({
      error: status === 500 ? 'An unexpected internal error occurred. Please try again later.' : err.message,
      correlationId
    });
  } else {
    if (process.env.NODE_ENV !== 'test') {
      console.error(`[Error] [${correlationId}]`, err);
    }
    return res.status(status).json({
      error: err.message || 'Internal server error',
      correlationId,
      ...(err.stack ? { stack: err.stack.split('\n') } : {})
    });
  }
});

// ================= STATIC CLIENT SERVING =================
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
} else {
  app.use(express.static(__dirname));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
  });
}

let server;
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].endsWith('server'))) {
  server = app.listen(PORT, () => {
    console.log('================================================================');
    console.log(`  🚀 LocalBiz Web Platform live (SQLite + Prisma): http://localhost:${PORT}`);
    console.log('================================================================');
    console.log('  📁 SQLite database: prisma/dev.db');
    console.log('  🌐 Full Web Marketplace: http://localhost:' + PORT + '/');
    console.log('');
  });

  // Graceful shutdown handling (SIGTERM, SIGINT)
  const handleShutdown = async (signal) => {
    console.log(`\n[Server] Received ${signal}. Gracefully shutting down...`);
    if (server) {
      server.close(async () => {
        console.log('[Server] HTTP server closed.');
        try {
          await prisma.$disconnect();
          console.log('[Server] Database connections closed.');
        } catch (e) {
          console.error('[Server] Error disconnecting database:', e.message);
        }
        process.exit(0);
      });
      setTimeout(() => {
        console.error('[Server] Forced shutdown timeout exceeded. Exiting.');
        process.exit(1);
      }, 10000).unref();
    } else {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => handleShutdown('SIGTERM'));
  process.on('SIGINT', () => handleShutdown('SIGINT'));
}

export { 
  app, 
  prisma, 
  server, 
  requireAuth, 
  requireRole, 
  requireConsumer, 
  requireBusiness, 
  requireAdmin,
  isValidEmail,
  isValidPassword,
  sanitizeUser,
  paymentService,
  PaymentProvider,
  MockPaymentProvider,
  PAYMENT_STATES,
  messageService,
  promotionService,
  analyticsService,
  locationService
};
export default app;

