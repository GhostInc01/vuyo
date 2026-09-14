import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

// Test variables
const timestamp = Date.now();
const consumerEmail = `consumer_${timestamp}@localbiz.co.za`;
const consumerPassword = 'SecurePass123!';
let consumerToken = '';
let consumerUserId = '';

const businessEmail = `business_${timestamp}@localbiz.co.za`;
const businessPassword = 'MerchantPass456!';
const businessName = `Kasi Craft Bakery ${timestamp}`;
let businessToken = '';
let businessId = '';
let businessKycId = '';

let adminToken = '';

before(async () => {
  // Start express app on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login as seeded Super Admin to get admin token
  const adminRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@localbiz.co.za',
      password: 'admin123'
    })
  });
  const adminData = await adminRes.json();
  adminToken = adminData.token;
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  // Cleanup test users & merchants if created
  if (consumerUserId) {
    await prisma.notification.deleteMany({ where: { userId: consumerUserId } });
    await prisma.user.deleteMany({ where: { id: consumerUserId } });
  }
  if (businessId) {
    await prisma.merchant.deleteMany({ where: { id: businessId } });
    await prisma.kycApproval.deleteMany({ where: { name: businessName } });
    await prisma.user.deleteMany({ where: { email: businessEmail } });
  }
  await prisma.$disconnect();
});

describe('Stage 3 — Authentication & Authorization Suite', () => {

  describe('1. Consumer Registration & Validation', () => {
    it('successfully registers a new consumer account with sanitized response', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Nandi Madida',
          email: consumerEmail,
          phone: '+27 83 234 5678',
          password: consumerPassword,
          role: 'consumer'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.token, 'Must return JWT token');
      assert.ok(data.user, 'Must return user object');
      assert.equal(data.user.email, consumerEmail);
      assert.equal(data.user.role, 'consumer');
      assert.equal(data.user.name, 'Nandi Madida');
      assert.equal(data.user.phone, '+27 83 234 5678');
      
      // CRITICAL SECURITY: Ensure no plaintext passwords or password hashes are leaked
      assert.equal(data.user.password, undefined, 'Password must not be returned');
      assert.equal(data.user.password_hash, undefined, 'Password hash must not be returned');
      assert.equal(data.user.hash, undefined, 'Hash must not be returned');

      consumerToken = data.token;
      consumerUserId = data.user.id;
    });

    it('rejects registration with invalid email format (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Invalid Email User',
          email: 'not-an-email',
          phone: '+27 83 000 0000',
          password: 'ValidPassword123'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /valid email/i);
    });

    it('rejects registration with password shorter than 6 characters (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Short Password User',
          email: `shortpass_${Date.now()}@test.co.za`,
          phone: '+27 83 000 0000',
          password: '12345'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /at least 6 characters/i);
    });

    it('rejects registration with existing duplicate email (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Nandi',
          email: consumerEmail,
          phone: '+27 83 234 5678',
          password: 'AnotherPassword123'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /already exists/i);
    });
  });

  describe('2. Authentication & Login Verification', () => {
    it('authenticates valid credentials and returns JWT token + sanitized user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: consumerEmail,
          password: consumerPassword
        })
      });

      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.token);
      assert.equal(data.user.email, consumerEmail);
      assert.equal(data.user.password, undefined);
      assert.equal(data.user.password_hash, undefined);
    });

    it('rejects login with incorrect password (401)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: consumerEmail,
          password: 'WrongPassword999!'
        })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /invalid email or password/i);
    });

    it('rejects login with non-existent user email (401)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'nonexistent_user_9999@test.co.za',
          password: 'SomePassword123!'
        })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /invalid email or password/i);
    });

    it('rejects login with malformed email format (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invalid-email-string',
          password: 'SomePassword123!'
        })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /format/i);
    });
  });

  describe('3. Business Registration & Quarantine Lifecycle', () => {
    it('registers a business with owner details, name, category, and PENDING status', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Kagiso Mokoena',
          email: businessEmail,
          phone: '+27 71 888 9999',
          password: businessPassword,
          role: 'business',
          businessName: businessName,
          businessCategory: 'Food & Fresh Produce',
          businessDescription: 'Fresh sourdough, traditional breads and confectioneries baked daily.',
          address: 'Alberton North'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.token, 'Must return JWT token');
      assert.ok(data.user, 'Must return user object');
      assert.equal(data.user.role, 'business');
      assert.equal(data.user.email, businessEmail);
      assert.equal(data.user.password, undefined);

      // Business entity verification
      assert.ok(data.business, 'Must return created business object');
      assert.equal(data.business.name, businessName);
      assert.equal(data.business.status, 'Pending', 'Newly registered business MUST be Pending');
      assert.equal(data.business.verified, false, 'Newly registered business MUST NOT be verified');

      businessToken = data.token;
      businessId = data.business.id;
    });

    it('verifies that newly registered PENDING business is HIDDEN from public marketplace', async () => {
      // Fetch public merchants without any filter
      const res = await fetch(`${baseUrl}/api/merchants`);
      assert.equal(res.status, 200);
      const data = await res.json();
      
      const found = data.merchants.find(m => m.id === businessId || m.name === businessName);
      assert.equal(found, undefined, 'Pending business MUST NOT appear in public approved marketplace');
    });

    it('verifies pending business is accessible by Admin in approvals queue', async () => {
      const res = await fetch(`${baseUrl}/api/admin/overview`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      
      const approval = data.pendingApprovals.find(a => a.name === businessName);
      assert.ok(approval, 'Pending business must appear in Admin KYC approvals queue');
      assert.equal(approval.status, 'Pending');
      businessKycId = approval.id;
    });

    it('allows Admin to approve the business and transitions it to public marketplace', async () => {
      // Admin approves the KYC application
      const approveRes = await fetch(`${baseUrl}/api/admin/approvals/${businessKycId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      assert.equal(approveRes.status, 200);

      // Now query public merchants - business must now appear!
      const publicRes = await fetch(`${baseUrl}/api/merchants`);
      assert.equal(publicRes.status, 200);
      const publicData = await publicRes.json();
      
      const approvedMerchant = publicData.merchants.find(m => m.name === businessName);
      assert.ok(approvedMerchant, 'Approved business must now appear in public marketplace');
      assert.equal(approvedMerchant.status, 'Approved');
      assert.equal(approvedMerchant.verified, true);
    });
  });

  describe('4. Session Management & User Profile (Me & Logout)', () => {
    it('GET /api/auth/me returns profile without password hash for authenticated consumer', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const user = await res.json();
      assert.equal(user.email, consumerEmail);
      assert.equal(user.role, 'consumer');
      assert.equal(user.password, undefined);
      assert.equal(user.password_hash, undefined);
    });

    it('GET /api/auth/me returns profile + attached business for business user', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${businessToken}` }
      });
      assert.equal(res.status, 200);
      const user = await res.json();
      assert.equal(user.email, businessEmail);
      assert.equal(user.role, 'business');
      assert.ok(user.business);
      assert.equal(user.business.name, businessName);
    });

    it('GET /api/auth/me rejects unauthenticated request (401)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/me`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    it('POST /api/auth/logout succeeds (200)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /successfully signed out/i);
    });
  });

  describe('5. Role-Based Access Control (RBAC) Enforcement', () => {
    it('unauthenticated request to consumer-only endpoint is rejected (401)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/consumer-only`);
      assert.equal(res.status, 401);
    });

    it('consumer token can access consumer-only endpoint (200)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/consumer-only`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /consumer access granted/i);
    });

    it('consumer token is forbidden from business-only endpoint (403)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/business-only`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('consumer token is forbidden from admin-only endpoint (403)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/admin-only`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Super Admin privileges required/i);
    });

    it('business token can access business-only endpoint (200)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/business-only`, {
        headers: { 'Authorization': `Bearer ${businessToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /business access granted/i);
    });

    it('business token is forbidden from consumer-only endpoint (403)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/consumer-only`, {
        headers: { 'Authorization': `Bearer ${businessToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Forbidden/i);
    });

    it('business token is forbidden from admin-only endpoint (403)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/admin-only`, {
        headers: { 'Authorization': `Bearer ${businessToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Super Admin privileges required/i);
    });

    it('admin token can access admin-only endpoint (200)', async () => {
      const res = await fetch(`${baseUrl}/api/protected/admin-only`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /Super Admin access granted/i);
    });
  });

  describe('6. Account Lifecycle, Suspension & KYC Rejection', () => {
    const suspendedEmail = `suspended_${Date.now()}@localbiz.co.za`;
    let suspendedUserId = '';

    it('creates a user and suspends their account via Admin API', async () => {
      // Register user
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Suspended User',
          email: suspendedEmail,
          password: 'Password123!',
          phone: '+27 82 999 0000'
        })
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      suspendedUserId = regData.user.id;

      // Admin suspends user
      const patchRes = await fetch(`${baseUrl}/api/admin/users/${suspendedUserId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'suspended' })
      });
      assert.equal(patchRes.status, 200);
      const updatedUser = await patchRes.json();
      assert.equal(updatedUser.status, 'suspended');
    });

    it('blocks suspended user from logging in (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: suspendedEmail,
          password: 'Password123!'
        })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /suspended/i);

      // Cleanup
      await prisma.user.deleteMany({ where: { id: suspendedUserId } });
    });

    it('handles KYC rejection and transitions business to Rejected status', async () => {
      // Register a temporary test business
      const rejectedBizEmail = `reject_${Date.now()}@localbiz.co.za`;
      const rejectedBizName = `Unqualified Shop ${Date.now()}`;
      const regRes = await fetch(`${baseUrl}/api/auth/register-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Noncompliant Owner',
          email: rejectedBizEmail,
          password: 'Password123!',
          businessName: rejectedBizName,
          businessCategory: 'General Services',
          address: 'Alberton'
        })
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      const tempBizId = regData.business.id;

      // Find KYC approval
      const kyc = await prisma.kycApproval.findFirst({ where: { name: rejectedBizName } });
      assert.ok(kyc);

      // Admin rejects KYC application
      const rejectRes = await fetch(`${baseUrl}/api/admin/approvals/${kyc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Rejected' })
      });
      assert.equal(rejectRes.status, 200);

      // Check merchant status is now Rejected and verified false
      const m = await prisma.merchant.findUnique({ where: { id: tempBizId } });
      assert.equal(m.status, 'Rejected');
      assert.equal(m.verified, false);

      // Cleanup
      await prisma.merchant.deleteMany({ where: { id: tempBizId } });
      await prisma.kycApproval.deleteMany({ where: { id: kyc.id } });
      await prisma.user.deleteMany({ where: { email: rejectedBizEmail } });
    });
  });
});
