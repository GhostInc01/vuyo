import { PaymentProvider } from './PaymentProvider.js';

/**
 * MockPaymentProvider
 * Simulates real payment gateway interactions (such as PayFast, Ozow, Stripe)
 * in development and automated testing environments.
 * 
 * PCI-DSS RULE:
 * Absolutely NO raw card numbers, CVVs, PINs, or sensitive passwords are stored.
 * Only sanitized card brand and masked last-4 digits are preserved.
 */
export class MockPaymentProvider extends PaymentProvider {
  constructor(name = 'mock') {
    super(name);
    // In-memory registry of mock transaction states for lookup
    this.mockTransactions = new Map();
  }

  /**
   * Creates a payment intent
   */
  async createPayment(paymentData) {
    const { amount, currency = 'ZAR', reference, customer, metadata } = paymentData;

    if (!amount || amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }
    if (!reference) {
      throw new Error('Payment reference is required');
    }

    const transactionId = `tx_mock_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const paymentUrl = `https://pay.mock.localbiz.co.za/gateway/${transactionId}`;

    const record = {
      transactionId,
      reference,
      amount,
      currency,
      customer: customer ? { name: customer.name, email: customer.email } : null,
      status: 'PENDING',
      createdAt: new Date(),
      metadata: metadata || {}
    };

    this.mockTransactions.set(transactionId, record);

    return {
      transactionId,
      status: 'PENDING',
      paymentUrl,
      redirectUrl: paymentUrl,
      rawResponse: {
        provider: this.name,
        mode: 'sandbox',
        transactionId,
        reference
      }
    };
  }

  /**
   * Processes a transaction with realistic simulation and deterministic test triggers
   */
  async processPayment(transactionId, options = {}) {
    let tx = this.mockTransactions.get(transactionId);
    if (!tx) {
      tx = {
        transactionId,
        amount: options.amount || 100,
        status: 'PENDING',
        createdAt: new Date()
      };
      this.mockTransactions.set(transactionId, tx);
    }

    // Extract sanitized card details - NEVER STORE PAN/CVV/PIN
    const rawCard = String(options.cardNumber || options.pan || '').replace(/\D/g, '');
    const cardLast4 = rawCard ? rawCard.slice(-4) : (options.cardLast4 || '4242');
    let cardBrand = 'Visa';
    if (rawCard.startsWith('5')) cardBrand = 'Mastercard';
    else if (rawCard.startsWith('3')) cardBrand = 'Amex';

    // Outcome determination rules
    const forceOutcome = options.forceOutcome || (options.simulateFailure ? 'FAILED' : null);
    const customReason = options.failureReason || options.error;

    // Deterministic simulation triggers:
    // 1. Explicit outcome
    if (forceOutcome === 'FAILED') {
      tx.status = 'FAILED';
      tx.failureReason = customReason || 'Payment declined by card issuer';
      return {
        transactionId,
        status: 'FAILED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '51', message: tx.failureReason }
      };
    }

    if (forceOutcome === 'CANCELLED') {
      tx.status = 'CANCELLED';
      tx.failureReason = 'Payment cancelled by user';
      return {
        transactionId,
        status: 'CANCELLED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '99', message: 'Cancelled' }
      };
    }

    // 2. Test card number patterns
    if (rawCard.endsWith('0002') || String(options.cardNumber).includes('decline')) {
      tx.status = 'FAILED';
      tx.failureReason = 'Card declined by issuing bank';
      return {
        transactionId,
        status: 'FAILED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '05', message: 'Do not honor' }
      };
    }

    if (rawCard.endsWith('0003') || String(options.cardNumber).includes('insufficient')) {
      tx.status = 'FAILED';
      tx.failureReason = 'Insufficient funds in account';
      return {
        transactionId,
        status: 'FAILED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '51', message: 'Insufficient funds' }
      };
    }

    if (rawCard.endsWith('0004') || String(options.cardNumber).includes('expired')) {
      tx.status = 'FAILED';
      tx.failureReason = 'Card has expired';
      return {
        transactionId,
        status: 'FAILED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '54', message: 'Expired card' }
      };
    }

    // 3. Amount-based deterministic test trigger (R999.99 triggers failure)
    if (Number(options.amount) === 999.99) {
      tx.status = 'FAILED';
      tx.failureReason = 'High-risk transaction declined';
      return {
        transactionId,
        status: 'FAILED',
        failureReason: tx.failureReason,
        cardBrand,
        cardLast4,
        rawResponse: { code: '59', message: tx.failureReason }
      };
    }

    // Standard Success Flow
    tx.status = 'SUCCESS';
    tx.paidAt = new Date();
    tx.cardBrand = cardBrand;
    tx.cardLast4 = cardLast4;

    return {
      transactionId,
      status: 'SUCCESS',
      paidAt: tx.paidAt,
      cardBrand,
      cardLast4,
      rawResponse: {
        code: '00',
        authCode: `AUTH${Math.floor(100000 + Math.random() * 900000)}`,
        message: 'Transaction approved'
      }
    };
  }

  /**
   * Simulates full or partial refund
   */
  async refundPayment(transactionId, options = {}) {
    const tx = this.mockTransactions.get(transactionId);
    const refundId = `ref_mock_${Math.random().toString(36).substring(2, 10)}_${Date.now()}`;
    const refundedAmount = options.amount || tx?.amount || 0;

    if (tx) {
      tx.status = 'REFUNDED';
      tx.refundedAt = new Date();
    }

    return {
      refundId,
      status: 'REFUNDED',
      refundedAmount,
      refundedAt: new Date(),
      reason: options.reason || 'Requested by customer / merchant',
      rawResponse: {
        code: '00',
        message: 'Refund settled successfully'
      }
    };
  }

  /**
   * Retrieves transaction status from mock store
   */
  async getPaymentStatus(transactionId) {
    const tx = this.mockTransactions.get(transactionId);
    if (!tx) {
      return {
        transactionId,
        status: 'UNKNOWN',
        rawResponse: { error: 'Transaction not found' }
      };
    }
    return {
      transactionId,
      status: tx.status,
      paidAt: tx.paidAt,
      failureReason: tx.failureReason,
      rawResponse: tx
    };
  }

  /**
   * Simulates webhook signature validation
   */
  async verifyWebhook(payload, headers = {}) {
    // In mock mode, we accept payloads with a valid transactionId
    if (payload && payload.transactionId) {
      return {
        isValid: true,
        transactionId: payload.transactionId,
        status: payload.status || 'SUCCESS',
        rawResponse: payload
      };
    }
    return {
      isValid: false,
      rawResponse: { error: 'Invalid mock webhook payload' }
    };
  }
}

export default MockPaymentProvider;
