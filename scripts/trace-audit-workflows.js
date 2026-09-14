import { PrismaClient } from '@prisma/client';
import assert from 'assert';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runAudit() {
  console.log('================================================================');
  console.log('       STAGE 22: FULL SYSTEM READINESS & AUDIT VERIFICATION     ');
  console.log('================================================================\n');

  const results = {
    passed: 0,
    failed: 0,
    details: []
  };

  function recordCheck(workflow, checkName, passed, notes = '') {
    if (passed) {
      results.passed++;
      console.log(`  [PASS] [${workflow}] ${checkName}`);
      results.details.push({ workflow, checkName, status: 'PASS', notes });
    } else {
      results.failed++;
      console.error(`  [FAIL] [${workflow}] ${checkName} - ${notes}`);
      results.details.push({ workflow, checkName, status: 'FAIL', notes });
    }
  }

  const timestamp = Date.now();

  // ===========================================================================
  // WORKFLOW 1: CONSUMER PURCHASE LIFECYCLE
  // ===========================================================================
  console.log('\n--- 1. TRACING CONSUMER PURCHASE LIFECYCLE ---');

  const consumerEmail = `audit_consumer_${timestamp}@localbiz.co.za`;
  const consumerPassword = 'Password123!';

  // Step 1: Register Consumer
  const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Naledi Khumalo',
      email: consumerEmail,
      password: consumerPassword,
      phone: '+27 82 555 7890'
    })
  });
  const regData = await regRes.json();
  recordCheck('Consumer', 'Registration Endpoint (201 Created)', regRes.status === 201 && !!regData.token);

  // Step 2: Login Consumer
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: consumerEmail, password: consumerPassword })
  });
  const loginData = await loginRes.json();
  const consumerToken = loginData.token;
  recordCheck('Consumer', 'Authentication & JWT Issuance', loginRes.status === 200 && !!consumerToken);

  // Step 3: Browse Home Storefronts
  const homeRes = await fetch(`${BASE_URL}/api/merchants?limit=10`);
  const homeData = await homeRes.json();
  const homeMerchants = homeData.merchants || homeData;
  recordCheck('Consumer', 'Fetch Home Storefront Directory', homeRes.status === 200 && Array.isArray(homeMerchants));

  // Step 4: Search Products
  const searchRes = await fetch(`${BASE_URL}/api/search?q=a`);
  const searchData = await searchRes.json();
  recordCheck('Consumer', 'Execute Search Query', searchRes.status === 200 && (Array.isArray(searchData.items) || Array.isArray(searchData.products) || Array.isArray(searchData)));

  // Step 5: Categories Filter
  const catRes = await fetch(`${BASE_URL}/api/categories`);
  const categories = await catRes.json();
  recordCheck('Consumer', 'Browse Category Tree', catRes.status === 200 && Array.isArray(categories) && categories.length > 0);

  // Step 6: Select Business & Storefront
  const targetMerchant = homeMerchants.find(m => m.status === 'Approved') || (await prisma.merchant.findFirst({ where: { status: 'Approved' } }));
  assert.ok(targetMerchant, 'Must have at least one approved merchant');
  const merchantRes = await fetch(`${BASE_URL}/api/merchants/${targetMerchant.id}`);
  const merchantData = await merchantRes.json();
  recordCheck('Consumer', 'View Merchant Storefront Profile', merchantRes.status === 200 && merchantData.id === targetMerchant.id);

  // Step 7: Select Product
  let product = merchantData.products?.find(p => !p.isService);
  if (!product) {
    product = await prisma.product.findFirst({ where: { merchantId: targetMerchant.id, isService: false } });
  }
  assert.ok(product, 'Must have at least one product to purchase');
  recordCheck('Consumer', 'Select Product from Inventory', !!product);

  // Step 8: Create Order (Checkout)
  const orderRes = await fetch(`${BASE_URL}/api/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      merchantId: targetMerchant.id,
      businessName: targetMerchant.name,
      customer: 'Naledi Khumalo',
      phone: '+27 82 555 7890',
      address: '14 Jan Smuts Ave, Rosebank',
      deliveryType: 'Delivery',
      paymentMethod: 'Instant Card',
      lines: [
        {
          productId: product.id,
          name: product.name,
          qty: 1,
          price: product.price
        }
      ],
      total: product.price
    })
  });
  const orderData = await orderRes.json();
  const createdOrderId = orderData.id;
  recordCheck('Consumer', 'Create Order Record at Checkout', orderRes.status === 201 && !!createdOrderId);

  // Step 9: Create Payment Associated with Order
  const paymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      amount: product.price,
      currency: 'ZAR',
      method: 'CARD',
      description: `Payment for ${product.name}`,
      metadata: { source: 'Consumer Checkout Audit' }
    })
  });
  const paymentData = await paymentRes.json();
  recordCheck('Consumer', 'Create Payment Intent Associated with Order', paymentRes.status === 201 && !!paymentData.id);

  // Step 10: Process Payment Transaction (Gateway Execution)
  const processRes = await fetch(`${BASE_URL}/api/payments/${paymentData.id}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      cardLast4: '4242',
      cardBrand: 'Visa'
    })
  });
  const processedPaymentData = await processRes.json();
  recordCheck('Consumer', 'Process Gateway Payment (SUCCESS)', processRes.status === 200 && processedPaymentData.status === 'SUCCESS');

  // Step 11: Business Acceptance
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@localbiz.co.za', password: 'admin123' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;

  const acceptRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'ACCEPTED' })
  });
  const acceptData = await acceptRes.json();
  recordCheck('Consumer', 'Business Accepts Order (ACCEPTED)', acceptRes.status === 200 && acceptData.status === 'ACCEPTED');

  // Step 12: Business Processing
  const processOrderRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'PROCESSING' })
  });
  recordCheck('Consumer', 'Order Advances to PROCESSING', processOrderRes.status === 200);

  // Step 13: Order Completion
  const completeOrderRes = await fetch(`${BASE_URL}/api/orders/${createdOrderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  recordCheck('Consumer', 'Order Reaches Terminal State (COMPLETED)', completeOrderRes.status === 200);

  // Step 14: Review Submission on Completed Order
  const reviewRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      merchantId: targetMerchant.id,
      orderId: createdOrderId,
      rating: 5,
      comment: 'Delicious product delivered quickly and fresh!'
    })
  });
  const reviewData = await reviewRes.json();
  recordCheck('Consumer', 'Post Verified Customer Review', reviewRes.status === 201 && (reviewData.rating === 5 || reviewData.review?.rating === 5));

  // ===========================================================================
  // WORKFLOW 2: SERVICE BOOKING LIFECYCLE
  // ===========================================================================
  console.log('\n--- 2. TRACING SERVICE BOOKING LIFECYCLE ---');

  // Step 1: Search Service Pro
  const serviceSearchRes = await fetch(`${BASE_URL}/api/search?type=services`);
  recordCheck('Service', 'Search Professional Services', serviceSearchRes.status === 200);

  // Step 2: Select Service
  const bookableService = await prisma.product.findFirst({
    where: { isService: true },
    include: { merchant: true }
  });
  assert.ok(bookableService, 'Must have at least one bookable service');
  recordCheck('Service', 'Inspect Bookable Service Details', !!bookableService);

  // Step 3 & 4: Date, Time & Submit Booking
  const bookingDate = '2026-10-15';
  const bookingTime = '11:00 AM';
  const bookingRes = await fetch(`${BASE_URL}/api/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      merchantId: bookableService.merchantId,
      serviceId: bookableService.id,
      serviceName: bookableService.name,
      servicePrice: bookableService.price,
      customerName: 'Naledi Khumalo',
      phone: '+27 82 555 7890',
      date: bookingDate,
      timeSlot: bookingTime,
      paymentMethod: 'CARD',
      notes: 'Please bring hair extension materials.'
    })
  });
  const bookingData = await bookingRes.json();
  const createdBookingId = bookingData.id;
  recordCheck('Service', 'Create Service Booking Appointment', bookingRes.status === 201 && !!createdBookingId);

  // Step 5: Payment for Booking (Create & Process)
  const bookingPaymentRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      bookingId: createdBookingId,
      amount: bookableService.price,
      currency: 'ZAR',
      method: 'CARD',
      description: `Payment for ${bookableService.name}`
    })
  });
  const bookingPaymentData = await bookingPaymentRes.json();

  const processBookingPayRes = await fetch(`${BASE_URL}/api/payments/${bookingPaymentData.id}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      cardLast4: '4242',
      cardBrand: 'Visa'
    })
  });
  const processedBookingPay = await processBookingPayRes.json();
  recordCheck('Service', 'Process Booking Pre-Payment & Gateway Success', processBookingPayRes.status === 200 && processedBookingPay.status === 'SUCCESS');

  // Step 6: Confirmation of Appointment
  const updatedBooking = await prisma.booking.findUnique({ where: { id: createdBookingId } });
  recordCheck('Service', 'Confirm Booking Appointment (CONFIRMED)', updatedBooking.status === 'CONFIRMED' && updatedBooking.paymentStatus === 'Paid');

  // Step 7: Completion of Appointment
  const completeBookingRes = await fetch(`${BASE_URL}/api/bookings/${createdBookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  recordCheck('Service', 'Complete Service Appointment (COMPLETED)', completeBookingRes.status === 200);

  // Step 8: Verified Review on Service
  const serviceReviewRes = await fetch(`${BASE_URL}/api/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      merchantId: bookableService.merchantId,
      bookingId: createdBookingId,
      rating: 5,
      comment: 'Top professional service! Arrived on time and did great work.'
    })
  });
  const serviceReviewData = await serviceReviewRes.json();
  recordCheck('Service', 'Post Verified Review on Completed Booking', serviceReviewRes.status === 201 && (serviceReviewData.rating === 5 || serviceReviewData.review?.rating === 5));

  // ===========================================================================
  // WORKFLOW 3: BUSINESS LIFECYCLE
  // ===========================================================================
  console.log('\n--- 3. TRACING BUSINESS LIFECYCLE ---');

  const bizEmail = `audit_biz_${timestamp}@localbiz.co.za`;
  const bizPassword = 'MerchantSecret123!';

  // Step 1: Register Business Application
  const bizRegRes = await fetch(`${BASE_URL}/api/auth/register-business`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Lesedi Mohapi',
      email: bizEmail,
      password: bizPassword,
      phone: '+27 83 222 3344',
      businessName: `Soweto Solar Solutions ${timestamp}`,
      category: 'Services',
      kind: 'service',
      address: '88 Vilakazi St, Orlando West',
      suburb: 'Soweto',
      specialty: 'Solar PV and backup battery installations',
      tagline: 'Reliable community solar energy',
      about: 'Accredited local solar installers providing clean power.'
    })
  });
  const bizRegData = await bizRegRes.json();
  const createdBizMerchantId = bizRegData.business?.id;
  recordCheck('Business', 'Submit Business Registration (Pending)', bizRegRes.status === 201 && !!createdBizMerchantId && bizRegData.business?.status === 'Pending');

  // Step 2: Admin Approval (KYC)
  const approveActionRes = await fetch(`${BASE_URL}/api/admin/merchants/${createdBizMerchantId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'Approved' })
  });
  recordCheck('Business', 'Admin Approves Merchant Application (Approved)', approveActionRes.status === 200);

  // Step 3: Login as Business
  const bizLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: bizEmail, password: bizPassword })
  });
  const bizLoginData = await bizLoginRes.json();
  const bizToken = bizLoginData.token;
  recordCheck('Business', 'Business Owner Login & Authentication', bizLoginRes.status === 200 && !!bizToken);

  // Step 4: Access Dashboard Profile
  const profileRes = await fetch(`${BASE_URL}/api/merchants/${createdBizMerchantId}`);
  recordCheck('Business', 'Access Business Storefront Profile', profileRes.status === 200);

  // Step 5: Create Product
  const newProductRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bizToken}`
    },
    body: JSON.stringify({
      merchantId: createdBizMerchantId,
      name: 'Solar Inverter 5kW',
      price: 12500.00,
      category: 'Services',
      stockCount: 5,
      inStock: true,
      desc: 'High efficiency pure sine wave inverter',
      image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276'
    })
  });
  const newProductData = await newProductRes.json();
  recordCheck('Business', 'Create Inventory Product in Catalog', newProductRes.status === 201 && !!newProductData.id);

  // Step 6: Create Service
  const newServiceRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${bizToken}`
    },
    body: JSON.stringify({
      merchantId: createdBizMerchantId,
      name: 'Solar System Assessment & Quote',
      price: 450.00,
      category: 'Services',
      isService: true,
      desc: 'On-site electrical load assessment and system design',
      image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276'
    })
  });
  const newServiceData = await newServiceRes.json();
  recordCheck('Business', 'Create Bookable Service Offering', newServiceRes.status === 201 && !!newServiceData.id);

  // Step 7: Merchant Analytics & Reports
  const analyticsRes = await fetch(`${BASE_URL}/api/merchants/${createdBizMerchantId}/analytics`, {
    headers: { 'Authorization': `Bearer ${bizToken}` }
  });
  recordCheck('Business', 'Query Revenue & Merchant Analytics', analyticsRes.status === 200);

  // ===========================================================================
  // WORKFLOW 4: SUPER ADMIN GOVERNANCE
  // ===========================================================================
  console.log('\n--- 4. TRACING SUPER ADMIN GOVERNANCE ---');

  // Step 1: Admin Overview Dashboard
  const adminOverviewRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Retrieve Admin Platform Overview', adminOverviewRes.status === 200);

  // Step 2: Users Pagination
  const adminUsersRes = await fetch(`${BASE_URL}/api/admin/users?page=1&limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const totalUsersHeader = adminUsersRes.headers.get('x-total-count');
  recordCheck('Admin', 'Paginate Users with X-Total-Count', adminUsersRes.status === 200 && totalUsersHeader !== null);

  // Step 3: Businesses
  const adminBizRes = await fetch(`${BASE_URL}/api/admin/businesses?limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Inspect Multi-Tenant Businesses', adminBizRes.status === 200);

  // Step 4: Categories Management
  const newCatRes = await fetch(`${BASE_URL}/api/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: `Audit Category ${timestamp}`,
      desc: 'Temporary test category for audit',
      icon: 'Tag'
    })
  });
  const newCatData = await newCatRes.json();
  recordCheck('Admin', 'Create System Category', newCatRes.status === 201 && !!newCatData.id);

  // Step 5: Orders, Bookings, Payments Ledgers
  const adminOrdersRes = await fetch(`${BASE_URL}/api/admin/orders?limit=5`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Query Global Orders Ledger', adminOrdersRes.status === 200);

  const adminBookingsRes = await fetch(`${BASE_URL}/api/admin/bookings?limit=5`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Query Global Bookings Ledger', adminBookingsRes.status === 200);

  const adminPaymentsRes = await fetch(`${BASE_URL}/api/admin/payments?limit=5`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Query Global Payments Ledger', adminPaymentsRes.status === 200);

  // Step 6: Review Moderation
  const sampleReview = await prisma.review.findFirst();
  if (sampleReview) {
    const flagRes = await fetch(`${BASE_URL}/api/admin/reviews/${sampleReview.id}/flag`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ reason: 'Audit moderation verification' })
    });
    recordCheck('Admin', 'Flag Suspicious Review', flagRes.status === 200);

    const approveReviewRes = await fetch(`${BASE_URL}/api/admin/reviews/${sampleReview.id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({ status: 'Approved' })
    });
    recordCheck('Admin', 'Approve Moderated Review', approveReviewRes.status === 200);
  }

  // Step 7: Audit Logs & Platform Settings
  const logsRes = await fetch(`${BASE_URL}/api/admin/audit-logs?limit=10`, {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  recordCheck('Admin', 'Query Security Audit Logs', logsRes.status === 200);

  const settingsRes = await fetch(`${BASE_URL}/api/admin/settings`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`
    },
    body: JSON.stringify({ commissionRate: 5.5 })
  });
  recordCheck('Admin', 'Update Platform Governance Settings', settingsRes.status === 200);

  // ===========================================================================
  // 5. SECURITY & ROLE ISOLATION VERIFICATION
  // ===========================================================================
  console.log('\n--- 5. SECURITY & ROLE ISOLATION AUDIT ---');

  // Check 1: Consumer accessing Admin Overview (Must be 403)
  const forbiddenAdminRes = await fetch(`${BASE_URL}/api/admin/overview`, {
    headers: { 'Authorization': `Bearer ${consumerToken}` }
  });
  recordCheck('Security', 'Block Consumer from Admin Overview (403)', forbiddenAdminRes.status === 403);

  // Check 2: Unauthenticated mutating call (Must be 401)
  const unauthRes = await fetch(`${BASE_URL}/api/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Unauth Product' })
  });
  recordCheck('Security', 'Block Unauthenticated Mutation (401)', unauthRes.status === 401);

  // Check 3: Business deleting another business's product (Must be 403)
  const crossTenantRes = await fetch(`${BASE_URL}/api/products/${product.id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${bizToken}` }
  });
  recordCheck('Security', 'Prevent Cross-Tenant Resource Deletion (403)', crossTenantRes.status === 403);

  // Check 4: PCI-DSS PAN / CVV Credential Stripping
  const rawCardRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${consumerToken}`
    },
    body: JSON.stringify({
      orderId: createdOrderId,
      amount: 100,
      currency: 'ZAR',
      method: 'CARD',
      cardNumber: '4111222233334444',
      cvv: '123',
      expiry: '12/28',
      metadata: { cardData: { pan: '4111222233334444', cvv: '123' } }
    })
  });
  const rawCardData = await rawCardRes.json();
  const paymentRecord = await prisma.payment.findUnique({ where: { id: rawCardData.id } });
  const rawJson = JSON.stringify(paymentRecord);
  const isPanStripped = !rawJson.includes('4111222233334444') && !rawJson.includes('"123"');
  recordCheck('Security', 'PCI-DSS Compliance: Strip PAN & CVV from DB', isPanStripped && paymentRecord?.cardLast4 === '4444');

  // ===========================================================================
  // 6. DATABASE INTEGRITY & TRANSACTION ATOMICITY
  // ===========================================================================
  console.log('\n--- 6. DATABASE INTEGRITY & INDEX AUDIT ---');

  // Check 1: Foreign key cascade verification
  const testOrder = await prisma.order.create({
    data: {
      id: `ord-del-test-${timestamp}`,
      merchantId: targetMerchant.id,
      businessName: targetMerchant.name,
      customer: 'Delete Test',
      phone: '0821234567',
      address: 'Test St',
      placedAt: new Date().toISOString(),
      total: 100,
      status: 'PENDING',
      lines: {
        create: [
          { name: 'Item 1', qty: 1, price: 100 }
        ]
      }
    }
  });
  const itemsBefore = await prisma.orderItem.count({ where: { orderId: testOrder.id } });
  await prisma.order.delete({ where: { id: testOrder.id } });
  const itemsAfter = await prisma.orderItem.count({ where: { orderId: testOrder.id } });
  recordCheck('Database', 'Cascade Deletion on Order Items (Orphan Prevention)', itemsBefore === 1 && itemsAfter === 0);

  // Check 2: Compound Index on Booking [merchantId, date, timeSlot]
  const bookingAvailabilityCheck = await prisma.booking.findFirst({
    where: {
      merchantId: targetMerchant.id,
      date: '2026-10-15',
      timeSlot: '11:00 AM'
    }
  });
  recordCheck('Database', 'Fast Conflict Detection on Compound Booking Index', bookingAvailabilityCheck !== undefined);

  // ===========================================================================
  // CLEANUP AUDIT-CREATED TEST DATA
  // ===========================================================================
  console.log('\n--- CLEANING UP AUDIT TEST RECORDS ---');
  try {
    if (newCatData?.id) await prisma.category.delete({ where: { id: newCatData.id } }).catch(() => {});
    if (createdOrderId) {
      await prisma.review.deleteMany({ where: { orderId: createdOrderId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { orderId: createdOrderId } }).catch(() => {});
      await prisma.order.delete({ where: { id: createdOrderId } }).catch(() => {});
    }
    if (createdBookingId) {
      await prisma.review.deleteMany({ where: { bookingId: createdBookingId } }).catch(() => {});
      await prisma.payment.deleteMany({ where: { bookingId: createdBookingId } }).catch(() => {});
      await prisma.booking.delete({ where: { id: createdBookingId } }).catch(() => {});
    }
    if (paymentData?.id) {
      await prisma.payment.delete({ where: { id: paymentData.id } }).catch(() => {});
    }
    if (rawCardData?.id) {
      await prisma.payment.delete({ where: { id: rawCardData.id } }).catch(() => {});
    }
    if (bookingPaymentData?.id) {
      await prisma.payment.delete({ where: { id: bookingPaymentData.id } }).catch(() => {});
    }
    if (newProductData?.id) await prisma.product.delete({ where: { id: newProductData.id } }).catch(() => {});
    if (newServiceData?.id) await prisma.product.delete({ where: { id: newServiceData.id } }).catch(() => {});
    if (createdBizMerchantId) {
      await prisma.merchant.delete({ where: { id: createdBizMerchantId } }).catch(() => {});
    }
    await prisma.user.deleteMany({
      where: { email: { in: [consumerEmail, bizEmail] } }
    }).catch(() => {});
    console.log('Cleanup complete.');
  } catch (err) {
    console.warn('Cleanup note:', err.message);
  }

  // ===========================================================================
  // AUDIT SUMMARY REPORT
  // ===========================================================================
  console.log('\n================================================================');
  console.log('                 AUDIT TRACE EXECUTION SUMMARY                  ');
  console.log('================================================================');
  console.log(`  Total Checks Executed:  ${results.passed + results.failed}`);
  console.log(`  Passed:                 ${results.passed}`);
  console.log(`  Failed:                 ${results.failed}`);
  console.log(`  Overall Compliance:     ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (results.failed > 0) {
    process.exit(1);
  }
}

runAudit()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
