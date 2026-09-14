import { NotificationChannelProvider } from './NotificationChannelProvider.js';

/**
 * EmailNotificationProvider
 * Decoupled Email delivery provider.
 * Implements delivery simulation, recipient validation, and logging.
 * Ready for future production integration with SendGrid, AWS SES, or Nodemailer.
 */
export class EmailNotificationProvider extends NotificationChannelProvider {
  /**
   * @param {string} [name='mock_email']
   * @param {Object} [options]
   * @param {string} [options.senderAddress='notifications@localbiz.co.za']
   * @param {Function} [options.transport] - Optional real transport function
   */
  constructor(name = 'mock_email', options = {}) {
    super(name, 'email');
    this.senderAddress = options.senderAddress || 'notifications@localbiz.co.za';
    this.transport = options.transport || null;
    this.deliveryHistory = [];
  }

  /**
   * Returns recent dispatch log for debugging/testing
   */
  getDeliveryLog() {
    return [...this.deliveryHistory];
  }

  /**
   * Clears delivery history
   */
  clearDeliveryLog() {
    this.deliveryHistory = [];
  }

  /**
   * Dispatches email notification
   */
  async send(payload) {
    const {
      recipient,
      title,
      message,
      metadata = {},
      userId
    } = payload;

    const targetEmail = recipient || metadata.email || (userId ? `${userId}@localbiz.local` : null);

    if (!targetEmail) {
      return {
        success: false,
        channel: this.getType(),
        provider: this.getName(),
        error: 'Missing recipient email address'
      };
    }

    const messageId = `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const emailPayload = {
      messageId,
      from: this.senderAddress,
      to: targetEmail,
      subject: `[LocalBiz] ${title}`,
      text: message,
      html: `<div style="font-family: sans-serif; padding: 16px;"><h2>${title}</h2><p>${message}</p></div>`,
      sentAt: new Date(),
      status: 'DELIVERED'
    };

    if (this.transport && typeof this.transport === 'function') {
      try {
        const res = await this.transport(emailPayload);
        emailPayload.rawResponse = res;
      } catch (err) {
        return {
          success: false,
          channel: this.getType(),
          provider: this.getName(),
          error: err.message
        };
      }
    }

    this.deliveryHistory.push(emailPayload);

    return {
      success: true,
      channel: this.getType(),
      provider: this.getName(),
      messageId,
      recipient: targetEmail,
      deliveredAt: emailPayload.sentAt
    };
  }
}
