import { PrismaClient } from '@prisma/client';
import { PaymentProvider } from './PaymentProvider.js';
import { MockPaymentProvider } from './MockPaymentProvider.js';
import { notificationService } from '../notification/NotificationService.js';

const prisma = new PrismaClient();

// The 6 standard lifecycle states
export const PAYMENT_STATES = Object.freeze({
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  SUCCESS: 'SUCCESS',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
  CANCELLED: 'CANCELLED'
});

export class PaymentService {
  constructor() {
    this.providers = new Map();
    // Register default mock provider
    this.registerProvider('mock', new MockPaymentProvider('mock'));
    this.defaultProvider = 'mock';
  }

  /**
   * Registers a payment provider instance
   * Allows future gateways (PayFast, Stripe, Ozow, etc.) to be plugged in dynamically.
   * @param {string} name
   * @param {PaymentProvider} providerInstance
   */
  registerProvider(name, providerInstance) {
    if (!name || typeof name !== 'string') {
      throw new Error('Provider name must be a non-empty string');
    }
    if (!(providerInstance instanceof PaymentProvider)) {
      throw new TypeError(`Provider '${name}' must be an instance of PaymentProvider`);
    }
    this.providers.set(name.toLowerCase(), providerInstance);
  }

  /**
   * Retrieves a registered provider by name
   * @param {string} [name]
   * @returns {PaymentProvider}
   */
  getProvider(name) {
    const key = (name || this.defaultProvider).toLowerCase();
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`Payment provider '${name}' is not registered`);
    }
    return provider;
  }

  /**
   * Deep PCI-DSS Sanitizer
   * Strips Card Number (PAN), CVV, Card PIN, and Payment Passwords
   * from payloads, nested metadata, and logs.
   */
  sanitizeCardData(input = {}) {
    if (!input || typeof input !== 'object') return input;

    const sensitiveKeyPattern = /card.*num|pan|cvv|cvc|card.*pin|\bpin\b|password|secret|clientSecret/i;

    const sanitizeValue = (val) => {
      if (typeof val === 'string') {
        // Redact standalone 13-19 digit numeric PAN sequences
        return val.replace(/\b(?:\d[ -]*?){13,19}\b/g, '••••-••••-••••-••••');
      }
      if (Array.isArray(val)) {
        return val.map(sanitizeValue);
      }
      if (val && typeof val === 'object') {
        return sanitizeObj(val);
      }
      return val;
    };

    const sanitizeObj = (obj) => {
      const clean = {};
      for (const [k, v] of Object.entries(obj)) {
        if (sensitiveKeyPattern.test(k)) {
          continue; // drop sensitive key completely
        }
        clean[k] = sanitizeValue(v);
      }
      return clean;
    };

    // Extract safe metadata before removal
    const rawPan = String(input.cardNumber || input.pan || '').replace(/\D/g, '');
    let cardLast4 = input.cardLast4 || (rawPan ? rawPan.slice(-4) : null);
    let cardBrand = input.cardBrand || null;

    if (!cardBrand && rawPan) {
      if (rawPan.startsWith('4')) cardBrand = 'Visa';
      else if (rawPan.startsWith('5')) cardBrand = 'Mastercard';
      else if (rawPan.startsWith('3')) cardBrand = 'Amex';
      else cardBrand = 'Card';
    }

    const safe = sanitizeObj(input);
    if (cardLast4) safe.cardLast4 = cardLast4;
    if (cardBrand) safe.cardBrand = cardBrand;

    return safe;
  }


  /**
   * Validates state transitions across the 6 payment lifecycle states
   */
  isValidTransition(currentStatus, targetStatus) {
    const curr = (currentStatus || '').toUpperCase();
    const target = (targetStatus || '').toUpperCase();

    if (curr === target) return true;

    switch (curr) {
      case PAYMENT_STATES.PENDING:
        return [
          PAYMENT_STATES.PROCESSING,
          PAYMENT_STATES.SUCCESS,
          PAYMENT_STATES.FAILED,
          PAYMENT_STATES.CANCELLED
        ].includes(target);

      case PAYMENT_STATES.PROCESSING:
        return [
          PAYMENT_STATES.SUCCESS,
          PAYMENT_STATES.FAILED,
          PAYMENT_STATES.CANCELLED
        ].includes(target);

      case PAYMENT_STATES.SUCCESS:
        return [PAYMENT_STATES.REFUNDED].includes(target);

      case PAYMENT_STATES.FAILED:
      case PAYMENT_STATES.CANCELLED:
      case PAYMENT_STATES.REFUNDED:
        return false; // Terminal states

      default:
        return false;
    }
  }

  /**
   * Creates a payment intent associated with an Order OR a Booking
   */
  async createPayment(data, contextUser = null) {
    const {
      orderId,
      bookingId,
      amount,
      currency = 'ZAR',
      method = 'CARD',
      provider = this.defaultProvider,
      metadata = {}
    } = data;

    // Association Requirement: Must be associated with an Order OR a Booking
    if (!orderId && !bookingId) {
      throw new Error('Payment must be associated with either an orderId or a bookingId');
    }

    let resolvedOrderId = orderId || null;
    let resolvedBookingId = bookingId || null;
    let merchantId = data.merchantId || null;
    let userId = contextUser?.id || data.userId || null;
    let finalAmount = Number(amount);
    let customerDetails = { name: 'Local Customer', email: 'customer@localbiz.co.za' };

    // Resolve Order Association
    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { user: true }
      });
      if (!order) {
        throw new Error(`Order #${orderId} not found`);
      }
      merchantId = merchantId || order.merchantId;
      userId = userId || order.userId;
      if (isNaN(finalAmount) || finalAmount <= 0) {
        finalAmount = Number(order.total);
      }
      customerDetails = {
        name: order.customer,
        phone: order.phone,
        email: order.user?.email
      };
    }

    // Resolve Booking Association
    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { user: true }
      });
      if (!booking) {
        throw new Error(`Booking #${bookingId} not found`);
      }
      merchantId = merchantId || booking.merchantId;
      userId = userId || booking.userId;
      if (isNaN(finalAmount) || finalAmount <= 0) {
        finalAmount = Number(booking.servicePrice);
      }
      customerDetails = {
        name: booking.customerName,
        phone: booking.phone,
        email: booking.user?.email
      };
    }

    if (!finalAmount || finalAmount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    // Generate unique reference
    const entityPrefix = orderId ? 'ORD' : 'BKG';
    const entityIdShort = (orderId || bookingId).replace(/[^a-zA-Z0-9]/g, '').slice(-6);
    const reference = `PAY-${entityPrefix}-${entityIdShort}-${Date.now().toString().slice(-4)}`;

    // Sanitize any card inputs in metadata
    const safeData = this.sanitizeCardData(data);
    const safeMetadata = {
      ...this.sanitizeCardData(metadata),
      orderId: resolvedOrderId,
      bookingId: resolvedBookingId,
      customerName: customerDetails.name
    };

    // Initiate transaction with the designated payment provider
    const activeProvider = this.getProvider(provider);
    const gatewayResult = await activeProvider.createPayment({
      amount: finalAmount,
      currency,
      reference,
      customer: customerDetails,
      metadata: safeMetadata
    });

    // Create DB Payment record in PENDING state
    const payment = await prisma.payment.create({
      data: {
        reference,
        orderId: resolvedOrderId,
        bookingId: resolvedBookingId,
        userId: userId || null,
        merchantId: merchantId || null,
        amount: finalAmount,
        currency,
        method: method.toUpperCase(),
        provider: activeProvider.getName(),
        status: PAYMENT_STATES.PENDING,
        transactionId: gatewayResult.transactionId,
        cardBrand: safeData.cardBrand || null,
        cardLast4: safeData.cardLast4 || null,
        metadata: JSON.stringify(safeMetadata)
      },
      include: {
        order: true,
        booking: true
      }
    });

    return {
      ...payment,
      paymentUrl: gatewayResult.paymentUrl,
      redirectUrl: gatewayResult.redirectUrl
    };
  }

  /**
   * Processes a payment transaction and updates Order / Booking state
   * Enforces that failed payments NEVER mark orders as completed or accepted.
   */
  async processPayment(paymentId, options = {}, contextUser = null) {
    // 1. Locate payment
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { reference: paymentId },
          { transactionId: paymentId }
        ]
      },
      include: {
        order: { include: { merchant: true } },
        booking: { include: { merchant: true } },
        merchant: true
      }
    });

    if (!payment) {
      throw new Error(`Payment record '${paymentId}' not found`);
    }

    // 2. State machine validation
    if (payment.status === PAYMENT_STATES.SUCCESS) {
      return payment; // Idempotent success
    }
    if ([PAYMENT_STATES.FAILED, PAYMENT_STATES.CANCELLED, PAYMENT_STATES.REFUNDED].includes(payment.status)) {
      throw new Error(`Cannot process payment in terminal state '${payment.status}'`);
    }

    // 3. Mark as PROCESSING in database
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATES.PROCESSING }
    });

    // 4. Sanitize options to eliminate PAN/CVV/PIN
    const safeOptions = this.sanitizeCardData(options);

    // 5. Delegate execution to provider
    const provider = this.getProvider(payment.provider);
    const processResult = await provider.processPayment(payment.transactionId, {
      ...options, // Provider processes simulated inputs safely
      amount: payment.amount,
      currency: payment.currency
    });

    const targetStatus = (processResult.status || PAYMENT_STATES.FAILED).toUpperCase();

    if (!this.isValidTransition(PAYMENT_STATES.PROCESSING, targetStatus)) {
      throw new Error(`Invalid payment transition from PROCESSING to ${targetStatus}`);
    }

    // 6. Handle SUCCESS outcome
    if (targetStatus === PAYMENT_STATES.SUCCESS) {
      const updatedPayment = await prisma.$transaction(async (tx) => {
        // Update payment record
        const p = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PAYMENT_STATES.SUCCESS,
            paidAt: processResult.paidAt || new Date(),
            cardBrand: processResult.cardBrand || safeOptions.cardBrand || payment.cardBrand,
            cardLast4: processResult.cardLast4 || safeOptions.cardLast4 || payment.cardLast4,
            failureReason: null
          },
          include: { order: true, booking: true }
        });

        // Synchronize Order: set paymentStatus to 'Paid', advance status to ACCEPTED if PENDING
        if (payment.orderId) {
          const currentOrder = await tx.order.findUnique({ where: { id: payment.orderId } });
          if (currentOrder) {
            const nextStatus = currentOrder.status === 'PENDING' ? 'ACCEPTED' : currentOrder.status;
            await tx.order.update({
              where: { id: payment.orderId },
              data: {
                paymentStatus: 'Paid',
                status: nextStatus
              }
            });
          }
        }

        // Synchronize Booking: set paymentStatus to 'Paid', advance status to CONFIRMED if PENDING
        if (payment.bookingId) {
          const currentBooking = await tx.booking.findUnique({ where: { id: payment.bookingId } });
          if (currentBooking) {
            const nextBookingStatus = currentBooking.status === 'PENDING' ? 'CONFIRMED' : currentBooking.status;
            await tx.booking.update({
              where: { id: payment.bookingId },
              data: {
                paymentStatus: 'Paid',
                status: nextBookingStatus
              }
            });
          }
        }

        return p;
      });

      // Dispatch notifications to consumer and merchant
      const associatedSuccess = payment.order || payment.booking || {};
      await notificationService.notifyPaymentSuccess(updatedPayment, associatedSuccess).catch(() => {});
      if (associatedSuccess.merchant || payment.merchant) {
        await notificationService.notifyPaymentReceived(updatedPayment, associatedSuccess).catch(() => {});
      }

      return updatedPayment;
    }

    // 7. Handle FAILED outcome
    if (targetStatus === PAYMENT_STATES.FAILED) {
      const updatedPayment = await prisma.$transaction(async (tx) => {
        const p = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PAYMENT_STATES.FAILED,
            failureReason: processResult.failureReason || 'Payment failed',
            cardBrand: processResult.cardBrand || safeOptions.cardBrand || payment.cardBrand,
            cardLast4: processResult.cardLast4 || safeOptions.cardLast4 || payment.cardLast4
          },
          include: { order: true, booking: true }
        });

        // CRUCIAL: Failed payments must NOT mark orders or bookings as completed or accepted!
        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: 'Failed'
              // Order status stays PENDING - never ACCEPTED or COMPLETED
            }
          });
        }

        if (payment.bookingId) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: {
              paymentStatus: 'Failed'
              // Booking status stays PENDING - never CONFIRMED or COMPLETED
            }
          });
        }

        return p;
      });

      // Dispatch notification to consumer on payment failure
      const associatedFailed = payment.order || payment.booking || {};
      await notificationService.notifyPaymentFailed(updatedPayment, associatedFailed, updatedPayment.failureReason).catch(() => {});

      return updatedPayment;
    }

    // 8. Handle CANCELLED outcome
    if (targetStatus === PAYMENT_STATES.CANCELLED) {
      const updatedPayment = await prisma.$transaction(async (tx) => {
        const p = await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PAYMENT_STATES.CANCELLED,
            failureReason: 'Payment cancelled by customer'
          },
          include: { order: true, booking: true }
        });

        if (payment.orderId) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { paymentStatus: 'Cancelled' }
          });
        }

        if (payment.bookingId) {
          await tx.booking.update({
            where: { id: payment.bookingId },
            data: { paymentStatus: 'Cancelled' }
          });
        }

        return p;
      });

      return updatedPayment;
    }

    throw new Error(`Unhandled payment result status: ${targetStatus}`);
  }

  /**
   * Processes a refund for a settled payment
   */
  async refundPayment(paymentId, options = {}, contextUser = null) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { reference: paymentId },
          { transactionId: paymentId }
        ]
      }
    });

    if (!payment) {
      throw new Error(`Payment record '${paymentId}' not found`);
    }

    if (payment.status !== PAYMENT_STATES.SUCCESS) {
      throw new Error(`Cannot refund payment in status '${payment.status}'. Only SUCCESS payments can be refunded.`);
    }

    // Authorization check
    if (!contextUser) {
      throw new Error('Authentication required: Please sign in to issue refunds');
    }
    if (contextUser.role === 'consumer') {
      throw new Error('Forbidden: Consumers cannot issue refunds directly');
    }
    if (contextUser.role === 'business' && payment.merchantId && contextUser.merchantId !== payment.merchantId) {
      throw new Error('Forbidden: You can only refund payments for your own business');
    }

    // Refund amount validation
    const refundAmount = options.amount !== undefined ? Number(options.amount) : payment.amount;
    if (isNaN(refundAmount) || refundAmount <= 0) {
      throw new Error('Refund amount must be greater than 0');
    }
    if (refundAmount > payment.amount) {
      throw new Error(`Refund amount (R${refundAmount.toFixed(2)}) cannot exceed original payment amount of R${payment.amount.toFixed(2)}`);
    }

    const provider = this.getProvider(payment.provider);
    const refundResult = await provider.refundPayment(payment.transactionId, {
      amount: refundAmount,
      reason: options.reason || 'Customer request'
    });

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: PAYMENT_STATES.REFUNDED,
          refundedAt: refundResult.refundedAt || new Date(),
          failureReason: options.reason ? `Refunded: ${options.reason}` : 'Refunded'
        },
        include: { order: true, booking: true }
      });

      if (payment.orderId) {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { paymentStatus: 'Refunded' }
        });
      }

      if (payment.bookingId) {
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: { paymentStatus: 'Refunded' }
        });
      }

      return p;
    });

    return updatedPayment;
  }

  /**
   * Retrieves single payment with RBAC enforcement
   */
  async getPaymentById(paymentId, contextUser = null) {
    const payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { id: paymentId },
          { reference: paymentId },
          { transactionId: paymentId }
        ]
      },
      include: {
        order: {
          include: { lines: true }
        },
        booking: true,
        user: {
          select: { id: true, name: true, email: true, phone: true }
        },
        merchant: {
          select: { id: true, name: true, phone: true, suburb: true }
        }
      }
    });

    if (!payment) return null;

    // RBAC Authorization Guard
    if (!contextUser) {
      throw new Error('Authentication required: Please sign in to view payment records');
    }
    if (contextUser.role !== 'admin') {
      if (contextUser.role === 'consumer' && payment.userId && payment.userId !== contextUser.id) {
        throw new Error('Forbidden: You can only view your own payments');
      }
      if (contextUser.role === 'business' && payment.merchantId && payment.merchantId !== contextUser.merchantId) {
        throw new Error('Forbidden: You can only view payments for your business');
      }
    }

    return payment;
  }

  /**
   * Lists payments with role-based scoping and filtering
   */
  async listPayments(filters = {}, contextUser = null) {
    if (!contextUser) {
      throw new Error('Authentication required: Please sign in to view payment records');
    }

    const where = {};

    // Scoping by user role
    if (contextUser.role === 'consumer') {
      where.userId = contextUser.id;
    } else if (contextUser.role === 'business') {
      where.merchantId = contextUser.merchantId || '__unassigned__';
    }
    // Admins see all platform payments

    // Explicit filters
    if (filters.userId && contextUser.role === 'admin') {
      where.userId = filters.userId;
    }
    if (filters.merchantId && contextUser.role === 'admin') {
      where.merchantId = filters.merchantId;
    }
    if (filters.orderId) {
      where.orderId = filters.orderId;
    }
    if (filters.bookingId) {
      where.bookingId = filters.bookingId;
    }
    if (filters.status) {
      where.status = filters.status.toUpperCase();
    }

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { id: true, businessName: true, total: true, status: true }
        },
        booking: {
          select: { id: true, serviceName: true, servicePrice: true, status: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    return payments;
  }

  /**
   * Processes asynchronous gateway webhooks (IPN)
   */
  async handleWebhook(providerName, payload, headers = {}) {
    const provider = this.getProvider(providerName);
    const verification = await provider.verifyWebhook(payload, headers);
    if (!verification.isValid) {
      throw new Error(`Webhook validation failed for provider '${providerName}'`);
    }

    if (verification.transactionId && verification.status) {
      return this.processPayment(verification.transactionId, {
        forceOutcome: verification.status,
        ...payload
      });
    }

    return verification;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export default paymentService;
