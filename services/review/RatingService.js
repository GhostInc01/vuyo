import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * RatingService
 * Central domain service for review ratings, distribution calculations,
 * transaction eligibility enforcement, and administrative moderation analytics.
 */
export class RatingService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Recalculates and persists rating metrics for a given merchant
   * Only reviews with status === 'Approved' contribute to public rating and counts.
   *
   * @param {string} merchantId
   * @param {PrismaClient} [tx] - Optional transaction client
   * @returns {Promise<{ merchantId: string, averageRating: number, reviewCount: number, distribution: Object, breakdown: Object }>}
   */
  async calculateMerchantRating(merchantId, tx = this.prisma) {
    if (!merchantId) {
      throw new Error('merchantId is required to calculate ratings');
    }

    const reviews = await tx.review.findMany({
      where: {
        merchantId,
        status: 'Approved'
      },
      select: { rating: true }
    });

    const reviewCount = reviews.length;
    const distribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    let totalScore = 0;
    for (const rev of reviews) {
      const star = Math.min(Math.max(Number(rev.rating) || 1, 1), 5);
      distribution[star] = (distribution[star] || 0) + 1;
      totalScore += star;
    }

    const averageRating = reviewCount > 0
      ? Number((totalScore / reviewCount).toFixed(1))
      : 0;

    const breakdown = {};
    for (let s = 1; s <= 5; s++) {
      const count = distribution[s] || 0;
      const percentage = reviewCount > 0
        ? Math.round((count / reviewCount) * 100)
        : 0;
      breakdown[s] = { count, percentage };
    }

    // Persist updated average rating and count to the merchant record
    await tx.merchant.update({
      where: { id: merchantId },
      data: {
        rating: averageRating,
        reviewCount
      }
    });

    return {
      merchantId,
      averageRating,
      reviewCount,
      distribution,
      breakdown
    };
  }

  /**
   * Validates review eligibility against all Stage 11 rules:
   * 1. Only authenticated consumers can review
   * 2. Only users with completed transactions can review (order or booking)
   * 3. One review per transaction (duplicate prevention)
   * 4. Transaction ownership & merchant match
   *
   * @param {Object} user - Authenticated user { id, role, name }
   * @param {string} merchantId - Target merchant ID
   * @param {Object} payload - { orderId, bookingId, rating, comment }
   * @param {PrismaClient} [tx]
   */
  async verifyReviewEligibility(user, merchantId, payload = {}, tx = this.prisma) {
    // 1. Authenticated check
    if (!user || !user.id) {
      const err = new Error('Authentication required: Please sign in as a consumer to leave a review');
      err.statusCode = 401;
      throw err;
    }

    // 2. Role check: only consumers can review
    if (user.role && user.role !== 'consumer') {
      const err = new Error('Forbidden: Only consumer accounts can review local businesses');
      err.statusCode = 403;
      throw err;
    }

    // 3. Rating validation: 1 to 5 integer
    const numRating = Number(payload.rating);
    if (!numRating || isNaN(numRating) || numRating < 1 || numRating > 5 || !Number.isInteger(numRating)) {
      const err = new Error('Rating must be an integer between 1 and 5');
      err.statusCode = 400;
      throw err;
    }

    let resolvedOrderId = payload.orderId ? String(payload.orderId).trim() : null;
    let resolvedBookingId = payload.bookingId ? String(payload.bookingId).trim() : null;

    // If neither orderId nor bookingId provided, look for an unreviewed completed transaction
    if (!resolvedOrderId && !resolvedBookingId) {
      // Look for completed order first
      const completedOrder = await tx.order.findFirst({
        where: {
          userId: user.id,
          merchantId,
          status: { in: ['COMPLETED', 'Completed', 'Delivered', 'DELIVERED'] },
          reviews: { none: {} }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (completedOrder) {
        resolvedOrderId = completedOrder.id;
      } else {
        // Look for completed booking
        const completedBooking = await tx.booking.findFirst({
          where: {
            userId: user.id,
            merchantId,
            status: 'COMPLETED',
            reviews: { none: {} }
          },
          orderBy: { createdAt: 'desc' }
        });

        if (completedBooking) {
          resolvedBookingId = completedBooking.id;
        }
      }
    }

    // If still no transaction found, reject
    if (!resolvedOrderId && !resolvedBookingId) {
      const err = new Error('Reviews require a verified COMPLETED order or booking from this business');
      err.statusCode = 400;
      throw err;
    }

    // 4. Validate Order transaction if resolved
    if (resolvedOrderId) {
      const order = await tx.order.findUnique({
        where: { id: resolvedOrderId },
        select: { id: true, userId: true, merchantId: true, status: true }
      });

      if (!order) {
        const err = new Error(`Order #${resolvedOrderId} not found`);
        err.statusCode = 404;
        throw err;
      }

      if (order.userId !== user.id) {
        const err = new Error('Forbidden: You can only review your own orders');
        err.statusCode = 403;
        throw err;
      }

      if (order.merchantId !== merchantId) {
        const err = new Error('Order does not match the target business');
        err.statusCode = 400;
        throw err;
      }

      const normStatus = (order.status || '').toUpperCase();
      if (normStatus !== 'COMPLETED' && normStatus !== 'DELIVERED') {
        const err = new Error(`Cannot review order: Order must be COMPLETED or Delivered (current status: ${order.status})`);
        err.statusCode = 400;
        throw err;
      }

      // Check duplicate review
      const existingReview = await tx.review.findFirst({
        where: { orderId: resolvedOrderId }
      });

      if (existingReview) {
        const err = new Error('Duplicate review: A review has already been submitted for this order');
        err.statusCode = 400;
        throw err;
      }

      return {
        valid: true,
        orderId: resolvedOrderId,
        bookingId: null,
        transactionType: 'ORDER'
      };
    }

    // 5. Validate Booking transaction if resolved
    if (resolvedBookingId) {
      const booking = await tx.booking.findUnique({
        where: { id: resolvedBookingId },
        select: { id: true, userId: true, merchantId: true, status: true }
      });

      if (!booking) {
        const err = new Error(`Booking #${resolvedBookingId} not found`);
        err.statusCode = 404;
        throw err;
      }

      if (booking.userId !== user.id) {
        const err = new Error('Forbidden: You can only review your own bookings');
        err.statusCode = 403;
        throw err;
      }

      if (booking.merchantId !== merchantId) {
        const err = new Error('Booking does not match the target business');
        err.statusCode = 400;
        throw err;
      }

      const normStatus = (booking.status || '').toUpperCase();
      if (normStatus !== 'COMPLETED') {
        const err = new Error(`Cannot review booking: Booking must be COMPLETED (current status: ${booking.status})`);
        err.statusCode = 400;
        throw err;
      }

      // Check duplicate review
      const existingReview = await tx.review.findFirst({
        where: { bookingId: resolvedBookingId }
      });

      if (existingReview) {
        const err = new Error('Duplicate review: A review has already been submitted for this booking');
        err.statusCode = 400;
        throw err;
      }

      return {
        valid: true,
        orderId: null,
        bookingId: resolvedBookingId,
        transactionType: 'BOOKING'
      };
    }

    const err = new Error('Invalid transaction specification');
    err.statusCode = 400;
    throw err;
  }

  /**
   * Aggregates platform-wide rating and review statistics for the Super Admin dashboard
   * @param {PrismaClient} [tx]
   */
  async getPlatformRatingMetrics(tx = this.prisma) {
    const allReviews = await tx.review.findMany({
      select: { rating: true, status: true }
    });

    const totalReviews = allReviews.length;
    const approvedReviews = allReviews.filter(r => r.status === 'Approved');
    const flaggedReviews = allReviews.filter(r => r.status === 'Flagged');
    const hiddenReviews = allReviews.filter(r => r.status === 'Hidden');

    const starDistribution = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0
    };

    let approvedSum = 0;
    for (const r of approvedReviews) {
      const star = Math.min(Math.max(Number(r.rating) || 1, 1), 5);
      starDistribution[star] = (starDistribution[star] || 0) + 1;
      approvedSum += star;
    }

    const averageRating = approvedReviews.length > 0
      ? Number((approvedSum / approvedReviews.length).toFixed(1))
      : 0;

    return {
      totalReviews,
      reviewCount: totalReviews,
      approvedCount: approvedReviews.length,
      flaggedCount: flaggedReviews.length,
      hiddenCount: hiddenReviews.length,
      averageRating,
      starDistribution,
      distribution: starDistribution
    };
  }
}

export const ratingService = new RatingService();
