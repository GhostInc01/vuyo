/**
 * PaymentProvider Interface / Abstract Base Class
 * Defines the contract that every payment gateway integration (Mock, PayFast, Stripe, Ozow, etc.)
 * must implement to ensure seamless pluggability without altering order or booking business logic.
 */
export class PaymentProvider {
  /**
   * @param {string} name - Unique identifier for this gateway (e.g. 'mock', 'payfast', 'stripe')
   */
  constructor(name) {
    if (new.target === PaymentProvider) {
      throw new TypeError('Cannot construct PaymentProvider abstract instances directly');
    }
    if (!name || typeof name !== 'string') {
      throw new Error('PaymentProvider requires a valid provider name string');
    }
    this.name = name;
  }

  /**
   * Returns provider identifier
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Initiates payment with the provider gateway
   * @param {Object} paymentData
   * @param {number} paymentData.amount - Amount in currency
   * @param {string} paymentData.currency - ISO currency code (e.g. 'ZAR')
   * @param {string} paymentData.reference - Unique platform reference
   * @param {Object} paymentData.customer - Safe customer details { name, email, phone }
   * @param {Object} [paymentData.metadata] - Non-sensitive metadata
   * @returns {Promise<{ transactionId: string, status: string, paymentUrl?: string, redirectUrl?: string, rawResponse?: any }>}
   */
  async createPayment(paymentData) {
    throw new Error(`Method 'createPayment()' must be implemented by provider '${this.name}'`);
  }

  /**
   * Executes or simulates processing of an initiated transaction
   * @param {string} transactionId
   * @param {Object} [options]
   * @returns {Promise<{ transactionId: string, status: string, paidAt?: Date, failureReason?: string, cardBrand?: string, cardLast4?: string, rawResponse?: any }>}
   */
  async processPayment(transactionId, options = {}) {
    throw new Error(`Method 'processPayment()' must be implemented by provider '${this.name}'`);
  }

  /**
   * Issues full or partial refund for a settled transaction
   * @param {string} transactionId
   * @param {Object} options
   * @param {number} [options.amount] - Amount to refund (defaults to full amount)
   * @param {string} [options.reason] - Reason for refund
   * @returns {Promise<{ refundId: string, status: string, refundedAmount: number, refundedAt: Date, rawResponse?: any }>}
   */
  async refundPayment(transactionId, options = {}) {
    throw new Error(`Method 'refundPayment()' must be implemented by provider '${this.name}'`);
  }

  /**
   * Queries status directly from the gateway
   * @param {string} transactionId
   * @returns {Promise<{ transactionId: string, status: string, rawResponse?: any }>}
   */
  async getPaymentStatus(transactionId) {
    throw new Error(`Method 'getPaymentStatus()' must be implemented by provider '${this.name}'`);
  }

  /**
   * Validates inbound webhook signatures/payloads
   * @param {Object|string} payload
   * @param {Object} headers
   * @returns {Promise<{ isValid: boolean, transactionId?: string, status?: string, rawResponse?: any }>}
   */
  async verifyWebhook(payload, headers) {
    throw new Error(`Method 'verifyWebhook()' must be implemented by provider '${this.name}'`);
  }
}

export default PaymentProvider;
