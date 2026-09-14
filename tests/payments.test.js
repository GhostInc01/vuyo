import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { PaymentProvider } from '../services/payment/PaymentProvider.js';
import { MockPaymentProvider } from '../services/payment/MockPaymentProvider.js';
import { PaymentService, PAYMENT_STATES } from '../services/payment/PaymentService.js';

let server;
let baseUrl;

// Test fixtures & tokens
const timestamp = Date.now();
const bizAEmail = `pay_biz_a_${timestamp}@localbiz.co.za`;
const bizBEmail = `pay_biz_b_${timestamp}@localbiz.co.za`;
const consumerAEmail = `pay_consumer_a_${timestamp}@localbiz.co.za`;
const consumerBEmail = `pay_consumer_b_${timestamp}@localbiz.co.za`;
const adminEmail = `pay_admin_${timestamp}@localbiz.co.za`;
const password = 'TestPassword123!';

let bizAToken = '';
let bizAMerchantId = '';
let bizBToken = '';
let bizBMerchantId = '';
let consumerAToken = '';
let consumerAId = '';
let consumerBToken = '';
let consumerBId = '';
let adminToken = '';

let testOrderIdSuccess = '';
let testOrderIdFailed = '';
let testBookingIdSuccess = '';
let testBookingIdFailed = '';

before(async () => {
  // Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 1. Register Consumer A
  const cARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Alice Pay',
      email: consumerAEmail,
      phone: '+27 82 201 0001',
      password,
      role: 'consumer'
    })
  });
  const cAData = await cARes.json();
  consumerAToken = cAData.token;
  consumerAId = cAData.user.id;

  // 2. Register Consumer B
  const cBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Consumer Bob Pay',
      email: consumerBEmail,
      phone: '+27 82 201 0002',
      password,
      role: 'consumer'
    })
  });
  const cBData = await cBRes.json();
  consumerBToken = cBData.token;
  consumerBId = cBData.user.id;

  // 3. Register Business A
  const bARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Merchant Alice Pay',
      email: bizAEmail,
      phone: '+27 82 201 0003',
      password,
      role: 'business',
      businessName: 'Alice Artisan Deli',
      category: 'Food & Bakery',
      suburb: 'Alberton'
    })
  });
  const bAData = await bARes.json();
  bizAToken = bAData.token;
  bizAMerchantId = bAData.user.merchantId;

  // 4. Register Business B
  const bBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Merchant Bob Pay',
      email: bizBEmail,
      phone: '+27 82 201 0004',
      password,
      role: 'business',
      businessName: 'Bob Auto Diagnostics',
      category: 'Automotive',
      suburb: 'Meyerton'
    })
  });
  const bBData = await bBRes.json();
  bizBToken = bBData.token;
  bizBMerchantId = bBData.user.merchantId;

  // 5. Get Super Admin Token
  const admRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@localbiz.co.za',
      password: 'admin123'
    })
  });
  const admData = await admRes.json();
  adminToken = admData.token;


  // Approve Business A and B
  await prisma.merchant.update({ where: { id: bizAMerchantId }, data: { status: 'Approved' } });
  await prisma.merchant.update({ where: { id: bizBMerchantId }, data: { status: 'Approved' } });

  // Create products for orders
  await prisma.product.create({
    data: {
      id: `prod_deli_${timestamp}`,
      merchantId: bizAMerchantId,
      name: 'Organic Honeycomb Pot',
      price: 120.00,
      category: 'Food & Bakery',
      stockCount: 50,
      inStock: true,
      image: 'https://images.unsplash.com/photo-1587049352846-4a222e784d38',
      desc: 'Pure raw local honeycomb'
    }
  });

  // Create service for bookings
  await prisma.product.create({
    data: {
      id: `svc_auto_${timestamp}`,
      merchantId: bizBMerchantId,
      name: 'Full Vehicle OBD Diagnostic',
      price: 450.00,
      category: 'Automotive',
      isService: true,
      duration: '45 mins',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b',
      desc: 'Complete engine ECU diagnostic scan'
    }
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Stage 9 — Payment Architecture & Security Suite', () => {

  // =========================================================================
  // 1. PaymentProvider Abstraction & Pluggability
  // =========================================================================
  describe('1. PaymentProvider Interface & Architecture Decoupling', () => {
    it('prevents direct instantiation of abstract PaymentProvider class', () => {
      assert.throws(
        () => new PaymentProvider('test'),
        /Cannot construct PaymentProvider abstract instances directly/
      );
    });

    it('requires subclasses to implement interface methods', async () => {
      class IncompleteProvider extends PaymentProvider {
        constructor() {
          super('incomplete');
        }
      }
      const provider = new IncompleteProvider();
      await assert.rejects(
        () => provider.createPayment({ amount: 100 }),
        /Method 'createPayment\(\)' must be implemented/
      );
      await assert.rejects(
        () => provider.processPayment('tx_123'),
        /Method 'processPayment\(\)' must be implemented/
      );
      await assert.rejects(
        () => provider.refundPayment('tx_123'),
        /Method 'refundPayment\(\)' must be implemented/
      );
    });

    it('allows pluggable third-party gateways (e.g. PayFast/Stripe) without touching order logic', async () => {
      const customService = new PaymentService();

      // Custom mock provider simulating PayFast gateway
      class FakePayFastProvider extends PaymentProvider {
        constructor() {
          super('payfast');
        }
        async createPayment(data) {
          return {
            transactionId: 'pf_mock_12345',
            status: 'PENDING',
            paymentUrl: 'https://sandbox.payfast.co.za/eng/process?cmd=_payrequest'
          };
        }
        async processPayment(txId) {
          return { transactionId: txId, status: 'SUCCESS', paidAt: new Date(), cardBrand: 'Mastercard', cardLast4: '8888' };
        }
        async refundPayment(txId) {
          return { refundId: 'rf_pf_1', status: 'REFUNDED', refundedAt: new Date() };
        }
        async getPaymentStatus(txId) {
          return { transactionId: txId, status: 'SUCCESS' };
        }
        async verifyWebhook() {
          return { isValid: true };
        }
      }

      customService.registerProvider('payfast', new FakePayFastProvider());
      const retrieved = customService.getProvider('payfast');
      assert.equal(retrieved.getName(), 'payfast');
    });
  });

  // =========================================================================
  // 2. Mock Payment Provider Deterministic Simulation
  // =========================================================================
  describe('2. MockPaymentProvider Gateway Simulation', () => {
    const mock = new MockPaymentProvider();

    it('creates payment intent with mock URL and transactionId', async () => {
      const intent = await mock.createPayment({
        amount: 250.00,
        currency: 'ZAR',
        reference: 'PAY-ORD-TEST-001',
        customer: { name: 'Alice', email: 'alice@test.co.za' }
      });
      assert.ok(intent.transactionId.startsWith('tx_mock_'));
      assert.equal(intent.status, 'PENDING');
      assert.ok(intent.paymentUrl.includes(intent.transactionId));
    });

    it('simulates successful card payment with sanitized metadata', async () => {
      const res = await mock.processPayment('tx_mock_success_1', {
        amount: 150,
        cardNumber: '4242 4242 4242 4242'
      });
      assert.equal(res.status, 'SUCCESS');
      assert.equal(res.cardBrand, 'Visa');
      assert.equal(res.cardLast4, '4242');
      assert.ok(res.paidAt instanceof Date);
    });

    it('simulates card decline via test card pattern (...0002)', async () => {
      const res = await mock.processPayment('tx_mock_decline_1', {
        amount: 150,
        cardNumber: '4000 0000 0000 0002'
      });
      assert.equal(res.status, 'FAILED');
      assert.equal(res.failureReason, 'Card declined by issuing bank');
    });

    it('simulates insufficient funds via test card pattern (...0003)', async () => {
      const res = await mock.processPayment('tx_mock_funds_1', {
        amount: 150,
        cardNumber: '4000 0000 0000 0003'
      });
      assert.equal(res.status, 'FAILED');
      assert.equal(res.failureReason, 'Insufficient funds in account');
    });

    it('simulates expired card via test card pattern (...0004)', async () => {
      const res = await mock.processPayment('tx_mock_exp_1', {
        amount: 150,
        cardNumber: '4000 0000 0000 0004'
      });
      assert.equal(res.status, 'FAILED');
      assert.equal(res.failureReason, 'Card has expired');
    });

    it('simulates deterministic failure trigger via amount 999.99', async () => {
      const res = await mock.processPayment('tx_mock_amount_fail', {
        amount: 999.99
      });
      assert.equal(res.status, 'FAILED');
      assert.equal(res.failureReason, 'High-risk transaction declined');
    });

    it('simulates refunding settled transaction', async () => {
      const res = await mock.refundPayment('tx_mock_success_1', { amount: 150, reason: 'Customer return' });
      assert.equal(res.status, 'REFUNDED');
      assert.equal(res.refundedAmount, 150);
      assert.ok(res.refundId.startsWith('ref_mock_'));
    });
  });

  // =========================================================================
  // 3. PCI-DSS Security & Sensitive Data Scrubbing
  // =========================================================================
  describe('3. PCI-DSS Security Compliance (Zero Sensitive Data Retention)', () => {
    it('strictly sanitizes raw PAN, CVV, Card PIN, and Payment Passwords from memory and storage', async () => {
      const testService = new PaymentService();
      const dangerousInput = {
        cardNumber: '4111 2222 3333 4444',
        pan: '4111222233334444',
        cvv: '123',
        cvc: '123',
        cardPin: '9999',
        pin: '1234',
        password: 'SuperSecretCardPassword!',
        paymentPassword: 'bank-pin-secret',
        customerName: 'Alice'
      };

      const sanitized = testService.sanitizeCardData(dangerousInput);

      assert.equal(sanitized.cardNumber, undefined);
      assert.equal(sanitized.pan, undefined);
      assert.equal(sanitized.cvv, undefined);
      assert.equal(sanitized.cvc, undefined);
      assert.equal(sanitized.cardPin, undefined);
      assert.equal(sanitized.pin, undefined);
      assert.equal(sanitized.password, undefined);
      assert.equal(sanitized.paymentPassword, undefined);
      // Only safe metadata retained
      assert.equal(sanitized.cardLast4, '4444');
      assert.equal(sanitized.cardBrand, 'Visa');
      assert.equal(sanitized.customerName, 'Alice');
    });

    it('verifies database Payment table contains no sensitive PAN/CVV columns', async () => {
      // Introspect Payment record from Prisma client to ensure schema integrity
      const dummyOrder = await prisma.order.create({
        data: {
          id: `LBZ-PCI-${timestamp}`,
          merchantId: bizAMerchantId,
          businessName: 'Alice Deli',
          customer: 'PCI Auditor',
          phone: '+27 82 999 8888',
          address: 'Alberton',
          placedAt: 'Now',
          total: 100,
          status: 'PENDING'
        }
      });

      const p = await prisma.payment.create({
        data: {
          reference: `PAY-PCI-${timestamp}`,
          orderId: dummyOrder.id,
          amount: 100,
          status: 'PENDING',
          cardBrand: 'Visa',
          cardLast4: '4242'
        }
      });

      assert.equal(p.cardNumber, undefined);
      assert.equal(p.pan, undefined);
      assert.equal(p.cvv, undefined);
      assert.equal(p.pin, undefined);
      assert.equal(p.cardLast4, '4242');
    });
  });

  // =========================================================================
  // 4. Order Purchasing & Payment Workflow Integration
  // =========================================================================
  describe('4. Order Workflow Integration (Success & Failed Payment Integrity)', () => {
    it('creates an order and processes successful payment, updating order to Paid and ACCEPTED', async () => {
      // 1. Create order
      const ordRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchantId,
          businessName: 'Alice Artisan Deli',
          customer: 'Consumer Alice',
          phone: '+27 82 201 0001',
          address: '14 Voortrekker Ave, Alberton',
          paymentMethod: 'Instant Card',
          status: 'PENDING',
          total: 160.00,
          lines: [{ name: 'Organic Honeycomb Pot', qty: 1, price: 120.00 }]
        })
      });
      assert.equal(ordRes.status, 201);
      const order = await ordRes.json();
      testOrderIdSuccess = order.id;

      // 2. Create Payment intent for order
      const payRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          orderId: testOrderIdSuccess,
          amount: 160.00,
          method: 'CARD',
          provider: 'mock'
        })
      });
      assert.equal(payRes.status, 201);
      const payment = await payRes.json();
      assert.equal(payment.status, 'PENDING');
      assert.equal(payment.orderId, testOrderIdSuccess);

      // 3. Process payment with SUCCESS outcome
      const procRes = await fetch(`${baseUrl}/api/payments/${payment.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          cardNumber: '4242 4242 4242 4242',
          amount: 160.00
        })
      });
      assert.equal(procRes.status, 200);
      const processed = await procRes.json();
      assert.equal(processed.status, 'SUCCESS');
      assert.equal(processed.cardBrand, 'Visa');
      assert.equal(processed.cardLast4, '4242');

      // 4. Verify Order reflects payment state correctly
      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderIdSuccess } });
      assert.equal(updatedOrder.paymentStatus, 'Paid');
      assert.equal(updatedOrder.status, 'ACCEPTED');
    });

    it('CRUCIAL: Failed payment leaves order in PENDING, NEVER marking it completed or accepted', async () => {
      // 1. Create order
      const ordRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchantId,
          businessName: 'Alice Artisan Deli',
          customer: 'Consumer Alice',
          phone: '+27 82 201 0001',
          address: '14 Voortrekker Ave, Alberton',
          paymentMethod: 'Instant Card',
          status: 'PENDING',
          total: 160.00,
          lines: [{ name: 'Organic Honeycomb Pot', qty: 1, price: 120.00 }]
        })
      });
      const order = await ordRes.json();
      testOrderIdFailed = order.id;

      // 2. Create Payment intent
      const payRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          orderId: testOrderIdFailed,
          amount: 160.00,
          method: 'CARD',
          provider: 'mock'
        })
      });
      const payment = await payRes.json();

      // 3. Process payment with simulated failure (Declined Card)
      const procRes = await fetch(`${baseUrl}/api/payments/${payment.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          cardNumber: '4000 0000 0000 0002', // Card decline trigger
          amount: 160.00
        })
      });
      assert.equal(procRes.status, 200);
      const processed = await procRes.json();
      assert.equal(processed.status, 'FAILED');
      assert.ok(processed.failureReason.includes('declined'));

      // 4. CRITICAL ASSERTION: Order status MUST NOT be ACCEPTED or COMPLETED!
      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderIdFailed } });
      assert.notEqual(updatedOrder.status, 'ACCEPTED');
      assert.notEqual(updatedOrder.status, 'COMPLETED');
      assert.notEqual(updatedOrder.status, 'DELIVERED');
      assert.equal(updatedOrder.status, 'PENDING');
      assert.equal(updatedOrder.paymentStatus, 'Failed');
    });
  });

  // =========================================================================
  // 5. Booking Workflow Integration (Service Bookings + Payments)
  // =========================================================================
  describe('5. Service Booking Workflow Integration', () => {
    it('creates a service booking and processes payment, confirming booking on success', async () => {
      // 1. Create booking
      const bkgRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizBMerchantId,
          customerName: 'Alice Pay',
          phone: '+27 82 201 0001',
          serviceName: 'Full Vehicle OBD Diagnostic',
          servicePrice: 450.00,
          date: '2026-10-15',
          timeSlot: '11:30',
          duration: '45 mins'
        })
      });
      assert.equal(bkgRes.status, 201);
      const booking = await bkgRes.json();
      testBookingIdSuccess = booking.id;

      // 2. Create payment for booking
      const payRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          bookingId: testBookingIdSuccess,
          amount: 450.00,
          method: 'CARD',
          provider: 'mock'
        })
      });
      assert.equal(payRes.status, 201);
      const payment = await payRes.json();
      assert.equal(payment.bookingId, testBookingIdSuccess);

      // 3. Process payment successfully
      const procRes = await fetch(`${baseUrl}/api/payments/${payment.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          cardNumber: '5555 5555 5555 4444',
          amount: 450.00
        })
      });
      const processed = await procRes.json();
      assert.equal(processed.status, 'SUCCESS');
      assert.equal(processed.cardBrand, 'Mastercard');

      // 4. Verify Booking is marked Paid and CONFIRMED
      const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingIdSuccess } });
      assert.equal(updatedBooking.paymentStatus, 'Paid');
      assert.equal(updatedBooking.status, 'CONFIRMED');
    });

    it('prevents booking confirmation if payment fails (insufficient funds)', async () => {
      // 1. Create booking
      const bkgRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizBMerchantId,
          customerName: 'Alice Pay',
          phone: '+27 82 201 0001',
          serviceName: 'Full Vehicle OBD Diagnostic',
          servicePrice: 450.00,
          date: '2026-10-16',
          timeSlot: '14:00',
          duration: '45 mins'
        })
      });
      const booking = await bkgRes.json();
      testBookingIdFailed = booking.id;

      // 2. Create payment
      const payRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          bookingId: testBookingIdFailed,
          amount: 450.00,
          method: 'CARD',
          provider: 'mock'
        })
      });
      const payment = await payRes.json();

      // 3. Process with Insufficient Funds trigger
      const procRes = await fetch(`${baseUrl}/api/payments/${payment.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          cardNumber: '4000 0000 0000 0003'
        })
      });
      const processed = await procRes.json();
      assert.equal(processed.status, 'FAILED');

      // 4. Verify booking remains PENDING and NOT CONFIRMED
      const updatedBooking = await prisma.booking.findUnique({ where: { id: testBookingIdFailed } });
      assert.equal(updatedBooking.status, 'PENDING');
      assert.equal(updatedBooking.paymentStatus, 'Failed');
    });
  });

  // =========================================================================
  // 6. Payment Refunds Workflow
  // =========================================================================
  describe('6. Payment Refund Lifecycle (SUCCESS -> REFUNDED)', () => {
    it('refunds a successful payment and updates order status to Refunded', async () => {
      // Find payment for testOrderIdSuccess
      const payment = await prisma.payment.findFirst({
        where: { orderId: testOrderIdSuccess }
      });
      assert.ok(payment);
      assert.equal(payment.status, 'SUCCESS');

      // Issue refund via Admin token
      const refRes = await fetch(`${baseUrl}/api/payments/${payment.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({
          amount: 160.00,
          reason: 'Customer return accepted'
        })
      });
      assert.equal(refRes.status, 200);
      const refunded = await refRes.json();
      assert.equal(refunded.status, 'REFUNDED');

      // Verify associated order paymentStatus is Refunded
      const updatedOrder = await prisma.order.findUnique({ where: { id: testOrderIdSuccess } });
      assert.equal(updatedOrder.paymentStatus, 'Refunded');
    });

    it('rejects refund attempt on an unsettled / failed payment', async () => {
      const failedPayment = await prisma.payment.findFirst({
        where: { orderId: testOrderIdFailed }
      });
      assert.ok(failedPayment);
      assert.equal(failedPayment.status, 'FAILED');

      const refRes = await fetch(`${baseUrl}/api/payments/${failedPayment.id}/refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ amount: 160 })
      });
      assert.equal(refRes.status, 400);
      const err = await refRes.json();
      assert.ok(err.error.includes('Only SUCCESS payments can be refunded'));
    });
  });

  // =========================================================================
  // 7. Multi-Tenant RBAC & Security Enforcement
  // =========================================================================
  describe('7. Multi-Tenant RBAC & Authorization Scoping', () => {
    it('allows Consumer A to view their own payment history', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        headers: { 'Authorization': `Bearer ${consumerAToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(Array.isArray(list));
      assert.ok(list.length > 0);
      // All returned payments belong to Consumer A
      for (const p of list) {
        assert.equal(p.userId, consumerAId);
      }
    });

    it('prevents Consumer B from viewing Consumer A payment details (403)', async () => {
      const paymentA = await prisma.payment.findFirst({
        where: { userId: consumerAId }
      });
      assert.ok(paymentA);

      const res = await fetch(`${baseUrl}/api/payments/${paymentA.id}`, {
        headers: { 'Authorization': `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('allows Business A to view only Business A payments', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        headers: { 'Authorization': `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      for (const p of list) {
        assert.equal(p.merchantId, bizAMerchantId);
      }
    });

    it('prevents Business B from refunding Business A payments (403)', async () => {
      const paymentA = await prisma.payment.findFirst({
        where: { merchantId: bizAMerchantId, status: 'SUCCESS' }
      });
      if (paymentA) {
        const res = await fetch(`${baseUrl}/api/payments/${paymentA.id}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bizBToken}`
          },
          body: JSON.stringify({ amount: 50 })
        });
        assert.equal(res.status, 403);
      }
    });

    it('allows Super Admin to view full platform payment ledger and analytics', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 2);
    });

    it('rejects unauthenticated requests to GET /api/payments (401)', async () => {
      const res = await fetch(`${baseUrl}/api/payments`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated requests to GET /api/payments/:id (401)', async () => {
      const payment = await prisma.payment.findFirst();
      assert.ok(payment);
      const res = await fetch(`${baseUrl}/api/payments/${payment.id}`);
      assert.equal(res.status, 401);
    });

    it('rejects refund request where refund amount exceeds payment amount (400)', async () => {
      const payment = await prisma.payment.findFirst({
        where: { status: 'SUCCESS' }
      });
      if (payment) {
        const res = await fetch(`${baseUrl}/api/payments/${payment.id}/refund`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`
          },
          body: JSON.stringify({ amount: payment.amount + 1000 })
        });
        assert.equal(res.status, 400);
        const data = await res.json();
        assert.ok(data.error.includes('cannot exceed'));
      }
    });

    it('recursively strips nested card credentials and PAN sequences from metadata', () => {
      const testService = new PaymentService();
      const dirty = {
        amount: 200,
        metadata: {
          gateway: 'mock',
          nestedPaymentDetails: {
            allowedToken: 'tok_sandbox_123',
            card_number: '4111222233334444',
            cvv2: '999',
            pan: '4111222233334444'
          },
          userComment: 'Customer paid with card 4111222233334444 in store'
        }
      };
      const cleaned = testService.sanitizeCardData(dirty);
      assert.equal(cleaned.metadata.nestedPaymentDetails.allowedToken, 'tok_sandbox_123');
      assert.equal(cleaned.metadata.nestedPaymentDetails.card_number, undefined);
      assert.equal(cleaned.metadata.nestedPaymentDetails.cvv2, undefined);
      assert.equal(cleaned.metadata.nestedPaymentDetails.pan, undefined);
      assert.ok(!cleaned.metadata.userComment.includes('4111222233334444'));
      assert.ok(cleaned.metadata.userComment.includes('••••'));
    });

    it('processes asynchronous gateway webhook callback (IPN)', async () => {
      // Create a test order and payment
      const ord = await prisma.order.create({
        data: {
          id: `LBZ-WH-${Date.now()}`,
          merchantId: bizAMerchantId,
          businessName: 'Alice Deli',
          customer: 'Webhook Payer',
          phone: '+27 82 999 1111',
          address: 'Alberton',
          placedAt: 'Now',
          total: 190.00,
          status: 'PENDING'
        }
      });

      const pRes = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          orderId: ord.id,
          amount: 190.00,
          provider: 'mock'
        })
      });
      assert.equal(pRes.status, 201);
      const payment = await pRes.json();

      // Trigger webhook callback
      const whRes = await fetch(`${baseUrl}/api/payments/webhook/mock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: payment.transactionId,
          status: 'SUCCESS'
        })
      });
      assert.equal(whRes.status, 200);
      const whData = await whRes.json();
      assert.equal(whData.received, true);
      assert.equal(whData.result.status, 'SUCCESS');

      // Verify order was advanced to ACCEPTED and Paid
      const updatedOrd = await prisma.order.findUnique({ where: { id: ord.id } });
      assert.equal(updatedOrd.paymentStatus, 'Paid');
      assert.equal(updatedOrd.status, 'ACCEPTED');
    });
  });

});

