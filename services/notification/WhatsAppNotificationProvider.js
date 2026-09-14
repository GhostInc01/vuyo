import { NotificationChannelProvider } from './NotificationChannelProvider.js';

/**
 * WhatsAppNotificationProvider
 * Decoupled WhatsApp messaging provider.
 * Simulates template messaging for South African business communication.
 * Ready for future production integration with Meta Cloud API or Twilio WhatsApp.
 */
export class WhatsAppNotificationProvider extends NotificationChannelProvider {
  /**
   * @param {string} [name='mock_whatsapp']
   * @param {Object} [options]
   */
  constructor(name = 'mock_whatsapp', options = {}) {
    super(name, 'whatsapp');
    this.deliveryHistory = [];
  }

  getDeliveryLog() {
    return [...this.deliveryHistory];
  }

  clearDeliveryLog() {
    this.deliveryHistory = [];
  }

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
        error: 'Missing recipient phone number for WhatsApp'
      };
    }

    const messageId = `wa-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const record = {
      messageId,
      to: phone,
      template: 'transactional_update',
      body: `*LocalBiz Alert: ${title}*\n\n${message}`,
      metadata,
      sentAt: new Date(),
      status: 'DELIVERED'
    };

    this.deliveryHistory.push(record);

    return {
      success: true,
      channel: this.getType(),
      provider: this.getName(),
      messageId,
      recipient: phone,
      sentAt: record.sentAt
    };
  }
}
