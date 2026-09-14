import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma, messageService } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const consumer1Email = `msg-c1-${timestamp}@test.co.za`;
const consumer2Email = `msg-c2-${timestamp}@test.co.za`;
const business1Email = `msg-b1-${timestamp}@test.co.za`;
const business2Email = `msg-b2-${timestamp}@test.co.za`;
const defaultPassword = 'Password123!';

let consumer1Token = '';
let consumer1User = null;

let consumer2Token = '';
let consumer2User = null;

let business1Token = '';
let business1User = null;
let merchantA = null;

let business2Token = '';
let business2User = null;
let merchantB = null;

let adminToken = '';
let adminUser = null;

let sharedConversationId = null;

before(async () => {
  // 1. Start server on ephemeral port
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}`;
      resolve();
    });
  });

  // 2. Register Consumer 1
  const c1Res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Thandiwe Test',
      email: consumer1Email,
      password: defaultPassword,
      role: 'consumer'
    })
  });
  const c1Data = await c1Res.json();
  consumer1Token = c1Data.token;
  consumer1User = c1Data.user;

  // 3. Register Consumer 2
  const c2Res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sipho Test',
      email: consumer2Email,
      password: defaultPassword,
      role: 'consumer'
    })
  });
  const c2Data = await c2Res.json();
  consumer2Token = c2Data.token;
  consumer2User = c2Data.user;

  // 4. Register Business 1 (Store A)
  const b1Res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Owner Alpha',
      email: business1Email,
      password: defaultPassword,
      role: 'business',
      businessName: `Alpha Store ${timestamp}`,
      category: 'Cosmetics',
      address: '14 Ring Road',
      suburb: 'Alberton North'
    })
  });
  const b1Data = await b1Res.json();
  business1Token = b1Data.token;
  business1User = b1Data.user;
  merchantA = b1Data.business;

  // 5. Register Business 2 (Store B)
  const b2Res = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Owner Beta',
      email: business2Email,
      password: defaultPassword,
      role: 'business',
      businessName: `Beta Store ${timestamp}`,
      category: 'Services',
      address: '22 Voortrekker Ave',
      suburb: 'Alberton CBD'
    })
  });
  const b2Data = await b2Res.json();
  business2Token = b2Data.token;
  business2User = b2Data.user;
  merchantB = b2Data.business;

  // 6. Authenticate Admin (admin@localbiz.co.za / admin123)
  const aRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const aData = await aRes.json();
  adminToken = aData.token;
  adminUser = aData.user;
});

after(async () => {
  if (server) {
    await new Promise(resolve => server.close(resolve));
  }
});

describe('Stage 14 — Consumer/Business Messaging Verification Suite', () => {

  describe('1. Authentication & Security Guardrails', () => {
    it('rejects unauthenticated GET /api/conversations with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.ok(data.error.includes('Authentication required'));
    });

    it('rejects unauthenticated POST /api/conversations with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchantId: merchantA.id })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated GET /api/conversations/unread-count with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/unread-count`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated GET /api/conversations/:id with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/conv-test-id`);
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated POST /api/conversations/:id/messages with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/conv-test-id/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello' })
      });
      assert.equal(res.status, 401);
    });

    it('rejects unauthenticated PATCH /api/conversations/:id/read with 401', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/conv-test-id/read`, {
        method: 'PATCH'
      });
      assert.equal(res.status, 401);
    });
  });

  describe('2. Conversation Initiation & Single-Thread Guarantee', () => {
    it('allows consumer to initiate a conversation with a business', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: merchantA.id,
          message: 'Sawubona! Do you have the Far Away perfume in stock?'
        })
      });

      assert.equal(res.status, 201);
      const conv = await res.json();
      assert.ok(conv.id);
      assert.equal(conv.merchantId, merchantA.id);
      assert.equal(conv.userId, consumer1User.id);
      assert.equal(conv.lastMessage, 'Sawubona! Do you have the Far Away perfume in stock?');
      assert.equal(conv.unreadCountBusiness, 1);
      assert.equal(conv.unreadCountConsumer, 0);

      sharedConversationId = conv.id;
    });

    it('resumes existing conversation without creating duplicate threads', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({
          merchantId: merchantA.id
        })
      });

      assert.equal(res.status, 201);
      const conv = await res.json();
      assert.equal(conv.id, sharedConversationId, 'Should return the exact same conversation ID');
    });

    it('rejects starting conversation with missing merchantId with 400', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({})
      });

      assert.equal(res.status, 400);
    });

    it('rejects starting conversation with non-existent merchantId with 404', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({ merchantId: 'non-existent-merchant-9999' })
      });

      assert.equal(res.status, 404);
    });
  });

  describe('3. Multi-Tenant Authorization & Access Control (RBAC)', () => {
    it('prevents unauthorized consumer from accessing another consumer conversation (403)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}`, {
        headers: { 'Authorization': `Bearer ${consumer2Token}` }
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('Forbidden'));
    });

    it('prevents unauthorized consumer from posting a message to another conversation (403)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer2Token}`
        },
        body: JSON.stringify({ text: 'Unauthorized inquiry' })
      });

      assert.equal(res.status, 403);
    });

    it('prevents unauthorized business from accessing another business conversation (403)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}`, {
        headers: { 'Authorization': `Bearer ${business2Token}` }
      });

      assert.equal(res.status, 403);
      const data = await res.json();
      assert.ok(data.error.includes('Forbidden'));
    });

    it('prevents unauthorized business from sending a message to another business conversation (403)', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${business2Token}`
        },
        body: JSON.stringify({ text: 'Intruder reply' })
      });

      assert.equal(res.status, 403);
    });
  });

  describe('4. Messaging Lifecycle: Send, Receive, Read Status & Unread Counters', () => {
    it('verifies business receives customer conversation with unread badge count', async () => {
      // 1. Check unread count
      const countRes = await fetch(`${baseUrl}/api/conversations/unread-count`, {
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });
      assert.equal(countRes.status, 200);
      const countData = await countRes.json();
      assert.ok(countData.totalUnread >= 1, 'Business must see at least 1 unread message');

      // 2. List conversations
      const listRes = await fetch(`${baseUrl}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });
      assert.equal(listRes.status, 200);
      const convs = await listRes.json();
      const target = convs.find(c => c.id === sharedConversationId);
      assert.ok(target, 'Conversation must appear in business conversation list');
      assert.equal(target.unreadCountBusiness, 1);
    });

    it('business marks conversation as read, resetting unread count', async () => {
      const readRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });
      assert.equal(readRes.status, 200);

      // Verify unread count is now 0 for business
      const countRes = await fetch(`${baseUrl}/api/conversations/unread-count`, {
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });
      const countData = await countRes.json();
      assert.equal(countData.totalUnread, 0);

      // Verify thread messages have read: true
      const threadRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}`, {
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });
      const thread = await threadRes.json();
      assert.equal(thread.unreadCountBusiness, 0);
      const lastMsg = thread.messages[thread.messages.length - 1];
      assert.equal(lastMsg.read, true);
      assert.ok(lastMsg.readAt);
    });

    it('business responds to customer message', async () => {
      const replyText = 'Yes Thandiwe! We have 3 bottles of Far Away in stock ready for collection today.';
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${business1Token}`
        },
        body: JSON.stringify({ text: replyText })
      });

      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.message.id);
      assert.equal(data.message.text, replyText);
      assert.equal(data.message.senderRole, 'business');
      assert.equal(data.conversation.lastMessage, replyText);
      assert.equal(data.conversation.unreadCountConsumer, 1);
      assert.equal(data.conversation.unreadCountBusiness, 0);
    });

    it('consumer receives business response and unread counter increments', async () => {
      // 1. Consumer unread count
      const countRes = await fetch(`${baseUrl}/api/conversations/unread-count`, {
        headers: { 'Authorization': `Bearer ${consumer1Token}` }
      });
      const countData = await countRes.json();
      assert.ok(countData.totalUnread >= 1);

      // 2. Fetch conversation thread
      const threadRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}`, {
        headers: { 'Authorization': `Bearer ${consumer1Token}` }
      });
      assert.equal(threadRes.status, 200);
      const thread = await threadRes.json();
      assert.equal(thread.messages.length, 2);
      assert.equal(thread.messages[1].senderRole, 'business');
      assert.equal(thread.messages[1].read, false);

      // 3. Consumer marks as read
      const markRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${consumer1Token}` }
      });
      assert.equal(markRes.status, 200);

      // 4. Verify unread count is 0
      const countResAfter = await fetch(`${baseUrl}/api/conversations/unread-count`, {
        headers: { 'Authorization': `Bearer ${consumer1Token}` }
      });
      const countDataAfter = await countResAfter.json();
      assert.equal(countDataAfter.totalUnread, 0);
    });

    it('rejects sending empty message with 400', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({ text: '   ' })
      });

      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('required') || data.error.includes('empty'));
    });
  });

  describe('5. Real-Time Architecture & EventEmitter Readiness', () => {
    it('messageService emits "message:new" when message is sent', async () => {
      let emitted = false;
      let payload = null;

      const handler = (data) => {
        if (data.conversation?.id === sharedConversationId) {
          emitted = true;
          payload = data;
        }
      };

      messageService.on('message:new', handler);

      const sendRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${consumer1Token}`
        },
        body: JSON.stringify({ text: 'Realtime event test message' })
      });

      assert.equal(sendRes.status, 201);
      messageService.off('message:new', handler);

      assert.ok(emitted, 'message:new event must be emitted');
      assert.equal(payload.message.text, 'Realtime event test message');
      assert.equal(payload.sender.id, consumer1User.id);
    });

    it('messageService emits "message:read" when conversation is marked read', async () => {
      let readEmitted = false;
      let readPayload = null;

      const handler = (data) => {
        if (data.conversationId === sharedConversationId) {
          readEmitted = true;
          readPayload = data;
        }
      };

      messageService.on('message:read', handler);

      const markRes = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${business1Token}` }
      });

      assert.equal(markRes.status, 200);
      messageService.off('message:read', handler);

      assert.ok(readEmitted, 'message:read event must be emitted');
      assert.equal(readPayload.conversationId, sharedConversationId);
    });
  });

  describe('6. Super Admin Governance & Global Access', () => {
    it('super admin can view any conversation thread', async () => {
      const res = await fetch(`${baseUrl}/api/conversations/${sharedConversationId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      const conv = await res.json();
      assert.equal(conv.id, sharedConversationId);
      assert.ok(Array.isArray(conv.messages));
    });

    it('super admin can list conversations across the platform', async () => {
      const res = await fetch(`${baseUrl}/api/conversations`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      assert.equal(res.status, 200);
      const convs = await res.json();
      assert.ok(convs.length >= 1);
    });
  });
});
