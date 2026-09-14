/**
 * NotificationChannelProvider Interface / Abstract Base Class
 * Defines the contract that every notification channel provider must implement
 * to ensure that future delivery channels (Email, SMS, Push, WhatsApp, etc.)
 * can be added dynamically without altering core system event logic.
 */
export class NotificationChannelProvider {
  /**
   * @param {string} name - Unique provider identifier (e.g. 'in_app', 'mock_email', 'twilio_sms')
   * @param {string} [type] - Channel type ('in_app' | 'email' | 'sms' | 'push' | 'whatsapp')
   */
  constructor(name, type) {
    if (new.target === NotificationChannelProvider) {
      throw new TypeError('Cannot construct NotificationChannelProvider abstract instances directly');
    }
    if (!name || typeof name !== 'string') {
      throw new Error('NotificationChannelProvider requires a valid provider name');
    }
    this.name = name.toLowerCase();
    this.type = (type || name).toLowerCase();
  }

  /**
   * Provider identifier
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Channel type
   * @returns {string}
   */
  getType() {
    return this.type;
  }

  /**
   * Health or availability check
   * @returns {boolean}
   */
  isAvailable() {
    return true;
  }

  /**
   * Dispatches a notification payload through this channel
   * @param {Object} payload
   * @param {string} [payload.userId] - Recipient user ID
   * @param {string} [payload.recipient] - Email address, phone number, push token, etc.
   * @param {string} [payload.role] - Target role: 'consumer', 'business', 'admin', 'all'
   * @param {string} payload.title - Notification title
   * @param {string} payload.message - Notification message body
   * @param {string} [payload.type] - Category ('order', 'booking', 'payment', 'review', 'approval', 'alert', 'system')
   * @param {string} [payload.link] - Direct URL/deep-link to relevant screen
   * @param {Object} [payload.metadata] - Additional contextual data
   * @param {string} [payload.priority] - 'normal' | 'high' | 'urgent'
   * @returns {Promise<{ success: boolean, channel: string, messageId?: string, error?: string, rawResponse?: any }>}
   */
  async send(payload) {
    throw new Error(`Method 'send()' must be implemented by provider '${this.name}'`);
  }
}
