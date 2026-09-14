import { NotificationChannelProvider } from './NotificationChannelProvider.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * InAppNotificationProvider
 * Stores notifications in the local database using Prisma.
 * Scoped by userId and/or role, accessible via in-app notification drawer.
 */
export class InAppNotificationProvider extends NotificationChannelProvider {
  /**
   * @param {string} [name='in_app']
   * @param {PrismaClient} [prismaClient]
   */
  constructor(name = 'in_app', prismaClient = prisma) {
    super(name, 'in_app');
    this.db = prismaClient;
  }

  /**
   * Persists the notification record to the database
   */
  async send(payload) {
    const {
      userId = null,
      role = 'all',
      title,
      message,
      type = 'info',
      link = null,
      metadata = null
    } = payload;

    if (!title || !message) {
      throw new Error('In-app notification requires title and message');
    }

    try {
      const record = await this.db.notification.create({
        data: {
          userId: userId || null,
          role: role || 'all',
          title: title.trim(),
          message: message.trim(),
          type: type || 'info',
          link: link || null,
          metadata: metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
          channel: 'IN_APP',
          read: false
        }
      });

      return {
        success: true,
        channel: this.getType(),
        provider: this.getName(),
        messageId: record.id,
        notification: record
      };
    } catch (err) {
      // Foreign key constraint fallback: if userId does not exist in User table, persist with userId = null
      if (userId && (err.code === 'P2003' || (err.message && err.message.includes('Foreign key')))) {
        try {
          const fallbackMeta = typeof metadata === 'object' && metadata !== null 
            ? { ...metadata, intendedUserId: userId } 
            : { rawMeta: metadata, intendedUserId: userId };

          const fallbackRecord = await this.db.notification.create({
            data: {
              userId: null,
              role: role || 'all',
              title: title.trim(),
              message: message.trim(),
              type: type || 'info',
              link: link || null,
              metadata: JSON.stringify(fallbackMeta),
              channel: 'IN_APP',
              read: false
            }
          });

          return {
            success: true,
            channel: this.getType(),
            provider: this.getName(),
            messageId: fallbackRecord.id,
            notification: fallbackRecord,
            warning: 'User foreign key not found; persisted with role scope and intendedUserId'
          };
        } catch (fallbackErr) {
          return {
            success: false,
            channel: this.getType(),
            provider: this.getName(),
            error: fallbackErr.message
          };
        }
      }

      return {
        success: false,
        channel: this.getType(),
        provider: this.getName(),
        error: err.message
      };
    }
  }
}
