import { NotificationChannelProvider } from './NotificationChannelProvider.js';

/**
 * PushNotificationProvider
 * Decoupled Web / Mobile Push delivery provider.
 * Simulates dispatch to device tokens.
 * Ready for future production integration with Firebase Cloud Messaging (FCM), OneSignal, or WebPush.
 */
export class PushNotificationProvider extends NotificationChannelProvider {
  /**
   * @param {string} [name='mock_push']
   * @param {Object} [options]
   */
  constructor(name = 'mock_push', options = {}) {
    super(name, 'push');
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
      link = '/',
      metadata = {}
    } = payload;

    const token = recipient || metadata.deviceToken || metadata.pushSubscription || 'mock-fcm-token-default';
    const messageId = `push-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const pushRecord = {
      messageId,
      token,
      notification: {
        title,
        body: message,
        click_action: link
      },
      data: metadata,
      sentAt: new Date(),
      status: 'SENT'
    };

    this.deliveryHistory.push(pushRecord);

    return {
      success: true,
      channel: this.getType(),
      provider: this.getName(),
      messageId,
      sentAt: pushRecord.sentAt
    };
  }
}
