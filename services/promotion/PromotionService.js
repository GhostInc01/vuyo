import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * PromotionService
 * Domain service managing business promotions, discount coupons,
 * date and limit validations, checkout discount calculations, and admin oversight.
 */
export class PromotionService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Validates common promotion input parameters
   * @param {Object} data
   * @param {boolean} isUpdate
   */
  validatePromotionData(data, isUpdate = false) {
    if (!isUpdate && (!data.code || typeof data.code !== 'string' || !data.code.trim())) {
      const err = new Error('Promotion code is required');
      err.statusCode = 400;
      throw err;
    }

    const discountType = data.discountType ? data.discountType.toUpperCase() : 'PERCENTAGE';
    if (!['PERCENTAGE', 'FIXED'].includes(discountType)) {
      const err = new Error('Discount type must be either PERCENTAGE or FIXED');
      err.statusCode = 400;
      throw err;
    }

    const discountValue = Number(data.discountValue !== undefined ? data.discountValue : data.discountPercent);
    if (isNaN(discountValue) || discountValue <= 0) {
      const err = new Error('Discount value must be a positive number');
      err.statusCode = 400;
      throw err;
    }

    if (discountType === 'PERCENTAGE' && discountValue > 100) {
      const err = new Error('Percentage discount cannot exceed 100%');
      err.statusCode = 400;
      throw err;
    }

    // Date validation
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        const err = new Error('Invalid date format for start or end date');
        err.statusCode = 400;
        throw err;
      }
      if (start > end) {
        const err = new Error('Start date cannot be after end date');
        err.statusCode = 400;
        throw err;
      }
    }

    // Usage limit validation
    if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== '') {
      const limit = Number(data.usageLimit);
      if (isNaN(limit) || limit < 1) {
        const err = new Error('Usage limit must be a positive integer');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  /**
   * Creates a new promotion for a business
   * @param {string} merchantId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createPromotion(merchantId, data = {}) {
    if (!merchantId) {
      const err = new Error('merchantId is required');
      err.statusCode = 400;
      throw err;
    }

    const merchant = await this.prisma.merchant.findUnique({ where: { id: merchantId } });
    if (!merchant) {
      const err = new Error('Merchant not found');
      err.statusCode = 404;
      throw err;
    }

    this.validatePromotionData(data, false);

    const code = data.code.trim().toUpperCase();

    // Prevent duplicate codes for the same business
    const existing = await this.prisma.promotion.findFirst({
      where: {
        merchantId,
        code
      }
    });

    if (existing) {
      const err = new Error(`A promotion with code "${code}" already exists for your business`);
      err.statusCode = 409;
      throw err;
    }

    const discountType = data.discountType ? data.discountType.toUpperCase() : 'PERCENTAGE';
    const discountValue = Number(data.discountValue !== undefined ? data.discountValue : data.discountPercent) || 10;
    const startDate = data.startDate ? new Date(data.startDate) : new Date();
    const endDate = data.endDate ? new Date(data.endDate) : null;
    const usageLimit = (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit !== '')
      ? Number(data.usageLimit)
      : null;

    const status = data.status ? data.status.toUpperCase() : 'ACTIVE';
    const active = status === 'ACTIVE';

    return await this.prisma.promotion.create({
      data: {
        merchantId,
        name: (data.name || `${code} Special`).trim(),
        code,
        description: data.description || (discountType === 'PERCENTAGE' ? `Get ${discountValue}% off` : `Get R${discountValue} off`),
        discountType,
        discountValue,
        discountPercent: discountType === 'PERCENTAGE' ? discountValue : 0,
        minSpend: Number(data.minSpend) || 0,
        startDate,
        endDate,
        usageLimit,
        usageCount: 0,
        applicableProducts: data.applicableProducts ? (typeof data.applicableProducts === 'string' ? data.applicableProducts : JSON.stringify(data.applicableProducts)) : 'all',
        applicableServices: data.applicableServices ? (typeof data.applicableServices === 'string' ? data.applicableServices : JSON.stringify(data.applicableServices)) : 'all',
        status,
        active
      }
    });
  }

  /**
   * Updates an existing promotion with business ownership enforcement
   * @param {string} id
   * @param {string} merchantId
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updatePromotion(id, merchantId, data = {}) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) {
      const err = new Error('Promotion not found');
      err.statusCode = 404;
      throw err;
    }

    if (merchantId && promo.merchantId !== merchantId) {
      const err = new Error('Forbidden: You cannot modify promotions belonging to another business');
      err.statusCode = 403;
      throw err;
    }

    this.validatePromotionData(data, true);

    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name.trim();
    if (data.description !== undefined) updateData.description = data.description.trim();

    if (data.code !== undefined) {
      const newCode = data.code.trim().toUpperCase();
      if (newCode !== promo.code) {
        const dup = await this.prisma.promotion.findFirst({
          where: {
            merchantId: promo.merchantId,
            code: newCode,
            id: { not: promo.id }
          }
        });
        if (dup) {
          const err = new Error(`A promotion with code "${newCode}" already exists for your business`);
          err.statusCode = 409;
          throw err;
        }
        updateData.code = newCode;
      }
    }

    if (data.discountType !== undefined) {
      updateData.discountType = data.discountType.toUpperCase();
    }

    if (data.discountValue !== undefined || data.discountPercent !== undefined) {
      const val = Number(data.discountValue !== undefined ? data.discountValue : data.discountPercent);
      updateData.discountValue = val;
      if ((updateData.discountType || promo.discountType) === 'PERCENTAGE') {
        updateData.discountPercent = val;
      }
    }

    if (data.minSpend !== undefined) updateData.minSpend = Number(data.minSpend) || 0;
    if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
    if (data.endDate !== undefined) updateData.endDate = data.endDate ? new Date(data.endDate) : null;
    if (data.usageLimit !== undefined) {
      updateData.usageLimit = (data.usageLimit !== null && data.usageLimit !== '') ? Number(data.usageLimit) : null;
    }

    if (data.applicableProducts !== undefined) {
      updateData.applicableProducts = typeof data.applicableProducts === 'string'
        ? data.applicableProducts
        : JSON.stringify(data.applicableProducts);
    }

    if (data.applicableServices !== undefined) {
      updateData.applicableServices = typeof data.applicableServices === 'string'
        ? data.applicableServices
        : JSON.stringify(data.applicableServices);
    }

    if (data.status !== undefined) {
      updateData.status = data.status.toUpperCase();
      updateData.active = updateData.status === 'ACTIVE';
    } else if (data.active !== undefined) {
      updateData.active = Boolean(data.active);
      updateData.status = updateData.active ? 'ACTIVE' : 'INACTIVE';
    }

    return await this.prisma.promotion.update({
      where: { id },
      data: updateData
    });
  }

  /**
   * Toggles promotion status (ACTIVE / INACTIVE)
   * @param {string} id
   * @param {string} merchantId
   * @param {string} status - 'ACTIVE' or 'INACTIVE'
   * @returns {Promise<Object>}
   */
  async setPromotionStatus(id, merchantId, status) {
    const targetStatus = (status || '').toUpperCase();
    if (!['ACTIVE', 'INACTIVE', 'EXPIRED'].includes(targetStatus)) {
      const err = new Error('Status must be ACTIVE, INACTIVE, or EXPIRED');
      err.statusCode = 400;
      throw err;
    }

    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) {
      const err = new Error('Promotion not found');
      err.statusCode = 404;
      throw err;
    }

    if (merchantId && promo.merchantId !== merchantId) {
      const err = new Error('Forbidden: You cannot modify promotions belonging to another business');
      err.statusCode = 403;
      throw err;
    }

    return await this.prisma.promotion.update({
      where: { id },
      data: {
        status: targetStatus,
        active: targetStatus === 'ACTIVE'
      }
    });
  }

  /**
   * Deletes a promotion with business ownership enforcement
   * @param {string} id
   * @param {string} merchantId
   * @returns {Promise<{ message: string, id: string }>}
   */
  async deletePromotion(id, merchantId) {
    const promo = await this.prisma.promotion.findUnique({ where: { id } });
    if (!promo) {
      const err = new Error('Promotion not found');
      err.statusCode = 404;
      throw err;
    }

    if (merchantId && promo.merchantId !== merchantId) {
      const err = new Error('Forbidden: You cannot delete promotions belonging to another business');
      err.statusCode = 403;
      throw err;
    }

    await this.prisma.promotion.delete({ where: { id } });
    return { message: 'Promotion deleted', id };
  }

  /**
   * Validates a promotion code against a shopping cart / order context
   * Checks code, merchant ownership, status, start/end dates, usage limits, and items eligibility.
   *
   * @param {string} code
   * @param {string} merchantId
   * @param {Object} context - { subtotal, items }
   * @returns {Promise<{ valid: boolean, discountAmount?: number, finalSubtotal?: number, promotion?: Object, error?: string }>}
   */
  async validatePromotion(code, merchantId, context = {}) {
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Promotion code is required' };
    }
    if (!merchantId) {
      return { valid: false, error: 'merchantId is required' };
    }

    const cleanCode = code.trim().toUpperCase();
    const subtotal = Number(context.subtotal) || 0;
    const items = Array.isArray(context.items) ? context.items : [];

    const promo = await this.prisma.promotion.findFirst({
      where: {
        merchantId,
        code: cleanCode
      }
    });

    if (!promo) {
      return { valid: false, error: `Invalid promotion code "${cleanCode}" for this business` };
    }

    // 1. Check Active Status
    if (promo.status !== 'ACTIVE' || !promo.active) {
      return { valid: false, error: `Promotion "${cleanCode}" is not currently active` };
    }

    // 2. Check Dates
    const now = new Date();
    if (promo.startDate && now < new Date(promo.startDate)) {
      return { valid: false, error: `Promotion "${cleanCode}" has not started yet (valid from ${new Date(promo.startDate).toLocaleDateString()})` };
    }

    if (promo.endDate && now > new Date(promo.endDate)) {
      return { valid: false, error: `Promotion "${cleanCode}" has expired on ${new Date(promo.endDate).toLocaleDateString()}` };
    }

    // 3. Check Usage Limits
    if (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
      return { valid: false, error: `Promotion "${cleanCode}" usage limit of ${promo.usageLimit} has been reached` };
    }

    // 4. Check Minimum Spend
    if (promo.minSpend && subtotal < promo.minSpend) {
      return { valid: false, error: `Minimum order spend of R${promo.minSpend} required to apply this coupon` };
    }

    // 5. Check Item Applicability
    if (promo.applicableProducts && promo.applicableProducts !== 'all' && items.length > 0) {
      try {
        const allowedIds = typeof promo.applicableProducts === 'string' && promo.applicableProducts.startsWith('[')
          ? JSON.parse(promo.applicableProducts)
          : promo.applicableProducts.split(',').map(s => s.trim());

        const hasMatchingProduct = items.some(item => allowedIds.includes(item.productId));
        if (!hasMatchingProduct) {
          return { valid: false, error: `Coupon "${cleanCode}" is not applicable to any items in your cart` };
        }
      } catch (e) {
        // If parsing fails, fall back to applying
      }
    }

    // 6. Calculate Discount Amount
    let discountAmount = 0;
    if (promo.discountType === 'FIXED') {
      discountAmount = Math.min(subtotal, promo.discountValue);
    } else {
      // PERCENTAGE
      discountAmount = Math.round(((subtotal * promo.discountValue) / 100) * 100) / 100;
    }

    const finalSubtotal = Math.max(0, subtotal - discountAmount);

    return {
      valid: true,
      discountAmount,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      finalSubtotal,
      promotion: promo
    };
  }

  /**
   * Validates and applies promotion inside an atomic database transaction.
   * Increments promotion usage count and updates status to EXPIRED if limit is reached.
   *
   * @param {Object} tx - Prisma transaction client
   * @param {string} code
   * @param {string} merchantId
   * @param {number} subtotal
   * @param {Array} items
   * @returns {Promise<{ discountAmount: number, promotion: Object }>}
   */
  async applyPromotionToOrder(tx, code, merchantId, subtotal, items = []) {
    const cleanCode = code.trim().toUpperCase();

    const promo = await tx.promotion.findFirst({
      where: {
        merchantId,
        code: cleanCode
      }
    });

    if (!promo) {
      const err = new Error(`Invalid promotion code "${cleanCode}" for this merchant`);
      err.statusCode = 400;
      throw err;
    }

    if (promo.status !== 'ACTIVE' || !promo.active) {
      const err = new Error(`Promotion "${cleanCode}" is inactive or expired`);
      err.statusCode = 400;
      throw err;
    }

    const now = new Date();
    if (promo.startDate && now < new Date(promo.startDate)) {
      const err = new Error(`Promotion "${cleanCode}" is not yet active`);
      err.statusCode = 400;
      throw err;
    }

    if (promo.endDate && now > new Date(promo.endDate)) {
      const err = new Error(`Promotion "${cleanCode}" has expired`);
      err.statusCode = 400;
      throw err;
    }

    if (promo.usageLimit !== null && promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
      const err = new Error(`Promotion "${cleanCode}" has reached its maximum usage limit`);
      err.statusCode = 400;
      throw err;
    }

    if (promo.minSpend && subtotal < promo.minSpend) {
      const err = new Error(`Minimum spend of R${promo.minSpend} required for this promotion`);
      err.statusCode = 400;
      throw err;
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.discountType === 'FIXED') {
      discountAmount = Math.min(subtotal, promo.discountValue);
    } else {
      discountAmount = Math.round(((subtotal * promo.discountValue) / 100) * 100) / 100;
    }

    // Increment usage count and update status if limit reached
    const nextUsage = promo.usageCount + 1;
    const isNowExpired = promo.usageLimit !== null && nextUsage >= promo.usageLimit;

    await tx.promotion.update({
      where: { id: promo.id },
      data: {
        usageCount: { increment: 1 },
        ...(isNowExpired ? { status: 'EXPIRED' } : {})
      }
    });

    return {
      discountAmount,
      promotion: promo
    };
  }

  /**
   * Lists promotions belonging to a merchant (for Business Portal)
   * @param {string} merchantId
   * @param {Object} options - { status }
   * @returns {Promise<Array>}
   */
  async listBusinessPromotions(merchantId, options = {}) {
    const where = { merchantId };
    if (options.status && options.status !== 'all') {
      where.status = options.status.toUpperCase();
    }
    return await this.prisma.promotion.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Lists public active promotions for consumer storefront
   * @param {string} [merchantId]
   * @returns {Promise<Array>}
   */
  async listStorefrontPromotions(merchantId) {
    const now = new Date();
    const where = {
      status: 'ACTIVE',
      active: true,
      startDate: { lte: now },
      OR: [
        { endDate: null },
        { endDate: { gte: now } }
      ]
    };

    if (merchantId) {
      where.merchantId = merchantId;
    }

    return await this.prisma.promotion.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, suburb: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Lists all platform promotions for Super Admin monitoring
   * @param {Object} options - { search, status, merchantId }
   * @returns {Promise<Array>}
   */
  async listAdminPromotions(options = {}) {
    const where = {};
    if (options.merchantId) where.merchantId = options.merchantId;
    if (options.status && options.status !== 'all') where.status = options.status.toUpperCase();

    if (options.search && typeof options.search === 'string' && options.search.trim()) {
      const q = options.search.trim();
      where.OR = [
        { name: { contains: q } },
        { code: { contains: q.toUpperCase() } },
        { description: { contains: q } }
      ];
    }

    return await this.prisma.promotion.findMany({
      where,
      include: {
        merchant: {
          select: { id: true, name: true, owner: true, suburb: true, status: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }
}

export const promotionService = new PromotionService();
