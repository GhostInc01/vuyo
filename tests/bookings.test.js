import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { app, prisma } from '../server.js';

let server;
let baseUrl;

const timestamp = Date.now();
const bizAEmail = `biz_a_booking_${timestamp}@localbiz.co.za`;
const bizBEmail = `biz_b_booking_${timestamp}@localbiz.co.za`;
const consumerAEmail = `consumer_a_booking_${timestamp}@localbiz.co.za`;
const consumerBEmail = `consumer_b_booking_${timestamp}@localbiz.co.za`;
const password = 'TestPassword123!';

let bizAToken = '';
let bizAUser = null;
let bizAMerchant = null;

let bizBToken = '';
let bizBUser = null;
let bizBMerchant = null;

let consumerAToken = '';
let consumerAUser = null;

let consumerBToken = '';
let consumerBUser = null;

let serviceA1 = null;
let serviceA2 = null;
let inactiveService = null;
let serviceB1 = null;

before(async () => {
  // 1. Start ephemeral server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });

  // 2. Register Consumer A
  const cARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Thabo Mbeki',
      email: consumerAEmail,
      phone: '+27 82 555 1001',
      password,
      role: 'consumer'
    })
  });
  const cAData = await cARes.json();
  consumerAToken = cAData.token;
  consumerAUser = cAData.user;

  // 3. Register Consumer B
  const cBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Nandi Madida',
      email: consumerBEmail,
      phone: '+27 82 555 1002',
      password,
      role: 'consumer'
    })
  });
  const cBData = await cBRes.json();
  consumerBToken = cBData.token;
  consumerBUser = cBData.user;

  // 4. Register Business A
  const bARes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sipho Plumbing Owner',
      email: bizAEmail,
      phone: '+27 82 555 2001',
      password,
      role: 'business',
      businessName: 'Sipho Plumbing & Gas',
      category: 'Plumbing'
    })
  });
  const bAData = await bARes.json();
  bizAToken = bAData.token;
  bizAUser = bAData.user;
  bizAMerchant = bAData.business;

  // Approve Business A and configure availability: Mon-Fri, 08:00 - 17:00, 60m slots
  await prisma.merchant.update({
    where: { id: bizAMerchant.id },
    data: {
      status: 'Approved',
      verified: true,
      openingDays: 'Mon,Tue,Wed,Thu,Fri',
      openingHours: '08:00 - 17:00',
      slotDuration: 60
    }
  });

  // 5. Register Business B
  const bBRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lindiwe Hair Stylist',
      email: bizBEmail,
      phone: '+27 82 555 2002',
      password,
      role: 'business',
      businessName: 'Lindiwe Salon & Braids',
      category: 'Beauty'
    })
  });
  const bBData = await bBRes.json();
  bizBToken = bBData.token;
  bizBUser = bBData.user;
  bizBMerchant = bBData.business;

  await prisma.merchant.update({
    where: { id: bizBMerchant.id },
    data: { status: 'Approved', verified: true }
  });

  // 6. Create Service listings
  serviceA1 = await prisma.product.create({
    data: {
      id: `svc-${timestamp}-1`,
      merchantId: bizAMerchant.id,
      name: 'Geyser Repair & Replacement',
      desc: 'Complete geyser assessment, element & thermostat replacement',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      price: 850.00,
      stockCount: 1,
      inStock: true,
      category: 'Plumbing',
      isService: true,
      duration: '60 minutes'
    }
  });

  serviceA2 = await prisma.product.create({
    data: {
      id: `svc-${timestamp}-2`,
      merchantId: bizAMerchant.id,
      name: 'Pipe Leak Detection',
      desc: 'Acoustic and thermal detection of hidden pipe leaks',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      price: 650.00,
      stockCount: 1,
      inStock: true,
      category: 'Plumbing',
      isService: true,
      duration: '45 minutes'
    }
  });

  inactiveService = await prisma.product.create({
    data: {
      id: `svc-${timestamp}-3`,
      merchantId: bizAMerchant.id,
      name: 'Emergency Drain Unblocking',
      desc: 'Jetting and mechanical clearing',
      image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      price: 550.00,
      stockCount: 0,
      inStock: false,
      category: 'Plumbing',
      isService: true
    }
  });

  serviceB1 = await prisma.product.create({
    data: {
      id: `svc-${timestamp}-4`,
      merchantId: bizBMerchant.id,
      name: 'Box Braids Styling',
      desc: 'Knotless or standard box braids',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035',
      price: 450.00,
      stockCount: 1,
      inStock: true,
      category: 'Beauty',
      isService: true
    }
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Stage 8 — Service Booking Engine Test Suite', () => {

  describe('1. Business Availability Configuration & Management', () => {
    it('business can view its availability settings (GET /api/business/availability)', async () => {
      const res = await fetch(`${baseUrl}/api/business/availability`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.openingDays, 'Mon,Tue,Wed,Thu,Fri');
      assert.equal(data.openingHours, '08:00 - 17:00');
      assert.equal(data.slotDuration, 60);
    });

    it('business can update availability schedule (PATCH /api/business/availability)', async () => {
      const res = await fetch(`${baseUrl}/api/business/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          openingDays: 'Mon,Tue,Wed,Thu,Fri,Sat',
          openingHours: '08:30 - 16:30',
          slotDuration: 45
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.openingDays, 'Mon,Tue,Wed,Thu,Fri,Sat');
      assert.equal(data.openingHours, '08:30 - 16:30');
      assert.equal(data.slotDuration, 45);

      // Revert back to 60m for standard test clarity
      await fetch(`${baseUrl}/api/business/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          openingDays: 'Mon,Tue,Wed,Thu,Fri',
          openingHours: '08:00 - 17:00',
          slotDuration: 60
        })
      });
    });

    it('consumers cannot modify business availability (403)', async () => {
      const res = await fetch(`${baseUrl}/api/business/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ openingHours: '00:00 - 23:59' })
      });
      assert.equal(res.status, 403);
    });

    it('consumer can query merchant availability slots for a date (GET /api/merchants/:id/availability)', async () => {
      // 2026-10-14 is a Wednesday (open day)
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/availability?date=2026-10-14`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.merchantId, bizAMerchant.id);
      assert.equal(data.isOpenDay, true);
      assert.ok(Array.isArray(data.slots));
      assert.ok(data.slots.length >= 8); // 08:00 to 17:00 with 60m = 8 slots
      assert.equal(data.slots[0].time, '08:00');
      assert.equal(data.slots[0].available, true);
    });

    it('querying availability on a closed day reflects isOpenDay: false', async () => {
      // 2026-10-18 is a Sunday (closed since Biz A is Mon-Fri)
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/availability?date=2026-10-18`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.isOpenDay, false);
      assert.match(data.message, /closed/i);
    });
  });

  describe('2. Double-Booking Prevention & Validation Guards', () => {
    let bookedSlotBookingId = null;

    it('rejects booking for inactive service (400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: inactiveService.id,
          serviceName: inactiveService.name,
          date: '2026-10-14',
          timeSlot: '10:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /not available|inactive/i);
    });

    it('rejects booking on business closed day (400)', async () => {
      // 2026-10-18 is Sunday (Biz A is Mon-Fri)
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-18',
          timeSlot: '10:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /closed/i);
    });

    it('rejects booking outside operating hours (400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-14',
          timeSlot: '04:00', // Operating hours: 08:00 - 17:00
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /outside operating hours/i);
    });

    it('consumer A successfully books an available slot (Wednesday 2026-10-14 at 10:00)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-14',
          timeSlot: '10:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone,
          notes: 'Please check the geyser breaker too'
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.ok(data.id);
      assert.equal(data.status, 'PENDING');
      assert.equal(data.date, '2026-10-14');
      assert.equal(data.timeSlot, '10:00');
      assert.equal(data.servicePrice, 850);
      bookedSlotBookingId = data.id;
    });

    it('DOUBLE-BOOKING GUARD: Consumer B cannot book the same slot (400 Conflict)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA2.id,
          serviceName: serviceA2.name,
          date: '2026-10-14',
          timeSlot: '10:00', // Same slot on same date for Biz A!
          customerName: consumerBUser.name,
          phone: consumerBUser.phone
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /already booked|unavailable/i);
    });

    it('availability query now shows 10:00 slot marked as unavailable', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/availability?date=2026-10-14`);
      assert.equal(res.status, 200);
      const data = await res.json();
      const slot10 = data.slots.find(s => s.time === '10:00');
      assert.ok(slot10);
      assert.equal(slot10.available, false);
      assert.ok(slot10.bookingId);
    });

    it('different business can book same time without conflict', async () => {
      // Business B at 10:00 on 2026-10-14 is totally independent
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({
          merchantId: bizBMerchant.id,
          serviceId: serviceB1.id,
          serviceName: serviceB1.name,
          date: '2026-10-14',
          timeSlot: '10:00',
          customerName: consumerBUser.name,
          phone: consumerBUser.phone
        })
      });
      assert.equal(res.status, 201);
      const data = await res.json();
      assert.equal(data.status, 'PENDING');
      assert.equal(data.merchantId, bizBMerchant.id);
    });
  });

  describe('3. Complete 8-Stage Booking Lifecycle Transitions', () => {
    let testBookingId = null;

    before(async () => {
      // Create a fresh booking on Thursday 2026-10-15 at 11:00
      const res = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-15',
          timeSlot: '11:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      const data = await res.json();
      testBookingId = data.id;
    });

    it('initial state is PENDING', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'PENDING');
    });

    it('cannot jump directly from PENDING to COMPLETED (invalid transition 400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /invalid status transition/i);
    });

    it('business accepts booking: PENDING -> CONFIRMED', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'CONFIRMED');
    });

    it('business reschedules booking: CONFIRMED -> RESCHEDULED to 2026-10-15 at 14:00', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          status: 'RESCHEDULED',
          date: '2026-10-15',
          timeSlot: '14:00'
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'RESCHEDULED');
      assert.equal(data.date, '2026-10-15');
      assert.equal(data.timeSlot, '14:00');
      assert.equal(data.rescheduledDate, '2026-10-15');
      assert.equal(data.rescheduledTime, '11:00');
    });

    it('previous slot (11:00) is now freed up for another customer after reschedule', async () => {
      const res = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/availability?date=2026-10-15`);
      const data = await res.json();
      const slot11 = data.slots.find(s => s.time === '11:00');
      assert.ok(slot11);
      assert.equal(slot11.available, true);
    });

    it('cannot reschedule into an already occupied slot (400 Conflict)', async () => {
      // First create a booking at 15:00 on 2026-10-15
      const bRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA2.id,
          serviceName: serviceA2.name,
          date: '2026-10-15',
          timeSlot: '15:00',
          customerName: consumerBUser.name,
          phone: consumerBUser.phone
        })
      });
      assert.equal(bRes.status, 201);

      // Now attempt to reschedule testBookingId into 15:00
      const rRes = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({
          status: 'RESCHEDULED',
          date: '2026-10-15',
          timeSlot: '15:00'
        })
      });
      assert.equal(rRes.status, 400);
      const rData = await rRes.json();
      assert.match(rData.error, /already booked|unavailable/i);
    });

    it('business starts appointment: RESCHEDULED -> IN_PROGRESS', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'IN_PROGRESS' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'IN_PROGRESS');
    });

    it('consumer CANNOT cancel a booking that is IN_PROGRESS (400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.match(data.error, /cannot be cancelled once in progress/i);
    });

    it('business completes appointment: IN_PROGRESS -> COMPLETED', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'COMPLETED' })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'COMPLETED');
    });

    it('completed booking is final (cannot transition back 400)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${testBookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 400);
    });
  });

  describe('4. Alternate Flows: Rejections, No-Show, & Consumer Cancellation', () => {
    it('business can reject a pending booking: PENDING -> REJECTED', async () => {
      // Create pending booking
      const createRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-16',
          timeSlot: '09:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      const created = await createRes.json();

      // Reject
      const rejRes = await fetch(`${baseUrl}/api/bookings/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'REJECTED' })
      });
      assert.equal(rejRes.status, 200);
      const rejData = await rejRes.json();
      assert.equal(rejData.status, 'REJECTED');

      // Slot is freed up again
      const availRes = await fetch(`${baseUrl}/api/merchants/${bizAMerchant.id}/availability?date=2026-10-16`);
      const availData = await availRes.json();
      const slot09 = availData.slots.find(s => s.time === '09:00');
      assert.equal(slot09.available, true);
    });

    it('business can mark a confirmed appointment as NO_SHOW', async () => {
      // Create and confirm
      const cRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-16',
          timeSlot: '12:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      const created = await cRes.json();

      await fetch(`${baseUrl}/api/bookings/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });

      // Mark NO_SHOW
      const nsRes = await fetch(`${baseUrl}/api/bookings/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizAToken}`
        },
        body: JSON.stringify({ status: 'NO_SHOW' })
      });
      assert.equal(nsRes.status, 200);
      const nsData = await nsRes.json();
      assert.equal(nsData.status, 'NO_SHOW');
    });

    it('consumer can cancel a pending or confirmed booking: -> CANCELLED', async () => {
      // Create booking
      const cRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-16',
          timeSlot: '13:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      const created = await cRes.json();

      // Consumer cancels
      const cancelRes = await fetch(`${baseUrl}/api/bookings/${created.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(cancelRes.status, 200);
      const cancelData = await cancelRes.json();
      assert.equal(cancelData.status, 'CANCELLED');

      // Freed slot can now be booked by Consumer B
      const rebookRes = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA2.id,
          serviceName: serviceA2.name,
          date: '2026-10-16',
          timeSlot: '13:00',
          customerName: consumerBUser.name,
          phone: consumerBUser.phone
        })
      });
      assert.equal(rebookRes.status, 201);
      const rebookData = await rebookRes.json();
      assert.equal(rebookData.timeSlot, '13:00');
    });
  });

  describe('5. Multi-Tenant RBAC & Security Enforcement', () => {
    let bizABooking = null;
    let bizBBooking = null;

    before(async () => {
      // Booking for Biz A by Consumer A
      const resA = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({
          merchantId: bizAMerchant.id,
          serviceId: serviceA1.id,
          serviceName: serviceA1.name,
          date: '2026-10-19',
          timeSlot: '10:00',
          customerName: consumerAUser.name,
          phone: consumerAUser.phone
        })
      });
      bizABooking = await resA.json();

      // Booking for Biz B by Consumer B
      const resB = await fetch(`${baseUrl}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerBToken}`
        },
        body: JSON.stringify({
          merchantId: bizBMerchant.id,
          serviceId: serviceB1.id,
          serviceName: serviceB1.name,
          date: '2026-10-19',
          timeSlot: '11:00',
          customerName: consumerBUser.name,
          phone: consumerBUser.phone
        })
      });
      bizBBooking = await resB.json();
    });

    it('consumer A listing only includes Consumer A bookings (GET /api/bookings)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${consumerAToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(list.every(b => b.userId === consumerAUser.id || b.customerName === consumerAUser.name));
      assert.ok(!list.some(b => b.id === bizBBooking.id));
    });

    it('business A listing only includes Business A bookings (GET /api/bookings)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings`, {
        headers: { Authorization: `Bearer ${bizAToken}` }
      });
      assert.equal(res.status, 200);
      const list = await res.json();
      assert.ok(list.every(b => b.merchantId === bizAMerchant.id));
      assert.ok(!list.some(b => b.merchantId === bizBMerchant.id));
    });

    it('consumer B CANNOT fetch consumer A booking detail (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}`, {
        headers: { Authorization: `Bearer ${consumerBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /unauthorized|forbidden|access denied/i);
    });

    it('business B CANNOT fetch business A booking detail (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}`, {
        headers: { Authorization: `Bearer ${bizBToken}` }
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /unauthorized|forbidden|access denied/i);
    });

    it('business B CANNOT modify business A booking status (403 Forbidden)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bizBToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /unauthorized|forbidden|not authorized/i);
    });

    it('consumer CANNOT transition booking to business-only statuses like CONFIRMED (403)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${consumerAToken}`
        },
        body: JSON.stringify({ status: 'CONFIRMED' })
      });
      assert.equal(res.status, 403);
      const data = await res.json();
      assert.match(data.error, /only the business|unauthorized/i);
    });

    it('unauthenticated request CANNOT view booking details (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}`);
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });

    it('unauthenticated request CANNOT mutate booking status (401 Unauthorized)', async () => {
      const res = await fetch(`${baseUrl}/api/bookings/${bizABooking.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' })
      });
      assert.equal(res.status, 401);
      const data = await res.json();
      assert.match(data.error, /authentication required/i);
    });
  });
});
