import { EventEmitter } from 'events';
import { PrismaClient } from '@prisma/client';

const defaultPrisma = new PrismaClient();

/**
 * MessageService
 * Domain service managing secure consumer-to-business messaging threads.
 * Inherits from EventEmitter to support future WebSocket/SSE real-time streaming
 * while providing immediate robust REST polling and strong multi-tenant RBAC.
 */
export class MessageService extends EventEmitter {
  constructor(prismaClient = defaultPrisma) {
    super();
    this.prisma = prismaClient;
  }

  /**
   * Resolves the merchant ID belonging to a business user.
   * @param {Object} user
   * @returns {Promise<string|null>}
   */
  async resolveUserMerchantId(user) {
    if (!user) return null;

    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { merchantId: true }
    });
    if (dbUser?.merchantId) return dbUser.merchantId;

    if (user.merchantId) return user.merchantId;

    const merchant = await this.prisma.merchant.findFirst({
      where: { ownerId: user.id },
      select: { id: true }
    });
    return merchant ? merchant.id : null;
  }

  /**
   * Gets an existing conversation thread or creates a new one between a consumer and merchant.
   * Enforces single conversation thread per consumer-business pair.
   *
   * @param {string} userId - Consumer user ID
   * @param {string} merchantId - Business merchant ID
   * @returns {Promise<Object>}
   */
  async getOrCreateConversation(userId, merchantId) {
    if (!userId) {
      const err = new Error('Authentication required: userId is required');
      err.statusCode = 401;
      throw err;
    }
    if (!merchantId) {
      const err = new Error('merchantId is required to start a conversation');
      err.statusCode = 400;
      throw err;
    }

    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
    });
    if (!merchant) {
      const err = new Error('Merchant not found');
      err.statusCode = 404;
      throw err;
    }

    const consumer = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatar: true, phone: true }
    });
    if (!consumer) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    let conversation = await this.prisma.conversation.findUnique({
      where: {
        userId_merchantId: {
          userId,
          merchantId
        }
      },
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
        },
        user: {
          select: { id: true, name: true, email: true, avatar: true, phone: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50
        }
      }
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          userId,
          merchantId,
          lastMessage: null,
          lastMessageAt: new Date(),
          unreadCountConsumer: 0,
          unreadCountBusiness: 0
        },
        include: {
          merchant: {
            select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
          },
          user: {
            select: { id: true, name: true, email: true, avatar: true, phone: true }
          },
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      });
    }

    return conversation;
  }

  /**
   * Lists conversations scoped strictly to the authenticated user's role and identity.
   * Consumers see their inquiries; businesses see customer conversations for their store.
   *
   * @param {Object} user - Authenticated user { id, role, merchantId }
   * @param {Object} [options] - { unreadOnly, skip, limit }
   * @returns {Promise<Array>}
   */
  async listConversations(user, options = {}) {
    if (!user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const where = {};

    if (user.role === 'admin') {
      if (options.merchantId) where.merchantId = options.merchantId;
      if (options.userId) where.userId = options.userId;
    } else if (user.role === 'business') {
      const merchantId = await this.resolveUserMerchantId(user);
      if (!merchantId) {
        return [];
      }
      where.merchantId = merchantId;
      if (options.unreadOnly) {
        where.unreadCountBusiness = { gt: 0 };
      }
    } else {
      // Default: Consumer
      where.userId = user.id;
      if (options.unreadOnly) {
        where.unreadCountConsumer = { gt: 0 };
      }
    }

    const skip = Number(options.skip) || 0;
    const take = Math.min(Number(options.limit) || 50, 100);

    return await this.prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
        },
        user: {
          select: { id: true, name: true, email: true, avatar: true, phone: true }
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      skip,
      take
    });
  }

  /**
   * Retrieves a single conversation by ID, enforcing multi-tenant isolation.
   * Consumers can only access their conversations; businesses can only access theirs.
   *
   * @param {string} conversationId
   * @param {Object} user - Authenticated user
   * @returns {Promise<Object>}
   */
  async getConversation(conversationId, user) {
    if (!user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }
    if (!conversationId) {
      const err = new Error('conversationId is required');
      err.statusCode = 400;
      throw err;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        merchant: {
          select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
        },
        user: {
          select: { id: true, name: true, email: true, avatar: true, phone: true }
        },
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!conversation) {
      const err = new Error('Conversation not found');
      err.statusCode = 404;
      throw err;
    }

    // Security & Authorization Guardrails:
    if (user.role === 'admin') {
      return conversation;
    }

    if (user.role === 'business') {
      const userMerchantId = await this.resolveUserMerchantId(user);
      if (!userMerchantId || conversation.merchantId !== userMerchantId) {
        const err = new Error('Forbidden: You can only access conversations belonging to your business');
        err.statusCode = 403;
        throw err;
      }
      return conversation;
    }

    // Consumer authorization check:
    if (conversation.userId !== user.id) {
      const err = new Error('Forbidden: You can only access your own conversations');
      err.statusCode = 403;
      throw err;
    }

    return conversation;
  }

  /**
   * Appends a message to an existing conversation thread.
   * Updates conversation's lastMessage, lastMessageAt, and increments recipient's unread counter.
   * Emits 'message:new' event for WebSocket broadcast and async notifications.
   *
   * @param {string} conversationId
   * @param {Object} user - Authenticated sender
   * @param {Object} payload - { text }
   * @returns {Promise<{ message: Object, conversation: Object }>}
   */
  async sendMessage(conversationId, user, payload = {}) {
    if (!user) {
      const err = new Error('Authentication required');
      err.statusCode = 401;
      throw err;
    }

    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      const err = new Error('Message text cannot be empty');
      err.statusCode = 400;
      throw err;
    }

    // Enforce authorization
    const conversation = await this.getConversation(conversationId, user);

    let senderRole;
    let receiverId;
    let senderName;
    let isConsumer;

    if (user.role === 'admin') {
      senderRole = 'admin';
      receiverId = conversation.userId;
      senderName = user.name || 'Support Team';
      isConsumer = false;
    } else if (user.id === conversation.userId) {
      senderRole = 'consumer';
      receiverId = conversation.merchantId;
      senderName = user.name || 'Customer';
      isConsumer = true;
    } else {
      senderRole = 'business';
      receiverId = conversation.userId;
      senderName = conversation.merchant?.name || user.name || 'Merchant';
      isConsumer = false;
    }

    const [message, updatedConversation] = await this.prisma.$transaction([
      this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          merchantId: conversation.merchantId,
          senderId: user.id,
          senderRole,
          sender: senderName,
          receiverId,
          text,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          read: false
        }
      }),
      this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: text,
          lastMessageAt: new Date(),
          ...(isConsumer
            ? { unreadCountBusiness: { increment: 1 } }
            : { unreadCountConsumer: { increment: 1 } })
        },
        include: {
          merchant: {
            select: { id: true, name: true, logo: true, cover: true, suburb: true, category: true, phone: true }
          },
          user: {
            select: { id: true, name: true, email: true, avatar: true, phone: true }
          }
        }
      })
    ]);

    // Emit event for real-time WebSocket subscribers
    this.emit('message:new', {
      conversation: updatedConversation,
      message,
      sender: { id: user.id, name: senderName, role: senderRole }
    });

    return {
      message,
      conversation: updatedConversation
    };
  }

  /**
   * Marks unread messages in a conversation as read by the viewing participant.
   * Resets the caller's unread counter to 0 and updates incoming messages with read: true, readAt: now.
   * Emits 'message:read' event.
   *
   * @param {string} conversationId
   * @param {Object} user - Authenticated viewer
   * @returns {Promise<{ success: boolean, conversationId: string }>}
   */
  async markConversationRead(conversationId, user) {
    const conversation = await this.getConversation(conversationId, user);

    const isConsumer = user.id === conversation.userId;
    const isBusiness = !isConsumer && user.role !== 'admin';

    const now = new Date();

    if (isConsumer) {
      await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { unreadCountConsumer: 0 }
        }),
        this.prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            read: false,
            senderRole: { not: 'consumer' }
          },
          data: {
            read: true,
            readAt: now
          }
        })
      ]);
    } else if (isBusiness) {
      await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { unreadCountBusiness: 0 }
        }),
        this.prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            read: false,
            senderRole: 'consumer'
          },
          data: {
            read: true,
            readAt: now
          }
        })
      ]);
    } else {
      // Admin: clear both
      await this.prisma.$transaction([
        this.prisma.conversation.update({
          where: { id: conversation.id },
          data: { unreadCountConsumer: 0, unreadCountBusiness: 0 }
        }),
        this.prisma.message.updateMany({
          where: {
            conversationId: conversation.id,
            read: false
          },
          data: {
            read: true,
            readAt: now
          }
        })
      ]);
    }

    this.emit('message:read', {
      conversationId: conversation.id,
      userId: user.id
    });

    return {
      success: true,
      conversationId: conversation.id
    };
  }

  /**
   * Retrieves aggregate unread message counts for badge display.
   *
   * @param {Object} user - Authenticated user
   * @returns {Promise<{ totalUnread: number }>}
   */
  async getUnreadCounts(user) {
    if (!user) {
      return { totalUnread: 0 };
    }

    if (user.role === 'business') {
      const merchantId = await this.resolveUserMerchantId(user);
      if (!merchantId) return { totalUnread: 0 };

      const aggregate = await this.prisma.conversation.aggregate({
        where: { merchantId },
        _sum: { unreadCountBusiness: true }
      });
      return {
        totalUnread: aggregate._sum.unreadCountBusiness || 0
      };
    }

    if (user.role === 'admin') {
      const aggregate = await this.prisma.conversation.aggregate({
        _sum: { unreadCountBusiness: true }
      });
      return {
        totalUnread: aggregate._sum.unreadCountBusiness || 0
      };
    }

    // Default: Consumer
    const aggregate = await this.prisma.conversation.aggregate({
      where: { userId: user.id },
      _sum: { unreadCountConsumer: true }
    });
    return {
      totalUnread: aggregate._sum.unreadCountConsumer || 0
    };
  }
}

export const messageService = new MessageService();
