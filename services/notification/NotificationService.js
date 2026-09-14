import { NotificationChannelProvider } from './NotificationChannelProvider.js';
import { InAppNotificationProvider } from './InAppNotificationProvider.js';
import { EmailNotificationProvider } from './EmailNotificationProvider.js';
import { SmsNotificationProvider } from './SmsNotificationProvider.js';
import { PushNotificationProvider } from './PushNotificationProvider.js';
import { WhatsAppNotificationProvider } from './WhatsAppNotificationProvider.js';

/**
 * NotificationService
 * Central notification orchestrator.
 * Manages registered channel providers, dispatches multi-channel notifications asynchronously,
 * and encapsulates typed domain event handlers for Consumer, Business, and Admin events.
 */
export class NotificationService {
  constructor() {
    this.channels = new Map();

    // Register built-in default providers
    this.registerChannel('in_app', new InAppNotificationProvider('in_app'));
    this.registerChannel('email', new EmailNotificationProvider('mock_email'));
    this.registerChannel('sms', new SmsNotificationProvider('mock_sms'));
    this.registerChannel('push', new PushNotificationProvider('mock_push'));
    this.registerChannel('whatsapp', new WhatsAppNotificationProvider('mock_whatsapp'));
  }

  /**
   * Registers or replaces a notification channel provider
   * @param {string} name
   * @param {NotificationChannelProvider} provider
   */
  registerChannel(name, provider) {
    if (!name || typeof name !== 'string') {
      throw new Error('Channel name must be a non-empty string');
    }
    if (!(provider instanceof NotificationChannelProvider)) {
      throw new TypeError(`Provider must be an instance of NotificationChannelProvider`);
    }
    this.channels.set(name.toLowerCase(), provider);
  }

  /**
   * Retrieves a channel provider by name
   * @param {string} name
   * @returns {NotificationChannelProvider}
   */
  getChannel(name) {
    const provider = this.channels.get(name.toLowerCase());
    if (!provider) {
      throw new Error(`Notification channel '${name}' is not registered`);
    }
    return provider;
  }

  /**
   * Returns list of all registered channel names
   * @returns {string[]}
   */
  listChannels() {
    return Array.from(this.channels.keys());
  }

  /**
   * Core dispatcher: dispatches a notification payload to one or more channels
   * Defaults to ['in_app']. Uses Promise.allSettled so secondary channel errors
   * never crash or rollback the caller.
   *
   * @param {Object} payload
   * @param {Object} [options]
   * @param {string[]} [options.channels=['in_app']]
   * @returns {Promise<{ results: Array, successfulChannels: string[], failedChannels: string[] }>}
   */
  async notify(payload, options = {}) {
    const targetChannels = (options.channels && options.channels.length > 0)
      ? options.channels
      : ['in_app'];

    const dispatchPromises = targetChannels.map(async (channelName) => {
      const channel = this.channels.get(channelName.toLowerCase());
      if (!channel) {
        return { success: false, channel: channelName, error: `Channel '${channelName}' not registered` };
      }
      try {
        return await channel.send(payload);
      } catch (err) {
        return { success: false, channel: channelName, error: err.message };
      }
    });

    const settled = await Promise.allSettled(dispatchPromises);
    const results = settled.map(s => s.status === 'fulfilled' ? s.value : { success: false, error: s.reason });

    const successfulChannels = results.filter(r => r.success).map(r => r.channel);
    const failedChannels = results.filter(r => !r.success).map(r => r.channel);

    return {
      results,
      successfulChannels,
      failedChannels
    };
  }

  // =========================================================================
  // CONSUMER NOTIFICATION TRIGGERS (12 Required Events)
  // =========================================================================

  /**
   * 1. Consumer Registration
   */
  async notifyConsumerRegistration(user, options = {}) {
    return this.notify({
      userId: user.id,
      recipient: user.email,
      role: 'consumer',
      title: 'Welcome to LocalBiz!',
      message: `Welcome to LocalBiz, ${user.name}! Discover verified local shops, order fresh goods, or book community services in your neighbourhood.`,
      type: 'system',
      link: '/marketplace',
      metadata: { userId: user.id, email: user.email }
    }, options);
  }

  /**
   * 2. Order Created (Consumer confirmation)
   */
  async notifyOrderCreated(order, merchant, options = {}) {
    const formattedTotal = Number(order.total || 0).toFixed(2);
    const merchantName = merchant?.name || order.businessName || 'LocalBiz Merchant';
    return this.notify({
      userId: order.userId,
      recipient: order.phone,
      role: 'consumer',
      title: 'Order Placed Successfully',
      message: `Your order #${order.id} for R${formattedTotal} at ${merchantName} has been received and is awaiting confirmation.`,
      type: 'order',
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, merchantId: order.merchantId, total: order.total }
    }, options);
  }

  /**
   * 3. Order Accepted
   */
  async notifyOrderAccepted(order, merchant, options = {}) {
    const merchantName = merchant?.name || order.businessName || 'Merchant';
    return this.notify({
      userId: order.userId,
      role: 'consumer',
      title: 'Order Accepted',
      message: `${merchantName} has accepted your order #${order.id} and is preparing it.`,
      type: 'order',
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, status: 'ACCEPTED' }
    }, options);
  }

  /**
   * 4. Order Rejected
   */
  async notifyOrderRejected(order, merchant, reason = '', options = {}) {
    const merchantName = merchant?.name || order.businessName || 'Merchant';
    const reasonText = reason ? ` Reason: ${reason}` : '';
    return this.notify({
      userId: order.userId,
      role: 'consumer',
      title: 'Order Rejected',
      message: `${merchantName} could not fulfill your order #${order.id}.${reasonText} Any charged amounts have been automatically restored.`,
      type: 'order',
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, status: 'REJECTED', reason }
    }, options);
  }

  /**
   * 5. Order Status Changed (PROCESSING, READY, OUT_FOR_DELIVERY)
   */
  async notifyOrderStatusChanged(order, previousStatus, newStatus, options = {}) {
    const merchantName = merchantNameOrFallback(order);
    const humanStatus = newStatus.toLowerCase().replace(/_/g, ' ');
    return this.notify({
      userId: order.userId,
      role: 'consumer',
      title: `Order Status: ${newStatus}`,
      message: `Order #${order.id} from ${merchantName} is now ${humanStatus}.`,
      type: 'order',
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, previousStatus, newStatus }
    }, options);
  }

  /**
   * 6. Payment Successful
   */
  async notifyPaymentSuccess(payment, orderOrBooking = {}, options = {}) {
    const formattedAmount = Number(payment.amount || 0).toFixed(2);
    const targetLabel = payment.orderId ? `Order #${payment.orderId}` : payment.bookingId ? `Booking #${payment.bookingId}` : payment.reference;
    return this.notify({
      userId: payment.userId || orderOrBooking?.userId,
      role: 'consumer',
      title: 'Payment Successful',
      message: `Your payment of R${formattedAmount} for ${targetLabel} was processed successfully. Reference: ${payment.reference}.`,
      type: 'payment',
      link: payment.orderId ? `/orders/${payment.orderId}` : payment.bookingId ? `/bookings/${payment.bookingId}` : '/payments',
      metadata: { paymentId: payment.id, reference: payment.reference, amount: payment.amount }
    }, options);
  }

  /**
   * 7. Payment Failed
   */
  async notifyPaymentFailed(payment, orderOrBooking = {}, reason = 'Payment declined', options = {}) {
    const formattedAmount = Number(payment.amount || 0).toFixed(2);
    const targetLabel = payment.orderId ? `Order #${payment.orderId}` : payment.bookingId ? `Booking #${payment.bookingId}` : payment.reference;
    return this.notify({
      userId: payment.userId || orderOrBooking?.userId,
      role: 'consumer',
      title: 'Payment Failed',
      message: `Payment of R${formattedAmount} for ${targetLabel} could not be processed. ${reason}. Please update your payment details.`,
      type: 'payment',
      link: payment.orderId ? `/orders/${payment.orderId}` : payment.bookingId ? `/bookings/${payment.bookingId}` : '/payments',
      metadata: { paymentId: payment.id, reference: payment.reference, failureReason: reason }
    }, options);
  }

  /**
   * 8. Booking Confirmed
   */
  async notifyBookingConfirmed(booking, merchant, options = {}) {
    const merchantName = merchant?.name || 'LocalBiz Provider';
    return this.notify({
      userId: booking.userId,
      role: 'consumer',
      title: 'Booking Confirmed',
      message: `Your appointment for "${booking.serviceName}" with ${merchantName} on ${booking.date} at ${booking.timeSlot} is confirmed.`,
      type: 'booking',
      link: `/bookings/${booking.id}`,
      metadata: { bookingId: booking.id, date: booking.date, timeSlot: booking.timeSlot }
    }, options);
  }

  /**
   * 9. Booking Rejected
   */
  async notifyBookingRejected(booking, merchant, reason = '', options = {}) {
    const merchantName = merchant?.name || 'LocalBiz Provider';
    const reasonText = reason ? ` Reason: ${reason}` : '';
    return this.notify({
      userId: booking.userId,
      role: 'consumer',
      title: 'Booking Rejected',
      message: `${merchantName} was unable to accept your booking for "${booking.serviceName}" on ${booking.date}.${reasonText}`,
      type: 'booking',
      link: `/bookings/${booking.id}`,
      metadata: { bookingId: booking.id, status: 'REJECTED', reason }
    }, options);
  }

  /**
   * 10. Booking Changed / Rescheduled
   */
  async notifyBookingChanged(booking, details = {}, options = {}) {
    const newDate = details.newDate || booking.date;
    const newTime = details.newTime || booking.timeSlot;
    return this.notify({
      userId: booking.userId,
      role: 'consumer',
      title: 'Booking Rescheduled',
      message: `Your appointment for "${booking.serviceName}" has been rescheduled to ${newDate} at ${newTime}.`,
      type: 'booking',
      link: `/bookings/${booking.id}`,
      metadata: { bookingId: booking.id, newDate, newTime }
    }, options);
  }

  /**
   * 11. Order Completed
   */
  async notifyOrderCompleted(order, merchant, options = {}) {
    const merchantName = merchantNameOrFallback(order);
    return this.notify({
      userId: order.userId,
      role: 'consumer',
      title: 'Order Completed',
      message: `Order #${order.id} from ${merchantName} has been delivered / completed. Thank you for supporting your local economy!`,
      type: 'order',
      link: `/orders/${order.id}`,
      metadata: { orderId: order.id, status: 'COMPLETED' }
    }, options);
  }

  /**
   * 12. Review Reminder
   */
  async notifyReviewReminder(user, orderOrBooking, options = {}) {
    const merchantName = orderOrBooking.businessName || orderOrBooking.merchant?.name || 'your local merchant';
    const merchantId = orderOrBooking.merchantId || orderOrBooking.merchant?.id;
    return this.notify({
      userId: user?.id || orderOrBooking.userId,
      role: 'consumer',
      title: 'How was your experience?',
      message: `We hope you enjoyed your experience with ${merchantName}! Tap here to leave a review and support your neighbourhood community.`,
      type: 'review',
      link: merchantId ? `/merchants/${merchantId}?review=true` : '/reviews',
      metadata: { merchantId, orderId: orderOrBooking.id }
    }, options);
  }

  // =========================================================================
  // BUSINESS NOTIFICATION TRIGGERS (5 Required Events)
  // =========================================================================

  /**
   * 1. New Order
   */
  async notifyNewOrder(order, merchant, options = {}) {
    const formattedTotal = Number(order.total || 0).toFixed(2);
    const ownerUserId = merchant?.ownerId || null;
    return this.notify({
      userId: ownerUserId,
      role: 'business',
      title: 'New Order Received',
      message: `New order #${order.id} received from ${order.customer} for R${formattedTotal}.`,
      type: 'order',
      link: `/business/orders?id=${order.id}`,
      metadata: { orderId: order.id, total: order.total, customer: order.customer }
    }, options);
  }

  /**
   * 2. New Booking
   */
  async notifyNewBooking(booking, merchant, options = {}) {
    const ownerUserId = merchant?.ownerId || null;
    return this.notify({
      userId: ownerUserId,
      role: 'business',
      title: 'New Appointment Booking',
      message: `${booking.customerName} booked "${booking.serviceName}" on ${booking.date} at ${booking.timeSlot}.`,
      type: 'booking',
      link: `/business/bookings?id=${booking.id}`,
      metadata: { bookingId: booking.id, date: booking.date, timeSlot: booking.timeSlot }
    }, options);
  }

  /**
   * 3. Payment Received
   */
  async notifyPaymentReceived(payment, orderOrBooking = {}, options = {}) {
    const formattedAmount = Number(payment.amount || 0).toFixed(2);
    const targetLabel = payment.orderId ? `Order #${payment.orderId}` : payment.bookingId ? `Booking #${payment.bookingId}` : payment.reference;
    return this.notify({
      userId: orderOrBooking.merchant?.ownerId || null,
      role: 'business',
      title: 'Payment Received',
      message: `Payment of R${formattedAmount} was received for ${targetLabel}.`,
      type: 'payment',
      link: '/business/payments',
      metadata: { paymentId: payment.id, amount: payment.amount, reference: payment.reference }
    }, options);
  }

  /**
   * 4. Cancellation (Customer cancels order or appointment)
   */
  async notifyCancellation(entityType, entity, cancelledBy = 'Customer', reason = '', options = {}) {
    const ownerUserId = entity.merchant?.ownerId || null;
    const isOrder = entityType.toLowerCase() === 'order';
    const entityLabel = isOrder ? `Order #${entity.id}` : `Booking #${entity.id}`;
    const reasonText = reason ? ` (Reason: ${reason})` : '';

    return this.notify({
      userId: ownerUserId,
      role: 'business',
      title: `${isOrder ? 'Order' : 'Booking'} Cancelled`,
      message: `${cancelledBy} cancelled ${entityLabel}${reasonText}.`,
      type: isOrder ? 'order' : 'booking',
      link: isOrder ? `/business/orders?id=${entity.id}` : `/business/bookings?id=${entity.id}`,
      metadata: { entityType, entityId: entity.id, cancelledBy, reason }
    }, options);
  }

  /**
   * 5. New Review
   */
  async notifyNewReview(review, merchant, options = {}) {
    const ownerUserId = merchant?.ownerId || null;
    const merchantName = merchant?.name || 'Store';
    return this.notify({
      userId: ownerUserId,
      role: 'business',
      title: `New Review (${review.rating} Stars)`,
      message: `${review.userName} left a ${review.rating}-star review for ${merchantName}: "${(review.comment || '').slice(0, 70)}..."`,
      type: 'review',
      link: `/business/reviews`,
      metadata: { reviewId: review.id, rating: review.rating, userName: review.userName }
    }, options);
  }

  // =========================================================================
  // ADMIN NOTIFICATION TRIGGERS (3 Required Events)
  // =========================================================================

  /**
   * 1. New Business Registration
   */
  async notifyNewBusinessRegistration(merchant, owner = {}, options = {}) {
    return this.notify({
      role: 'admin',
      title: 'New Business Registration',
      message: `New merchant "${merchant.name}" registered by ${owner.name || merchant.owner || 'Applicant'} in ${merchant.suburb || 'Gauteng'} and is awaiting verification.`,
      type: 'approval',
      link: '/admin/approvals',
      metadata: { merchantId: merchant.id, merchantName: merchant.name }
    }, options);
  }

  /**
   * 2. Reports (Content / Moderation / Transaction Report)
   */
  async notifyReportCreated(report, metadata = {}, options = {}) {
    return this.notify({
      role: 'admin',
      title: `Platform Report: ${report.type || 'Moderation Flag'}`,
      message: `Report filed by ${report.reporter || 'User'}: "${report.reason || report.title || 'Platform infraction'}". Target: ${report.target || 'Item'}.`,
      type: 'alert',
      link: '/admin/reports',
      metadata: { reportId: report.id, ...metadata }
    }, options);
  }

  /**
   * 3. Important System Events
   */
  async notifyAdminSystemEvent(event, title, message, metadata = {}, options = {}) {
    return this.notify({
      role: 'admin',
      title: title || `System Event: ${event}`,
      message: message || `System event ${event} occurred.`,
      type: 'system',
      link: '/admin/settings',
      metadata: { event, ...metadata }
    }, options);
  }
}

function merchantNameOrFallback(order) {
  return order.businessName || order.merchant?.name || 'LocalBiz Merchant';
}

// Export singleton instance for platform-wide usage
export const notificationService = new NotificationService();
