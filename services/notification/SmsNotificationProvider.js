import { NotificationChannelProvider } from './NotificationChannelProvider.js';

/**
 * SmsNotificationProvider
 * Decoupled SMS delivery provider.
 * Implements delivery simulation, character limit formatting (160 chars),
 * and phone number validation.
 * Ready for future production integration with Twilio, Africa's Talking, or BulkSMS.
 */
export class SmsNotificationProvider extends NotificationChannelProvider {
  /**
   * @param {string} [name='mock_sms']
   * @param {Object} [options]
   * @param {string} [options.senderId='LOCALBIZ']
   * @param {Function} [options.transport]
   */
  constructor(name = 'mock_sms', options = {}) {
    super(name, 'sms');
    this.senderId = options.senderId || 'LOCALBIZ';
    this.transport = options.transport || null;
    this.deliveryHistory = [];
  }

  getDeliveryLog() {
    return [...this.deliveryHistory];
  }

  clearDeliveryLog() {
    this.deliveryHistory = [];
  }

  /**
   * Dispatches SMS notification
   */
  async send(payload) {
    const {
      recipient,
      title,
      message,
      metadata = {}
    } = payload;

    const phone = recipient || metadata.phone || metadata.customerPhone;

    if (!phone) {
      return {
        success: false,
        channel: this.getType(),
        provider: this.getName(),
        error: 'Missing recipient phone number for SMS'
      };
    }

    // Format body: prefix with title and truncate if excessive
    const body = `${title}: ${message}`.slice(0, 160);
    const messageId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const smsRecord = {
      messageId,
      senderId: this.senderId,
      to: phone,
      body,
      charCount: body.length,
      sentAt: new Date(),
      status: 'SENT'
    };

    if (this.transport && typeof this.transport === 'function') {
      try {
        const res = await this.transport(smsRecord);
        smsRecord.rawResponse = res;
      } catch (err) {
        return {
          success: false,
          channel: this.getType(),
          provider: this.getName(),
          error: err.message
        };
      }
    }

    this.deliveryHistory.push(smsRecord);

    return {
      success: true,
      channel: this.getType(),
      provider: this.getName(),
      messageId,
      recipient: phone,
      sentAt: smsRecord.sentAt
    };
  }
}
