import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * FavouriteService
 * Domain service managing consumer favorites across Businesses, Products, and Services.
 * Enforces ownership, authentication, duplicate prevention, and status checking.
 */
export class FavouriteService {
  constructor(prismaClient = defaultPrisma) {
    this.prisma = prismaClient;
  }

  /**
   * Adds an entity to consumer favorites.
   * Rejects duplicates with 409 Conflict.
   *
   * @param {string} userId - Authenticated user ID
   * @param {Object} payload - { merchantId, productId, type }
   * @returns {Promise<{ action: string, favourite: Object }>}
   */
  async addFavourite(userId, payload = {}) {
    if (!userId) {
      const err = new Error('Authentication required: Please sign in to save favorites');
      err.statusCode = 401;
      throw err;
    }

    const { merchantId, productId } = payload;
    if (!merchantId && !productId) {
      const err = new Error('Either merchantId or productId is required to add a favorite');
      err.statusCode = 400;
      throw err;
    }

    // 1. Business Favorite
    if (merchantId && !productId) {
      const merchant = await this.prisma.merchant.findUnique({
        where: { id: merchantId }
      });
      if (!merchant) {
        const err = new Error('Merchant not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = await this.prisma.favourite.findFirst({
        where: { userId, merchantId, productId: null }
      });

      if (existing) {
        const err = new Error('Duplicate favorite: This business is already in your favorites');
        err.statusCode = 409;
        err.favourite = existing;
        throw err;
      }

      const fav = await this.prisma.favourite.create({
        data: {
          userId,
          merchantId,
          productId: null,
          entityType: 'business'
        },
        include: {
          merchant: true
        }
      });

      return { action: 'added', favourite: fav };
    }

    // 2. Product or Service Favorite
    if (productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: productId },
        include: { merchant: true }
      });

      if (!product) {
        const err = new Error('Product or service not found');
        err.statusCode = 404;
        throw err;
      }

      const existing = await this.prisma.favourite.findFirst({
        where: { userId, productId }
      });

      if (existing) {
        const err = new Error(`Duplicate favorite: This ${product.isService ? 'service' : 'product'} is already in your favorites`);
        err.statusCode = 409;
        err.favourite = existing;
        throw err;
      }

      const entityType = product.isService ? 'service' : 'product';

      const fav = await this.prisma.favourite.create({
        data: {
          userId,
          productId,
          merchantId: product.merchantId,
          entityType
        },
        include: {
          product: {
            include: { merchant: true }
          },
          merchant: true
        }
      });

      return { action: 'added', favourite: fav };
    }
  }

  /**
   * Removes a favorite record.
   * Strictly enforces that users can only delete their own favorites.
   *
   * @param {string} userId - Authenticated user ID
   * @param {Object} options - { id, merchantId, productId }
   * @returns {Promise<{ action: string, id: string }>}
   */
  async removeFavourite(userId, options = {}) {
    if (!userId) {
      const err = new Error('Authentication required: Please sign in to modify favorites');
      err.statusCode = 401;
      throw err;
    }

    const { id, merchantId, productId } = options;

    // 1. Remove by primary ID
    if (id) {
      const fav = await this.prisma.favourite.findUnique({
        where: { id }
      });

      if (!fav) {
        const err = new Error('Favorite record not found');
        err.statusCode = 404;
        throw err;
      }

      if (fav.userId !== userId) {
        const err = new Error('Forbidden: You can only remove your own favorites');
        err.statusCode = 403;
        throw err;
      }

      await this.prisma.favourite.delete({
        where: { id }
      });

      return { action: 'removed', id };
    }

    // 2. Remove by target entity (merchantId or productId)
    const where = { userId };
    if (productId) {
      where.productId = productId;
    } else if (merchantId) {
      where.merchantId = merchantId;
      where.productId = null;
    } else {
      const err = new Error('Favorite id, merchantId, or productId is required for removal');
      err.statusCode = 400;
      throw err;
    }

    const existing = await this.prisma.favourite.findFirst({ where });
    if (!existing) {
      const err = new Error('Favorite record not found');
      err.statusCode = 404;
      throw err;
    }

    await this.prisma.favourite.delete({
      where: { id: existing.id }
    });

    return { action: 'removed', id: existing.id };
  }

  /**
   * Toggles a favorite status: removes if exists, adds if not.
   *
   * @param {string} userId
   * @param {Object} payload - { merchantId, productId }
   * @returns {Promise<{ action: string, favourite?: Object, id?: string }>}
   */
  async toggleFavourite(userId, payload = {}) {
    if (!userId) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const { merchantId, productId } = payload;
    const where = { userId };
    if (productId) {
      where.productId = productId;
    } else if (merchantId) {
      where.merchantId = merchantId;
      where.productId = null;
    }

    const existing = await this.prisma.favourite.findFirst({ where });
    if (existing) {
      await this.prisma.favourite.delete({ where: { id: existing.id } });
      return { action: 'removed', id: existing.id };
    }

    return this.addFavourite(userId, payload);
  }

  /**
   * Lists all favorites for a user, optionally filtered by type.
   *
   * @param {string} userId
   * @param {Object} [options={}] - { type: 'all' | 'business' | 'product' | 'service' }
   * @returns {Promise<Array<Object>>}
   */
  async listFavourites(userId, options = {}) {
    if (!userId) {
      const err = new Error('Authentication required: Please sign in to view favorites');
      err.statusCode = 401;
      throw err;
    }

    const where = { userId };
    const type = (options.type || 'all').toLowerCase();
    if (type !== 'all') {
      where.entityType = type;
    }

    const favourites = await this.prisma.favourite.findMany({
      where,
      include: {
        merchant: true,
        product: {
          include: {
            merchant: {
              select: {
                id: true,
                name: true,
                suburb: true,
                rating: true,
                distanceKm: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return favourites;
  }

  /**
   * Checks if an entity is favorited by the user.
   *
   * @param {string} userId
   * @param {Object} options - { merchantId, productId }
   * @returns {Promise<{ isFavourite: boolean, favouriteId: string|null, entityType: string|null }>}
   */
  async checkStatus(userId, options = {}) {
    if (!userId) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const { merchantId, productId } = options;
    const where = { userId };
    if (productId) {
      where.productId = productId;
    } else if (merchantId) {
      where.merchantId = merchantId;
      where.productId = null;
    } else {
      return { isFavourite: false, favouriteId: null, entityType: null };
    }

    const fav = await this.prisma.favourite.findFirst({ where });
    return {
      isFavourite: !!fav,
      favouriteId: fav ? fav.id : null,
      entityType: fav ? fav.entityType : null
    };
  }
}

export const favouriteService = new FavouriteService();
