import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const qaConsumerEmail = `qa_consumer_${timestamp}@localbiz.co.za`;
const qaBizEmail = `qa_biz_${timestamp}@localbiz.co.za`;
const qaAdminEmail = `qa_admin_${timestamp}@localbiz.co.za`;
const password = 'StrongPassword123!';

let qaConsumerToken = '';
let qaConsumerUser = null;

let qaBizToken = '';
let qaBizUser = null;
let qaBizMerchant = null;

let qaAdminToken = '';
let qaAdminUser = null;

before(async () => {
  // Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // Setup Admin
  const adminHashed = await bcrypt.hash(password, 10);
  qaAdminUser = await prisma.user.create({
    data: {
      id: `u-qa-admin-${timestamp}`,
      email: qaAdminEmail,
      name: 'QA Super Admin',
      password: adminHashed,
      role: 'admin',
      status: 'active'
    }
  });
  const adminLogin = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: qaAdminEmail, password })
  });
  const adminData = await adminLogin.json();
  qaAdminToken = adminData.token;

  // Setup Consumer
  const cRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Consumer Persona',
      email: qaConsumerEmail,
      phone: '+27 82 555 9001',
      password,
      role: 'consumer'
    })
  });
  const cData = await cRes.json();
  qaConsumerToken = cData.token;
  qaConsumerUser = cData.user;

  // Setup Business
  const bRes = await fetch(`${baseUrl}/api/auth/register-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Business Owner',
      email: qaBizEmail,
      phone: '+27 82 555 9002',
      businessName: `QA Artisan Bakery ${timestamp}`,
      password
    })
  });
  const bData = await bRes.json();
  qaBizToken = bData.token;
  qaBizUser = bData.user;
  qaBizMerchant = bData.business;

  // Admin approves business for marketplace operations
  await fetch(`${baseUrl}/api/admin/merchants/${qaBizMerchant.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${qaAdminToken}`
    },
    body: JSON.stringify({ status: 'Approved', verified: true })
  });
});

after(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
});

describe('Stage 18 — QA & End-to-End Workflow Verification Suite', () => {

  // =========================================================================
  // WORKFLOW 1: Consumer Order from Start to Completion
  // =========================================================================
  describe('Workflow 1: Consumer Order from Start to Completion', () => {
    let orderProduct = null;
    let createdOrder = null;

    it('Step 1: Business creates a physical product in inventory', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          name: `Fresh Sourdough Bread ${timestamp}`,
          price: 45.00,
          category: 'Bakery',
          stockCount: 15,
          inStock: true,
          desc: 'Artisanal stone-ground sourdough loaf'
        })
      });
      assert.equal(res.status, 201);
      orderProduct = await res.json();
      assert.ok(orderProduct.id);
      assert.equal(orderProduct.stockCount, 15);
    });

    it('Step 2: Consumer browses catalog and initiates checkout order', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          address: '42 Market Street, Alberton',
          deliveryType: 'Delivery',
          lines: [{ productId: orderProduct.id, name: orderProduct.name, price: orderProduct.price, qty: 2 }]
        })
      });
      assert.equal(res.status, 201);
      createdOrder = await res.json();
      assert.ok(createdOrder.id);
      assert.equal(createdOrder.status, 'PENDING');
      assert.equal(createdOrder.lines.length, 1);

      // Verify stock was atomically decremented from 15 to 13
      const prodCheck = await prisma.product.findUnique({ where: { id: orderProduct.id } });
      assert.equal(prodCheck.stockCount, 13);
    });

    it('Step 3: Business views and accepts the order (PENDING -> ACCEPTED)', async () => {
      const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'ACCEPTED' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'ACCEPTED');
    });

    it('Step 4: Business advances fulfillment (ACCEPTED -> PROCESSING -> READY -> OUT_FOR_DELIVERY)', async () => {
      const stages = ['PROCESSING', 'READY', 'OUT_FOR_DELIVERY'];
      for (const st of stages) {
        const res = await fetch(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${qaBizToken}`
          },
          body: JSON.stringify({ status: st })
        });
        assert.equal(res.status, 200);
        const data = await res.json();
        assert.equal(data.status, st);
      }
    });

    it('Step 5: Driver completes delivery (OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED)', async () => {
      // Delivered
      const delRes = await fetch(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'DELIVERED' })
      });
      assert.equal(delRes.status, 200);

      // Completed
      const compRes = await fetch(`${baseUrl}/api/orders/${createdOrder.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(compRes.status, 200);
      const finalOrder = await compRes.json();
      assert.equal(finalOrder.status, 'COMPLETED');
    });
  });

  // =========================================================================
  // WORKFLOW 2: Consumer Booking from Start to Completion
  // =========================================================================
  describe('Workflow 2: Consumer Booking from Start to Completion', () => {
    let serviceProduct = null;
    let createdBooking = null;

    it('Step 1: Business creates a bookable service listing and configures availability', async () => {
      // Configure availability
      const availSet = await fetch(`${baseUrl}/api/business/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          openingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
          openingHours: '08:00 - 17:00',
          slotDuration: 60
        })
      });
      assert.equal(availSet.status, 200);

      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          name: `Cake Decorating Workshop ${timestamp}`,
          price: 250.00,
          category: 'Services',
          isService: true,
          duration: '60 min',
          desc: 'Hands-on pastry decoration'
        })
      });
      assert.equal(res.status, 201);
      serviceProduct = await res.json();
      assert.equal(serviceProduct.isService, true);
    });

    it('Step 2: Consumer checks availability calendar for target date', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/availability?date=2026-11-25`);
      assert.equal(res.status, 200);
      const avail = await res.json();
      assert.ok(Array.isArray(avail.slots));
      const targetSlot = avail.slots.find(s => s.time === '10:00');
      assert.ok(targetSlot, 'Slot 10:00 should exist in operating hours');
      assert.equal(targetSlot.available, true);
    });

    it('Step 3: Consumer books the appointment slot (PENDING)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          serviceId: serviceProduct.id,
          serviceName: serviceProduct.name,
          date: '2026-11-25',
          timeSlot: '10:00',
          servicePrice: serviceProduct.price,
          customerName: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          notes: 'Special dietary requests included'
        })
      });
      assert.equal(res.status, 201);
      createdBooking = await res.json();
      assert.ok(createdBooking.id);
      assert.equal(createdBooking.status.toUpperCase(), 'PENDING');
    });

    it('Step 4: Business confirms the appointment (PENDING -> CONFIRMED)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 200);
      const updated = await res.json();
      assert.equal(updated.status, 'CONFIRMED');

      // Verify availability endpoint now shows slot 10:00 as booked/unavailable
      const availCheck = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/availability?date=2026-11-25`);
      const availData = await availCheck.json();
      const bookedSlot = availData.slots.find(s => s.time === '10:00');
      assert.equal(bookedSlot.available, false);
      assert.equal(bookedSlot.isBooked, true);
    });

    it('Step 5: Service execution to completion (CONFIRMED -> IN_PROGRESS -> COMPLETED)', async () => {
      // In progress
      const progRes = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      assert.equal(progRes.status, 200);

      // Completed
      const compRes = await fetch(`${baseUrl}/api/bookings/${createdBooking.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(compRes.status, 200);
      const finalBooking = await compRes.json();
      assert.equal(finalBooking.status, 'COMPLETED');
    });
  });

  // =========================================================================
  // WORKFLOW 3: Business Registration to Approval
  // =========================================================================
  describe('Workflow 3: Business Registration to Approval Workflow', () => {
    let pendingStoreUser = null;
    let pendingMerchant = null;

    it('Step 1: New merchant registers business application', async () => {
      const regEmail = `new_applicant_${timestamp}@test.co.za`;
      const res = await fetch(`${baseUrl}/api/auth/register-business`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Themba Khumalo',
          email: regEmail,
          phone: '+27 82 888 7766',
          businessName: `Themba Traditional Braai ${timestamp}`,
          businessCategory: 'Food & Dining',
          password
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      pendingStoreUser = data.user;
      pendingMerchant = data.business;
      assert.equal(pendingMerchant.status, 'Pending');
      assert.equal(pendingMerchant.verified, false);
    });

    it('Step 2: Admin reviews KYC approval queue and verifies pending status', async () => {
      const res = await fetch(`${baseUrl}/api/admin/approvals`, {
        headers: { Authorization: `Bearer ${qaAdminToken}` }
      });
      assert.equal(res.status, 200);
      const approvals = await res.json();
      const match = approvals.find(a => a.name === pendingMerchant.name);
      assert.ok(match, 'Pending KYC approval should be present in admin queue');
      assert.equal(match.status, 'Pending');
    });

    it('Step 3: Admin approves the merchant store (Pending -> Approved, verified -> true)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/merchants/${pendingMerchant.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaAdminToken}`
        },
        body: JSON.stringify({ status: 'Approved', verified: true })
      });
      assert.equal(res.status, 200);
      const approved = await res.json();
      assert.equal(approved.status, 'Approved');
      assert.equal(approved.verified, true);

      // Verify the store is now live in the public directory
      const pubRes = await fetch(`${baseUrl}/api/merchants/${pendingMerchant.id}`);
      assert.equal(pubRes.status, 200);
      const liveMerchant = await pubRes.json();
      assert.equal(liveMerchant.status, 'Approved');
      assert.equal(liveMerchant.verified, true);
    });
  });

  // =========================================================================
  // WORKFLOW 4: Business Product Creation to Customer Purchase
  // =========================================================================
  describe('Workflow 4: Business Product Creation to Customer Purchase', () => {
    let testProduct = null;
    let purchaseOrder = null;

    it('Step 1: Business creates a retail product with stock 10', async () => {
      const res = await fetch(`${baseUrl}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          name: `Artisan Croissant Pack ${timestamp}`,
          price: 60.00,
          category: 'Bakery',
          stockCount: 10,
          inStock: true
        })
      });
      assert.equal(res.status, 201);
      testProduct = await res.json();
      assert.equal(testProduct.stockCount, 10);
    });

    it('Step 2: Product appears in public marketplace search query', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=${encodeURIComponent('Croissant')}`);
      assert.equal(res.status, 200);
      const results = await res.json();
      const match = results.products.find(p => p.id === testProduct.id);
      assert.ok(match, 'Created product should be discoverable via search');
    });

    it('Step 3: Customer purchases 4 units, verifying atomic stock decrement', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          deliveryType: 'collection',
          deliveryFee: 0,
          platformFee: 0,
          lines: [{ productId: testProduct.id, name: testProduct.name, price: testProduct.price, qty: 4 }]
        })
      });
      assert.equal(res.status, 201);
      purchaseOrder = await res.json();
      assert.equal(purchaseOrder.total, 240.00);

      // Verify stock in database is now 6
      const updatedProd = await prisma.product.findUnique({ where: { id: testProduct.id } });
      assert.equal(updatedProd.stockCount, 6);
    });

    it('Step 4: Reject order exceeding remaining available stock (requested 10, available 6)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          deliveryType: 'Pickup',
          lines: [{ productId: testProduct.id, name: testProduct.name, price: testProduct.price, qty: 10 }]
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /Insufficient stock/i);
    });
  });

  // =========================================================================
  // WORKFLOW 5: Payment Success Lifecycle
  // =========================================================================
  describe('Workflow 5: Payment Success Lifecycle', () => {
    let paymentOrder = null;
    let paymentRecord = null;

    before(async () => {
      const ordRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          deliveryType: 'Delivery',
          lines: [{ name: 'Payment Flow Item', price: 120.00, qty: 1 }]
        })
      });
      paymentOrder = await ordRes.json();
    });

    it('Step 1: Creates payment intent referencing order', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          orderId: paymentOrder.id,
          merchantId: qaBizMerchant.id,
          amount: 120.00,
          method: 'CARD'
        })
      });
      assert.equal(res.status, 201);
      paymentRecord = await res.json();
      assert.ok(paymentRecord.reference);
      assert.equal(paymentRecord.status, 'PENDING');
    });

    it('Step 2: Processes successful payment transaction', async () => {
      const res = await fetch(`${baseUrl}/api/payments/${paymentRecord.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          cardNumber: '4111111111111111',
          expiry: '12/28',
          cvv: '123'
        })
      });
      assert.equal(res.status, 200);
      const result = await res.json();
      assert.equal(result.status, 'SUCCESS');
      assert.ok(result.paidAt);

      // Verify associated order updated to Paid and ACCEPTED
      const updatedOrder = await prisma.order.findUnique({ where: { id: paymentOrder.id } });
      assert.equal(updatedOrder.paymentStatus, 'Paid');
      assert.equal(updatedOrder.status, 'ACCEPTED');
    });
  });

  // =========================================================================
  // WORKFLOW 6: Payment Failure Lifecycle
  // =========================================================================
  describe('Workflow 6: Payment Failure Lifecycle', () => {
    let failedOrder = null;
    let failedPaymentRecord = null;

    before(async () => {
      const ordRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          deliveryType: 'Delivery',
          lines: [{ name: 'Declined Flow Item', price: 80.00, qty: 1 }]
        })
      });
      failedOrder = await ordRes.json();
    });

    it('Step 1: Initiates payment intent', async () => {
      const res = await fetch(`${baseUrl}/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          orderId: failedOrder.id,
          merchantId: qaBizMerchant.id,
          amount: 80.00,
          method: 'CARD'
        })
      });
      assert.equal(res.status, 201);
      failedPaymentRecord = await res.json();
      assert.equal(failedPaymentRecord.status, 'PENDING');
    });

    it('Step 2: Simulates card decline via test card (...0002)', async () => {
      const res = await fetch(`${baseUrl}/api/payments/${failedPaymentRecord.id}/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          cardNumber: '4111111111110002', // Card decline test pattern
          expiry: '12/28',
          cvv: '123'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'FAILED');
      assert.match(data.failureReason, /declined/i);

      // Verify payment status is FAILED
      const pRecord = await prisma.payment.findUnique({ where: { id: failedPaymentRecord.id } });
      assert.equal(pRecord.status, 'FAILED');
      assert.match(pRecord.failureReason, /declined/i);

      // Crucial integrity check: Order remains in PENDING and paymentStatus is NOT Paid
      const oRecord = await prisma.order.findUnique({ where: { id: failedOrder.id } });
      assert.equal(oRecord.status, 'PENDING');
      assert.notEqual(oRecord.paymentStatus, 'Paid');
    });
  });

  // =========================================================================
  // WORKFLOW 7: Review After Completed Order
  // =========================================================================
  describe('Workflow 7: Review After Completed Order', () => {
    let reviewedOrder = null;
    let createdReview = null;

    before(async () => {
      // Create and complete an order
      const ordRes = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          businessName: qaBizMerchant.name,
          customer: qaConsumerUser.name,
          phone: qaConsumerUser.phone,
          deliveryType: 'Pickup',
          lines: [{ name: 'Reviewable Croissant', price: 30.00, qty: 1 }]
        })
      });
      reviewedOrder = await ordRes.json();
    });

    it('Step 1: Review attempt on non-completed order is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          orderId: reviewedOrder.id,
          rating: 5,
          comment: 'Premature review attempt'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /completed/i);
    });

    it('Step 2: Order reaches COMPLETED status', async () => {
      // Advance order through valid lifecycle: ACCEPTED -> PROCESSING -> READY -> OUT_FOR_DELIVERY -> DELIVERED -> COMPLETED
      const lifecycle = ['ACCEPTED', 'PROCESSING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'];
      for (const status of lifecycle) {
        const stepRes = await fetch(`${baseUrl}/api/orders/${reviewedOrder.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${qaBizToken}`
          },
          body: JSON.stringify({ status })
        });
        assert.equal(stepRes.status, 200);
      }
    });

    it('Step 3: Consumer submits verified 5-star review, updating merchant rating', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          orderId: reviewedOrder.id,
          rating: 5,
          comment: 'Best sourdough bread in town! Absolutely delicious.'
        })
      });
      assert.equal(res.status, 201);
      createdReview = await res.json();
      assert.equal(createdReview.rating, 5);
      assert.equal(createdReview.status, 'Approved');
      assert.ok(createdReview.ratingSummary);
      assert.ok(createdReview.ratingSummary.reviewCount >= 1);
    });

    it('Step 4: Business replies to consumer review', async () => {
      const res = await fetch(`${baseUrl}/api/business/reviews/${createdReview.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({ reply: 'Thank you for your wonderful support!' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.reply, 'Thank you for your wonderful support!');
    });

    it('Step 5: Duplicate review on the same completed transaction is rejected (400)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          orderId: reviewedOrder.id,
          rating: 5,
          comment: 'Second review attempt'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /already been submitted/i);
    });
  });

  // =========================================================================
  // API TESTS: Edge Cases, Valid/Invalid Requests, Missing Fields & Boundaries
  // =========================================================================
  describe('API Edge Cases, Input Validation & Boundary Values', () => {
    it('Missing fields: rejects registration with missing password (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `nopass_${Date.now()}@test.co.za`, name: 'No Pass' })
      });
      assert.equal(res.status, 400);
    });

    it('Missing fields: rejects order with empty lines array (400)', async () => {
      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          lines: []
        })
      });
      assert.equal(res.status, 400);
    });

    it('Missing fields: rejects booking without date or timeSlot (400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({
          merchantId: qaBizMerchant.id,
          customerName: 'Test'
        })
      });
      assert.equal(res.status, 400);
    });

    it('Invalid IDs: returns 404 for non-existent product ID', async () => {
      const res = await fetch(`${baseUrl}/api/products/p-nonexistent-99999`);
      assert.equal(res.status, 404);
    });

    it('Invalid IDs: returns 404 for non-existent order ID', async () => {
      const res = await fetch(`${baseUrl}/api/orders/LBZ-0000-NONEXISTENT`, {
        headers: { Authorization: `Bearer ${qaAdminToken}` }
      });
      assert.equal(res.status, 404);
    });

    it('Invalid IDs: returns 404 for non-existent booking ID', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/bkg-0000-NONEXISTENT`, {
        headers: { Authorization: `Bearer ${qaAdminToken}` }
      });
      assert.equal(res.status, 404);
    });

    it('Invalid IDs: returns 404 for non-existent merchant ID', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/b-nonexistent-99999`);
      assert.equal(res.status, 404);
    });

    it('Duplicate records: rejects duplicate email registration (400)', async () => {
      const res = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Duplicate Alice',
          email: qaConsumerEmail,
          password: 'Password123!'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /already exists/i);
    });

    it('Duplicate records: rejects duplicate promotion code under same business (409)', async () => {
      const promoCode = `PROMO_${Date.now()}`;
      // Create first promo
      const res1 = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          name: 'First Promo',
          code: promoCode,
          discountType: 'percentage',
          discountValue: 10
        })
      });
      assert.equal(res1.status, 201);

      // Attempt duplicate code
      const res2 = await fetch(`${baseUrl}/api/business/promotions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaBizToken}`
        },
        body: JSON.stringify({
          name: 'Second Promo',
          code: promoCode,
          discountType: 'percentage',
          discountValue: 15
        })
      });
      assert.equal(res2.status, 409);
    });

    it('Duplicate records: rejects duplicate favorite addition without toggle (409)', async () => {
      // Add favorite
      await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({ merchantId: qaBizMerchant.id })
      });

      // Attempt second addition without toggle: true
      const res = await fetch(`${baseUrl}/api/favourites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({ merchantId: qaBizMerchant.id })
      });
      assert.equal(res.status, 409);
      const data = await res.json();
      assert.match(data.error, /Duplicate favorite/i);
    });

    it('Boundary values: rejects rating of 0 (400)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({ rating: 0, comment: 'Boundary 0' })
      });
      assert.equal(res.status, 400);
    });

    it('Boundary values: rejects rating of 6 (400)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({ rating: 6, comment: 'Boundary 6' })
      });
      assert.equal(res.status, 400);
    });

    it('Boundary values: rejects non-integer rating 4.5 (400)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${qaBizMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${qaConsumerToken}`
        },
        body: JSON.stringify({ rating: 4.5, comment: 'Float rating' })
      });
      assert.equal(res.status, 400);
    });

    it('Boundary values: handles empty search query gracefully returning all items', async () => {
      const res = await fetch(`${baseUrl}/api/search?q=`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data);
    });

    it('Boundary values: respects pagination limits on merchants listing', async () => {
      const res = await fetch(`${baseUrl}/api/merchants?limit=2&page=1`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(data.merchants.length <= 2);
      assert.equal(data.page, 1);
      assert.equal(data.limit, 2);
    });
  });

});
