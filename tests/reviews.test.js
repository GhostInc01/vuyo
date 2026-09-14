import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { ratingService } from '../services/review/RatingService.js';

let server;
let baseUrl;

let consumerToken = '';
let consumerUser = null;

let consumer2Token = '';
let consumer2User = null;

let businessToken = '';
let businessUser = null;

let adminToken = '';
let adminUser = null;

let testMerchant = null;
let testOrderCompleted = null;
let testOrderPending = null;
let testBookingCompleted = null;
let testBookingPending = null;

before(async () => {
  // Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 1. Consumer 1 login (thandiwe@gmail.com)
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thandiwe@gmail.com', password: 'customer123' })
  });
  const cData = await cRes.json();
  consumerToken = cData.token;
  consumerUser = cData.user;

  // 2. Consumer 2 register/login (sipho@gmail.com)
  let c2Res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'sipho@gmail.com', password: 'customer123' })
  });
  if (!c2Res.ok) {
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sipho Zulu',
        email: 'sipho@gmail.com',
        password: 'customer123',
        role: 'consumer',
        phone: '0835559988'
      })
    });
    c2Res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sipho@gmail.com', password: 'customer123' })
    });
  }
  const c2Data = await c2Res.json();
  consumer2Token = c2Data.token;
  consumer2User = c2Data.user;

  // 3. Business login (nomsa@avoncorner.co.za)
  const bRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nomsa@avoncorner.co.za', password: 'merchant123' })
  });
  const bData = await bRes.json();
  businessToken = bData.token;
  businessUser = bData.user;

  // 4. Admin login (admin@localbiz.co.za)
  const aRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;

  // 5. Merchant for tests
  testMerchant = await prisma.merchant.findFirst({
    where: { ownerId: businessUser?.id || undefined }
  });
  if (!testMerchant) {
    testMerchant = await prisma.merchant.findFirst();
  }

  // 6. Create clean test transactions
  // Completed Order
  const orderId1 = `ord-rev-comp-${Date.now()}-1`;
  testOrderCompleted = await prisma.order.create({
    data: {
      id: orderId1,
      merchantId: testMerchant.id,
      businessName: testMerchant.name,
      userId: consumerUser.id,
      customer: consumerUser.name || 'Thandiwe',
      address: '12 Test Street',
      phone: consumerUser.phone || '0712345678',
      placedAt: 'Just now',
      total: 180,
      paymentMethod: 'Card',
      paymentStatus: 'Paid',
      status: 'Delivered',
      lines: {
        create: [
          { name: 'Test Cosmetic Item', price: 180, qty: 1 }
        ]
      }
    }
  });

  // Pending Order
  const orderId2 = `ord-rev-pend-${Date.now()}-2`;
  testOrderPending = await prisma.order.create({
    data: {
      id: orderId2,
      merchantId: testMerchant.id,
      businessName: testMerchant.name,
      userId: consumerUser.id,
      customer: consumerUser.name || 'Thandiwe',
      address: '12 Test Street',
      phone: consumerUser.phone || '0712345678',
      placedAt: 'Just now',
      total: 120,
      paymentMethod: 'Card',
      paymentStatus: 'Pending',
      status: 'Pending',
      lines: {
        create: [
          { name: 'Pending Order Item', price: 120, qty: 1 }
        ]
      }
    }
  });

  // Completed Booking
  testBookingCompleted = await prisma.booking.create({
    data: {
      merchantId: testMerchant.id,
      userId: consumerUser.id,
      customerName: consumerUser.name || 'Thandiwe',
      phone: consumerUser.phone || '0712345678',
      serviceName: 'Full Facial Consultation',
      servicePrice: 250,
      date: '2026-09-08',
      timeSlot: '14:00',
      status: 'COMPLETED',
      paymentStatus: 'Paid'
    }
  });

  // Pending Booking
  testBookingPending = await prisma.booking.create({
    data: {
      merchantId: testMerchant.id,
      userId: consumerUser.id,
      customerName: consumerUser.name || 'Thandiwe',
      phone: consumerUser.phone || '0712345678',
      serviceName: 'Hair Styling Session',
      servicePrice: 300,
      date: '2026-09-15',
      timeSlot: '10:00',
      status: 'CONFIRMED',
      paymentStatus: 'Pending'
    }
  });
});

after(async () => {
  if (server) {
    server.close();
  }
});

describe('Stage 11 — Verified Review System & Ratings Engine', () => {

  describe('1. Authentication & Consumer Authorization Rules', () => {
    it('rejects unauthenticated review submission with 401', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: 5,
          comment: 'Awesome service!',
          orderId: testOrderCompleted.id
        })
      });

      assert.strictEqual(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /Authentication required/i);
    });

    it('rejects review submission from non-consumer role (business owner) with 403', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Self review should fail',
          orderId: testOrderCompleted.id
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /Only consumer accounts/i);
    });

    it('rejects invalid ratings outside 1–5 (e.g. 0, 6, 3.5, string) with 400', async () => {
      // 0 rating
      let res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 0,
          comment: 'Invalid rating 0',
          orderId: testOrderCompleted.id
        })
      });
      assert.strictEqual(res.status, 400);

      // 6 rating
      res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 6,
          comment: 'Invalid rating 6',
          orderId: testOrderCompleted.id
        })
      });
      assert.strictEqual(res.status, 400);

      // Float 4.5 rating
      res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 4.5,
          comment: 'Invalid float rating',
          orderId: testOrderCompleted.id
        })
      });
      assert.strictEqual(res.status, 400);
    });
  });

  describe('2. Transaction Verification (Completed Orders & Bookings)', () => {
    it('rejects review on non-completed (Pending) order with 400', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Order is still pending',
          orderId: testOrderPending.id
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /completed/i);
    });

    it('rejects review on non-completed (CONFIRMED) booking with 400', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Booking is not completed yet',
          bookingId: testBookingPending.id
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /completed/i);
    });

    it('rejects review on transaction belonging to another consumer with 403', async () => {
      // Consumer 2 attempts to review Consumer 1's completed order
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer2Token}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Stealing review rights',
          orderId: testOrderCompleted.id
        })
      });

      assert.strictEqual(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /(Forbidden|Unauthorized|your own orders)/i);
    });

    it('successfully submits review for a COMPLETED order (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Fresh products and fast delivery in Alberton!',
          orderId: testOrderCompleted.id
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.rating, 5);
      assert.strictEqual(data.orderId, testOrderCompleted.id);
      assert.strictEqual(data.status, 'Approved');
      assert.ok(data.ratingSummary);
      assert.strictEqual(typeof data.ratingSummary.averageRating, 'number');
      assert.ok(data.ratingSummary.distribution);
    });

    it('rejects duplicate review on the same completed order with 400', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Second review on same order should be rejected',
          orderId: testOrderCompleted.id
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /(already reviewed|already been submitted|Duplicate review)/i);
    });

    it('successfully submits review for a COMPLETED booking (201 Created)', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 4,
          comment: 'Professional consultation, highly skilled therapist.',
          bookingId: testBookingCompleted.id
        })
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.rating, 4);
      assert.strictEqual(data.bookingId, testBookingCompleted.id);
      assert.ok(data.ratingSummary);
    });

    it('rejects duplicate review on the same completed booking with 400', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Second review on same booking',
          bookingId: testBookingCompleted.id
        })
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /(already reviewed|already been submitted|Duplicate review)/i);
    });
  });

  describe('3. Rating Engine & Star Distribution Calculation', () => {
    it('calculates average rating and star counts (1–5) correctly', async () => {
      const summary = await ratingService.calculateMerchantRating(testMerchant.id);

      assert.ok(summary.reviewCount >= 2);
      assert.ok(summary.averageRating >= 1 && summary.averageRating <= 5);
      assert.ok(summary.distribution);
      assert.strictEqual(typeof summary.distribution[1], 'number');
      assert.strictEqual(typeof summary.distribution[2], 'number');
      assert.strictEqual(typeof summary.distribution[3], 'number');
      assert.strictEqual(typeof summary.distribution[4], 'number');
      assert.strictEqual(typeof summary.distribution[5], 'number');

      // Verify the sum of counts matches reviewCount
      const totalCount = Object.values(summary.distribution).reduce((a, b) => a + b, 0);
      assert.strictEqual(totalCount, summary.reviewCount);

      // Verify merchant in DB was updated
      const updatedMerchant = await prisma.merchant.findUnique({
        where: { id: testMerchant.id }
      });
      assert.strictEqual(updatedMerchant.rating, summary.averageRating);
      assert.strictEqual(updatedMerchant.reviewCount, summary.reviewCount);
    });

    it('GET /api/merchants/:id/rating-summary returns exact breakdown', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/rating-summary`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(data.averageRating !== undefined);
      assert.ok(data.reviewCount !== undefined);
      assert.ok(data.distribution !== undefined);
      assert.ok(data.breakdown !== undefined);
      assert.strictEqual(data.merchantId, testMerchant.id);
    });

    it('GET /api/merchants/:id/reviews includes transaction details and rating summary', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`);
      assert.strictEqual(res.status, 200);

      const data = await res.json();
      assert.ok(Array.isArray(data.reviews));
      assert.ok(data.ratingSummary);

      const orderReview = data.reviews.find(r => r.orderId === testOrderCompleted.id);
      assert.ok(orderReview);
      assert.ok(orderReview.order);
      assert.strictEqual(orderReview.order.id, testOrderCompleted.id);

      const bookingReview = data.reviews.find(r => r.bookingId === testBookingCompleted.id);
      assert.ok(bookingReview);
      assert.ok(bookingReview.booking);
      assert.strictEqual(bookingReview.booking.id, testBookingCompleted.id);
    });
  });

  describe('4. Review Immutability & Business Role Protections', () => {
    it('businesses cannot modify customer reviews via PUT or PATCH (403 Forbidden)', async () => {
      // Find one review
      const review = await prisma.review.findFirst({
        where: { merchantId: testMerchant.id }
      });
      assert.ok(review);

      // 1. Direct PUT /api/reviews/:id
      let res = await fetch(`${baseUrl}/api/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({ rating: 5, comment: 'Hacked comment' })
      });
      assert.strictEqual(res.status, 403);

      // 2. Direct PATCH /api/reviews/:id
      res = await fetch(`${baseUrl}/api/reviews/${review.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({ rating: 5, comment: 'Hacked comment' })
      });
      assert.strictEqual(res.status, 403);

      // 3. Business route PUT /api/business/reviews/:id
      res = await fetch(`${baseUrl}/api/business/reviews/${review.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({ rating: 5, comment: 'Hacked comment' })
      });
      assert.strictEqual(res.status, 403);

      // 4. Business route DELETE /api/business/reviews/:id
      res = await fetch(`${baseUrl}/api/business/reviews/${review.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${businessToken}`
        }
      });
      assert.strictEqual(res.status, 403);
    });

    it('business owner can post an official response to a review (POST /api/business/reviews/:id/reply)', async () => {
      const review = await prisma.review.findFirst({
        where: { merchantId: testMerchant.id }
      });

      const res = await fetch(`${baseUrl}/api/business/reviews/${review.id}/reply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${businessToken}`
        },
        body: JSON.stringify({
          reply: 'Thank you for your valuable feedback! We look forward to serving you again.'
        })
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.match(data.reply, /Thank you for your valuable feedback/i);

      // Check DB updated
      const updated = await prisma.review.findUnique({ where: { id: review.id } });
      assert.strictEqual(updated.reply, 'Thank you for your valuable feedback! We look forward to serving you again.');
      assert.ok(updated.repliedAt);
    });
  });

  describe('5. Admin Moderation & Dynamic Rating Adjustment', () => {
    let createdModReview = null;

    before(async () => {
      // Create a third completed order for consumer 2 and leave a 1-star review
      const orderId3 = `ord-rev-comp-${Date.now()}-3`;
      const order3 = await prisma.order.create({
        data: {
          id: orderId3,
          merchantId: testMerchant.id,
          businessName: testMerchant.name,
          userId: consumer2User.id,
          customer: consumer2User.name || 'Sipho',
          address: '45 South St',
          phone: '0835559988',
          placedAt: 'Just now',
          total: 100,
          paymentMethod: 'Card',
          paymentStatus: 'Paid',
          status: 'Delivered'
        }
      });

      const rRes = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer2Token}`
        },
        body: JSON.stringify({
          rating: 1,
          comment: 'Inappropriate language and completely fake claims',
          orderId: order3.id
        })
      });
      createdModReview = await rRes.json();
    });

    it('admin can view all reviews including merchant and user details (GET /api/admin/reviews)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reviews`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const reviews = await res.json();
      assert.ok(Array.isArray(reviews));
      assert.ok(reviews.length > 0);
    });

    it('admin can flag a suspicious review and rating recalculates (PATCH /api/admin/reviews/:id/flag)', async () => {
      const prevSummary = await ratingService.calculateMerchantRating(testMerchant.id);

      const res = await fetch(`${baseUrl}/api/admin/reviews/${createdModReview.id}/flag`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Flagged');

      // The 1-star review is now flagged and excluded from approved ratings
      const newSummary = await ratingService.calculateMerchantRating(testMerchant.id);
      assert.strictEqual(newSummary.distribution[1], 0); // 1-star excluded
      assert.ok(newSummary.averageRating >= prevSummary.averageRating);
    });

    it('admin can approve a flagged review (PATCH /api/admin/reviews/:id/status)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reviews/${createdModReview.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'Approved' })
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.status, 'Approved');

      // Rating re-includes the 1-star review
      const summary = await ratingService.calculateMerchantRating(testMerchant.id);
      assert.strictEqual(summary.distribution[1], 1);
    });

    it('admin can permanently remove a review and rating recalculates (DELETE /api/admin/reviews/:id)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/reviews/${createdModReview.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.match(data.message, /removed/i);

      // Verify deletion in DB
      const deleted = await prisma.review.findUnique({ where: { id: createdModReview.id } });
      assert.strictEqual(deleted, null);

      // Recalculated rating excludes it
      const summary = await ratingService.calculateMerchantRating(testMerchant.id);
      assert.strictEqual(summary.distribution[1], 0);
    });

    it('admin dashboard includes platform rating metrics (GET /api/admin/dashboard)', async () => {
      const res = await fetch(`${baseUrl}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.ok(data.ratingMetrics);
      assert.strictEqual(typeof data.ratingMetrics.averageRating, 'number');
      assert.strictEqual(typeof data.ratingMetrics.reviewCount, 'number');
      assert.ok(data.ratingMetrics.distribution);
    });
  });

  describe('6. Notification Trigger on Review Submission', () => {
    it('creates an in-app notification for the merchant when a review is submitted', async () => {
      // Create a 4th completed order for consumer 2
      const orderId4 = `ord-rev-comp-${Date.now()}-4`;
      const order4 = await prisma.order.create({
        data: {
          id: orderId4,
          merchantId: testMerchant.id,
          businessName: testMerchant.name,
          userId: consumer2User.id,
          customer: consumer2User.name || 'Sipho',
          address: '45 South St',
          phone: '0835559988',
          placedAt: 'Just now',
          total: 150,
          paymentMethod: 'Card',
          paymentStatus: 'Paid',
          status: 'Delivered'
        }
      });

      // Submit review
      const rRes = await fetch(`${baseUrl}/api/merchants/${testMerchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer2Token}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Exceptional customer service and quick turnaround!',
          orderId: order4.id
        })
      });
      assert.strictEqual(rRes.status, 201);

      // Check merchant notifications
      const notifs = await prisma.notification.findMany({
        where: {
          OR: [
            { userId: testMerchant.ownerId },
            { role: 'business' }
          ],
          title: { contains: 'Review' }
        },
        orderBy: { createdAt: 'desc' }
      });

      assert.ok(notifs.length > 0);
      const latestReviewNotif = notifs[0];
      assert.match(latestReviewNotif.title, /Review/i);
    });
  });

});
