import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';
import { NotificationChannelProvider } from '../services/notification/NotificationChannelProvider.js';
import { EmailNotificationProvider } from '../services/notification/EmailNotificationProvider.js';
import { SmsNotificationProvider } from '../services/notification/SmsNotificationProvider.js';
import { PushNotificationProvider } from '../services/notification/PushNotificationProvider.js';
import { WhatsAppNotificationProvider } from '../services/notification/WhatsAppNotificationProvider.js';
import { NotificationService, notificationService } from '../services/notification/NotificationService.js';
import { paymentService } from '../services/payment/PaymentService.js';

let server;
let baseUrl;

let consumerToken = '';
let consumerUser = null;

let businessToken = '';
let businessUser = null;

let adminToken = '';
let adminUser = null;

let testMerchant = null;

before(async () => {
  // Start server on an ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // Login Consumer
  const cRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'thandiwe@gmail.com', password: 'customer123' })
  });
  const cData = await cRes.json();
  consumerToken = cData.token;
  consumerUser = cData.user;

  // Login Business Owner
  const bRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nomsa@avoncorner.co.za', password: 'merchant123' })
  });
  const bData = await bRes.json();
  businessToken = bData.token;
  businessUser = bData.user;

  // Login Admin
  const aRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;

  // Get a test merchant
  testMerchant = await prisma.merchant.findFirst({
    where: { ownerId: businessUser?.id || undefined }
  });
  if (!testMerchant) {
    testMerchant = await prisma.merchant.findFirst();
  }
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Stage 10 — Notification Engine & Multi-Channel Architecture Suite', () => {

  // =========================================================================
  // 1. PROVIDER ARCHITECTURE & EXTENSIBILITY (Email, SMS, Push, WhatsApp)
  // =========================================================================
  describe('1. Pluggable Channel Provider Architecture', () => {
    it('prevents direct instantiation of abstract NotificationChannelProvider', () => {
      assert.throws(
        () => new NotificationChannelProvider('test'),
        /Cannot construct NotificationChannelProvider abstract instances directly/
      );
    });

    it('requires concrete subclasses to implement send() method', async () => {
      class IncompleteProvider extends NotificationChannelProvider {
        constructor() { super('incomplete', 'custom'); }
      }
      const p = new IncompleteProvider();
      await assert.rejects(
        async () => await p.send({ title: 'T', message: 'M' }),
        /Method 'send\(\)' must be implemented by provider 'incomplete'/
      );
    });

    it('registers and lists channels dynamically', () => {
      const service = new NotificationService();
      const initialChannels = service.listChannels();
      assert.ok(initialChannels.includes('in_app'));
      assert.ok(initialChannels.includes('email'));
      assert.ok(initialChannels.includes('sms'));
      assert.ok(initialChannels.includes('push'));
      assert.ok(initialChannels.includes('whatsapp'));

      class CustomChannel extends NotificationChannelProvider {
        constructor() { super('telegram_bot', 'telegram'); }
        async send(p) { return { success: true, channel: 'telegram', messageId: 'tg-123' }; }
      }

      service.registerChannel('telegram_bot', new CustomChannel());
      assert.ok(service.listChannels().includes('telegram_bot'));
      const retrieved = service.getChannel('telegram_bot');
      assert.equal(retrieved.getName(), 'telegram_bot');
      assert.equal(retrieved.getType(), 'telegram');
    });

    it('dispatches notifications across multiple channels simultaneously (InApp, Email, SMS, WhatsApp)', async () => {
      const service = new NotificationService();
      const emailProvider = service.getChannel('email');
      const smsProvider = service.getChannel('sms');
      const waProvider = service.getChannel('whatsapp');

      emailProvider.clearDeliveryLog();
      smsProvider.clearDeliveryLog();
      waProvider.clearDeliveryLog();

      const res = await service.notify({
        userId: consumerUser.id,
        recipient: 'test-user@localbiz.co.za',
        title: 'Multi-Channel Alert',
        message: 'Your order is ready for collection!',
        metadata: { phone: '+27821194432' }
      }, {
        channels: ['in_app', 'email', 'sms', 'whatsapp']
      });

      assert.equal(res.successfulChannels.length, 4);
      assert.ok(res.successfulChannels.includes('in_app'));
      assert.ok(res.successfulChannels.includes('email'));
      assert.ok(res.successfulChannels.includes('sms'));
      assert.ok(res.successfulChannels.includes('whatsapp'));

      assert.equal(emailProvider.getDeliveryLog().length, 1);
      assert.equal(smsProvider.getDeliveryLog().length, 1);
      assert.equal(waProvider.getDeliveryLog().length, 1);
    });

    it('isolates provider failures without throwing or breaking other channels', async () => {
      const service = new NotificationService();
      class FailingChannel extends NotificationChannelProvider {
        constructor() { super('broken_sms', 'sms'); }
        async send() { throw new Error('SMS Gateway Timeout (504)'); }
      }
      service.registerChannel('broken_sms', new FailingChannel());

      const res = await service.notify({
        userId: consumerUser.id,
        title: 'Resilient Dispatch',
        message: 'Notification with graceful fallback'
      }, {
        channels: ['in_app', 'broken_sms']
      });

      assert.ok(res.successfulChannels.includes('in_app'));
      assert.ok(res.failedChannels.includes('sms') || res.failedChannels.includes('broken_sms'));
    });
  });

  // =========================================================================
  // 2. CONSUMER LIFECYCLE EVENT NOTIFICATIONS (All 12 Events)
  // =========================================================================
  describe('2. Consumer Lifecycle Event Notifications (12 Events)', () => {
    it('1. triggers Consumer Registration welcome notification', async () => {
      const res = await notificationService.notifyConsumerRegistration({
        id: consumerUser.id,
        name: consumerUser.name,
        email: consumerUser.email
      });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.userId, consumerUser.id);
      assert.ok(res.results[0].notification.title.includes('Welcome'));
    });

    it('2. triggers Order Created confirmation notification', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, total: 150.0, phone: '+27821194432', businessName: 'Bakery' };
      const res = await notificationService.notifyOrderCreated(fakeOrder, { name: 'Bakery' });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'order');
      assert.ok(res.results[0].notification.title.includes('Order Placed'));
    });

    it('3. triggers Order Accepted notification', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, businessName: 'Bakery' };
      const res = await notificationService.notifyOrderAccepted(fakeOrder, { name: 'Bakery' });
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Accepted'));
    });

    it('4. triggers Order Rejected notification', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, businessName: 'Bakery' };
      const res = await notificationService.notifyOrderRejected(fakeOrder, { name: 'Bakery' }, 'Out of stock');
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Rejected'));
    });

    it('5. triggers Order Status Changed notification (PROCESSING / READY / OUT_FOR_DELIVERY)', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, businessName: 'Bakery' };
      const res = await notificationService.notifyOrderStatusChanged(fakeOrder, 'ACCEPTED', 'OUT_FOR_DELIVERY');
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.message.includes('out for delivery'));
    });

    it('6. triggers Payment Successful notification', async () => {
      const fakePayment = { id: 'PAY-1', reference: 'LB-ORD-PAY-1', amount: 250.0, userId: consumerUser.id, orderId: 'ORD-TEST-1' };
      const res = await notificationService.notifyPaymentSuccess(fakePayment, { userId: consumerUser.id });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'payment');
      assert.ok(res.results[0].notification.title.includes('Successful'));
    });

    it('7. triggers Payment Failed notification', async () => {
      const fakePayment = { id: 'PAY-2', reference: 'LB-ORD-PAY-2', amount: 250.0, userId: consumerUser.id, orderId: 'ORD-TEST-1' };
      const res = await notificationService.notifyPaymentFailed(fakePayment, { userId: consumerUser.id }, 'Card expired');
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'payment');
      assert.ok(res.results[0].notification.title.includes('Failed'));
    });

    it('8. triggers Booking Confirmed notification', async () => {
      const fakeBooking = { id: 'BK-1', userId: consumerUser.id, serviceName: 'Haircut', date: '2026-09-15', timeSlot: '10:00 AM' };
      const res = await notificationService.notifyBookingConfirmed(fakeBooking, { name: 'Salon Pro' });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'booking');
      assert.ok(res.results[0].notification.title.includes('Confirmed'));
    });

    it('9. triggers Booking Rejected notification', async () => {
      const fakeBooking = { id: 'BK-1', userId: consumerUser.id, serviceName: 'Haircut', date: '2026-09-15' };
      const res = await notificationService.notifyBookingRejected(fakeBooking, { name: 'Salon Pro' }, 'Provider fully booked');
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Rejected'));
    });

    it('10. triggers Booking Changed / Rescheduled notification', async () => {
      const fakeBooking = { id: 'BK-1', userId: consumerUser.id, serviceName: 'Haircut', date: '2026-09-15', timeSlot: '10:00 AM' };
      const res = await notificationService.notifyBookingChanged(fakeBooking, { newDate: '2026-09-16', newTime: '11:00 AM' });
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Rescheduled'));
    });

    it('11. triggers Order Completed notification', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, businessName: 'Bakery' };
      const res = await notificationService.notifyOrderCompleted(fakeOrder, { name: 'Bakery' });
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Completed'));
    });

    it('12. triggers Review Reminder notification', async () => {
      const fakeOrder = { id: 'ORD-TEST-1', userId: consumerUser.id, businessName: 'Bakery', merchantId: 'm-bakery' };
      const res = await notificationService.notifyReviewReminder(consumerUser, fakeOrder);
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'review');
      assert.ok(res.results[0].notification.title.includes('experience'));
    });
  });

  // =========================================================================
  // 3. BUSINESS NOTIFICATION TRIGGERS (5 Events)
  // =========================================================================
  describe('3. Business Lifecycle Event Notifications (5 Events)', () => {
    it('1. triggers New Order notification to merchant owner', async () => {
      const fakeOrder = { id: 'ORD-BIZ-1', customer: 'John Doe', total: 450.0 };
      const res = await notificationService.notifyNewOrder(fakeOrder, { ownerId: businessUser.id });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.role, 'business');
      assert.equal(res.results[0].notification.userId, businessUser.id);
      assert.ok(res.results[0].notification.title.includes('New Order'));
    });

    it('2. triggers New Booking notification to merchant owner', async () => {
      const fakeBooking = { id: 'BK-BIZ-1', customerName: 'Alice', serviceName: 'Plumbing', date: '2026-09-20', timeSlot: '14:00' };
      const res = await notificationService.notifyNewBooking(fakeBooking, { ownerId: businessUser.id });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.role, 'business');
      assert.ok(res.results[0].notification.title.includes('New Appointment'));
    });

    it('3. triggers Payment Received notification to business', async () => {
      const fakePayment = { id: 'PAY-BIZ-1', reference: 'LB-BK-10', amount: 350.0, bookingId: 'BK-BIZ-1' };
      const res = await notificationService.notifyPaymentReceived(fakePayment, { merchant: { ownerId: businessUser.id } });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'payment');
      assert.ok(res.results[0].notification.title.includes('Payment Received'));
    });

    it('4. triggers Order & Booking Cancellation notification to business', async () => {
      const fakeOrder = { id: 'ORD-CANCEL-1', merchant: { ownerId: businessUser.id } };
      const res = await notificationService.notifyCancellation('order', fakeOrder, 'Thandiwe Nkosi', 'Change of plans');
      assert.ok(res.results[0].success);
      assert.ok(res.results[0].notification.title.includes('Cancelled'));
    });

    it('5. triggers New Review notification to business', async () => {
      const fakeReview = { id: 'REV-1', userName: 'Thandiwe', rating: 5, comment: 'Exceptional service and friendly staff!' };
      const res = await notificationService.notifyNewReview(fakeReview, { name: 'Avon Corner', ownerId: businessUser.id });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.type, 'review');
      assert.ok(res.results[0].notification.title.includes('5 Stars'));
    });
  });

  // =========================================================================
  // 4. ADMIN NOTIFICATION TRIGGERS (3 Events)
  // =========================================================================
  describe('4. Admin Lifecycle Event Notifications (3 Events)', () => {
    it('1. triggers New Business Registration notification for administrators', async () => {
      const res = await notificationService.notifyNewBusinessRegistration(
        { id: 'b-new-1', name: 'Fresh Bakery Deli', suburb: 'Alberton' },
        { name: 'Sipho Zulu' }
      );
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.role, 'admin');
      assert.equal(res.results[0].notification.type, 'approval');
    });

    it('2. triggers Platform Report notification for administrators', async () => {
      const res = await notificationService.notifyReportCreated({
        id: 'rep-101',
        type: 'Inappropriate Content',
        reporter: 'Consumer User',
        reason: 'Misleading product photo',
        target: 'Product #45'
      });
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.role, 'admin');
      assert.equal(res.results[0].notification.type, 'alert');
    });

    it('3. triggers Important System Event notification for administrators', async () => {
      const res = await notificationService.notifyAdminSystemEvent(
        'MAINTENANCE_TOGGLE',
        'Platform Maintenance Mode',
        'Maintenance mode was enabled by system administrator.'
      );
      assert.ok(res.results[0].success);
      assert.equal(res.results[0].notification.role, 'admin');
      assert.equal(res.results[0].notification.type, 'system');
    });
  });

  // =========================================================================
  // 5. REST API ENDPOINTS & RBAC SECURITY
  // =========================================================================
  describe('5. Notification REST API Endpoints & RBAC Security', () => {
    let testNotificationId = '';

    before(async () => {
      // Create a test notification for consumer
      const notif = await prisma.notification.create({
        data: {
          userId: consumerUser.id,
          role: 'consumer',
          title: 'REST API Test Notification',
          message: 'Testing GET, PUT, and DELETE operations',
          read: false,
          type: 'info'
        }
      });
      testNotificationId = notif.id;
    });

    it('GET /api/notifications returns notification array scoped to consumer', async () => {
      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.ok(data.some(n => n.id === testNotificationId));
    });

    it('GET /api/notifications?unreadOnly=true filters out read notifications', async () => {
      const res = await fetch(`${baseUrl}/api/notifications?unreadOnly=true`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      assert.ok(data.every(n => n.read === false));
    });

    it('PUT /api/notifications/:id/read marks single notification as read', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${testNotificationId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.id, testNotificationId);
      assert.equal(data.read, true);

      // Verify in DB
      const inDb = await prisma.notification.findUnique({ where: { id: testNotificationId } });
      assert.equal(inDb.read, true);
    });

    it('PATCH /api/notifications/:id/read backward-compatible endpoint works', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/${testNotificationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.read, true);
    });

    it('PUT /api/notifications/read-all marks all notifications as read', async () => {
      // Create an unread notification first
      await prisma.notification.create({
        data: {
          userId: consumerUser.id,
          role: 'consumer',
          title: 'Unread 1',
          message: 'Message 1',
          read: false
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications/read-all`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.count >= 1);

      // Verify no unread remaining for consumer
      const unread = await prisma.notification.count({
        where: { userId: consumerUser.id, read: false }
      });
      assert.equal(unread, 0);
    });

    it('DELETE /api/notifications/:id deletes notification successfully', async () => {
      const notifToDelete = await prisma.notification.create({
        data: {
          userId: consumerUser.id,
          role: 'consumer',
          title: 'To Be Deleted',
          message: 'Goodbye',
          read: true
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications/${notifToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(data.id, notifToDelete.id);

      const check = await prisma.notification.findUnique({ where: { id: notifToDelete.id } });
      assert.equal(check, null);
    });

    it('DELETE /api/notifications/:id returns 404 for non-existent ID', async () => {
      const res = await fetch(`${baseUrl}/api/notifications/non-existent-id`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 404);
    });

    it('prevents Consumer B from deleting Consumer A private notification (403 Forbidden)', async () => {
      const privateNotif = await prisma.notification.create({
        data: {
          userId: businessUser.id,
          role: 'business',
          title: 'Private Merchant Alert',
          message: 'Confidential business ledger',
          read: false
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications/${privateNotif.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('prevents non-admin user from deleting global system broadcast notification (403 Forbidden)', async () => {
      const broadcastNotif = await prisma.notification.create({
        data: {
          userId: null,
          role: 'all',
          title: 'System Wide Broadcast',
          message: 'Maintenance at 2am',
          read: false
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications/${broadcastNotif.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('prevents Consumer from marking another user private notification as read (403 Forbidden)', async () => {
      const otherUserNotif = await prisma.notification.create({
        data: {
          userId: businessUser.id,
          role: 'business',
          title: 'Business Private Financial Statement',
          message: 'Confidential payout statement',
          read: false
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications/${otherUserNotif.id}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 403);
    });

    it('strict isolation: Consumer A GET /api/notifications never contains Consumer B notifications', async () => {
      const otherUser = await prisma.user.create({
        data: {
          email: `other-consumer-${Date.now()}@gmail.com`,
          password: 'hashedpassword',
          name: 'Other Customer',
          role: 'consumer'
        }
      });

      const otherConsumerNotif = await prisma.notification.create({
        data: {
          userId: otherUser.id,
          role: 'consumer',
          title: 'Other Consumer Confidential Notice',
          message: 'Private order details for User XYZ',
          read: false
        }
      });

      const res = await fetch(`${baseUrl}/api/notifications`, {
        headers: { 'Authorization': `Bearer ${consumerToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(!data.some(n => n.id === otherConsumerNotif.id));
    });

    it('POST /api/reports submits platform report and creates admin alert notification', async () => {
      const res = await fetch(`${baseUrl}/api/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          type: 'Listing Moderation',
          target: 'Product',
          targetId: 'prod-99',
          reason: 'Incorrect pricing displayed',
          details: 'Price was listed as R0.00'
        })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.report.id);

      // Verify admin received notification
      const adminNotifs = await prisma.notification.findMany({
        where: { role: 'admin', type: 'alert' },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(adminNotifs.some(n => n.message.includes('Incorrect pricing displayed')));
    });

    it('GET /api/business/notifications enforces multi-tenant scoping (Business B cannot see Business A private notifications)', async () => {
      // Register Business B user
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Business B Owner',
          email: `biz-b-${Date.now()}@gmail.com`,
          phone: '+27 82 999 1122',
          password: 'Password123!',
          role: 'business'
        })
      });
      assert.equal(regRes.status, 201);
      const regData = await regRes.json();
      const bizBToken = regData.token;

      // Create private notification targeted to businessUser (Business A)
      const bizANotif = await prisma.notification.create({
        data: {
          userId: businessUser.id,
          role: 'business',
          title: 'Business A Private Order Summary',
          message: 'Sensitive store transaction details for Store A',
          read: false
        }
      });

      // Business B fetches /api/business/notifications
      const res = await fetch(`${baseUrl}/api/business/notifications`, {
        headers: { 'Authorization': `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.ok(Array.isArray(data));
      // Must NOT contain Business A's private notification
      assert.ok(!data.some(n => n.id === bizANotif.id), 'Business B must not see Business A private notifications');
    });

    it('InAppNotificationProvider resiliently handles non-existent foreign key userId by falling back to userId: null with intendedUserId in metadata', async () => {
      const nonExistentUserId = `user-non-existent-${Date.now()}`;
      const result = await notificationService.notify({
        userId: nonExistentUserId,
        role: 'consumer',
        title: 'Ghost Account Notification',
        message: 'Order placed by guest / deleted account',
        type: 'order',
        metadata: { ghostOrderId: 'ord-ghost-123' }
      });

      assert.equal(result.results[0].success, true);
      const notifId = result.results[0].messageId;

      const saved = await prisma.notification.findUnique({
        where: { id: notifId }
      });
      assert.ok(saved);
      assert.equal(saved.userId, null);
      assert.ok(saved.metadata.includes(nonExistentUserId));
    });
  });

  // =========================================================================
  // 6. END-TO-END SYSTEM EVENT INTEGRATION (Orders, Bookings, Reviews, Payments)
  // =========================================================================
  describe('6. End-to-End System Event Integration', () => {
    it('creates an order and automatically dispatches notifications to merchant and consumer', async () => {
      // Fetch an active product
      const product = await prisma.product.findFirst({
        where: { inStock: true, stockCount: { gte: 5 } }
      });

      const res = await fetch(`${baseUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          merchantId: product.merchantId,
          deliveryType: 'Delivery',
          customer: consumerUser.name,
          phone: '+27 82 119 4432',
          address: '14 Voortrekker Ave',
          lines: [{ productId: product.id, qty: 1, price: product.price, name: product.name }]
        })
      });

      assert.equal(res.status, 201);
      const order = await res.json();

      // Check consumer received notification
      const consumerNotifs = await prisma.notification.findMany({
        where: { userId: consumerUser.id, type: 'order' },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(consumerNotifs.some(n => n.message.includes(order.id)));
    });

    it('advancing order status to COMPLETED triggers Order Completed and Review Reminder', async () => {
      const product = await prisma.product.findFirst();
      const order = await prisma.order.create({
        data: {
          id: `ORD-E2E-${Date.now()}`,
          merchantId: product.merchantId,
          businessName: 'Local Corner',
          customer: consumerUser.name,
          phone: '+27 82 119 4432',
          address: 'Voortrekker St',
          placedAt: '2026-09-09',
          status: 'DELIVERED',
          total: 100.0,
          userId: consumerUser.id
        }
      });

      const res = await fetch(`${baseUrl}/api/orders/${order.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });

      assert.equal(res.status, 200);

      // Check review reminder notification was sent to consumer
      const reminders = await prisma.notification.findMany({
        where: { userId: consumerUser.id, type: 'review' },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(reminders.some(r => r.title.includes('experience')));
    });

    it('submitting a merchant review automatically triggers New Review notification to merchant', async () => {
      const merchant = await prisma.merchant.findFirst();
      const res = await fetch(`${baseUrl}/api/merchants/${merchant.id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumerToken}`
        },
        body: JSON.stringify({
          rating: 5,
          comment: 'Fantastic quality and prompt service!',
          userName: consumerUser.name
        })
      });

      assert.equal(res.status, 201);

      // Check review notification was created
      const reviewNotifs = await prisma.notification.findMany({
        where: { type: 'review' },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(reviewNotifs.some(n => n.message.includes('Fantastic quality')));
    });

    it('processing a payment successfully dispatches payment notification to customer', async () => {
      const product = await prisma.product.findFirst();
      const order = await prisma.order.create({
        data: {
          id: `ORD-PAY-E2E-${Date.now()}`,
          merchantId: product.merchantId,
          businessName: 'Local Corner',
          customer: consumerUser.name,
          phone: '+27 82 119 4432',
          address: 'Voortrekker St',
          placedAt: '2026-09-09',
          status: 'PENDING',
          total: 85.0,
          userId: consumerUser.id
        }
      });

      const payment = await paymentService.createPayment({
        orderId: order.id,
        amount: 85.0,
        currency: 'ZAR',
        method: 'CARD',
        provider: 'mock',
        customer: { name: consumerUser.name, email: consumerUser.email, phone: '+27821194432' },
        metadata: { userId: consumerUser.id }
      }, consumerUser);

      const processed = await paymentService.processPayment(payment.id, {
        cardBrand: 'VISA',
        cardLast4: '4242'
      }, consumerUser);

      assert.equal(processed.status, 'SUCCESS');

      // Check consumer payment notification
      const payNotifs = await prisma.notification.findMany({
        where: { userId: consumerUser.id, type: 'payment' },
        orderBy: { createdAt: 'desc' }
      });
      assert.ok(payNotifs.some(n => n.message.includes(payment.reference)));
    });
  });
});
