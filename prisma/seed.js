import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const initialDataPath = path.join(__dirname, '..', 'data', 'initialData.json');
const initialData = JSON.parse(fs.readFileSync(initialDataPath, 'utf8'));
const locationsPath = path.join(__dirname, '..', 'data', 'southAfricaLocations.json');
const southAfricaLocations = JSON.parse(fs.readFileSync(locationsPath, 'utf8'));

async function main() {
  console.log('Seeding SQLite database via Prisma...');

  // Clean existing
  await prisma.userLocation.deleteMany();
  await prisma.businessLocation.deleteMany();
  await prisma.location.deleteMany();
  await prisma.favourite.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.category.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.message.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.kycApproval.deleteMany();
  await prisma.adminSetting.deleteMany();
  await prisma.user.deleteMany();

  // 1. Users (Auth & RBAC)
  const salt = await bcrypt.genSalt(10);
  const passwordAdmin = await bcrypt.hash('admin123', salt);
  const passwordMerchant = await bcrypt.hash('merchant123', salt);
  const passwordConsumer = await bcrypt.hash('customer123', salt);

  const adminUser = await prisma.user.create({
    data: {
      id: 'u-admin-1',
      email: 'admin@localbiz.co.za',
      password: passwordAdmin,
      name: 'Vuyo Admin',
      role: 'admin',
      phone: '+27 11 907 5500',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
    }
  });

  const merchantUser = await prisma.user.create({
    data: {
      id: 'u-merchant-1',
      email: 'nomsa@avoncorner.co.za',
      password: passwordMerchant,
      name: 'Nomsa Dube',
      role: 'business',
      phone: '+27 82 459 1102',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    }
  });

  const consumerUser = await prisma.user.create({
    data: {
      id: 'u-consumer-1',
      email: 'thandiwe@gmail.com',
      password: passwordConsumer,
      name: 'Thandiwe Nkosi',
      role: 'consumer',
      phone: '+27 82 119 4432',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'
    }
  });
  console.log('Seeded Users (Admin, Business, Consumer).');

  // 2. Categories
  const categories = [
    { id: 'cat-beauty', name: 'Beauty & Cosmetics', icon: 'Heart', desc: 'Direct brand agents, skincare, fragrance, salon hair' },
    { id: 'cat-bakery', name: 'Bakery & Food', icon: 'Croissant', desc: 'Township bakeries, fresh bread, hot catering, sweet treats' },
    { id: 'cat-plumbing', name: 'Plumbing & Repairs', icon: 'Wrench', desc: 'Registered PIRB master plumbers, geysers, pipe maintenance' },
    { id: 'cat-electrical', name: 'Electrical & Solar', icon: 'Zap', desc: 'Certified electricians, COCs, solar backup & inverters' },
    { id: 'cat-produce', name: 'Fresh Produce', icon: 'Carrot', desc: 'Organic farm veggies, eggs, locally grown fruit bundles' },
    { id: 'cat-wellness', name: 'Health & Wellness', icon: 'Sparkles', desc: 'Herbal supplements, natural teas, holistic consultations' }
  ];
  for (const cat of categories) {
    await prisma.category.create({ data: cat });
  }
  console.log(`Seeded ${categories.length} Categories.`);

  // 2b. South African Geographic Reference Locations
  for (const loc of southAfricaLocations) {
    await prisma.location.create({ data: loc });
  }
  console.log(`Seeded ${southAfricaLocations.length} South African geographic locations.`);

  // Merchant Geospatial Attributes
  const merchantGeoMap = {
    'b-avon': { lat: -26.2625, lng: 28.1250, city: 'Alberton', province: 'Gauteng', serviceType: 'storefront', serviceRadius: 10 },
    'b-blossom': { lat: -26.2750, lng: 28.1280, city: 'Alberton', province: 'Gauteng', serviceType: 'storefront', serviceRadius: 10 },
    'b-plumb': { lat: -26.2650, lng: 28.1200, city: 'Alberton', province: 'Gauteng', serviceType: 'service_area', serviceRadius: 35, serviceAreas: JSON.stringify(['Alberton', 'Johannesburg', 'Sandton', 'Germiston']) },
    'b-elec': { lat: -26.2917, lng: 28.0972, city: 'Alberton', province: 'Gauteng', serviceType: 'service_area', serviceRadius: 30, serviceAreas: JSON.stringify(['Alberton', 'Johannesburg', 'Boksburg']) },
    'b-bakery': { lat: -26.2610, lng: 28.1240, city: 'Alberton', province: 'Gauteng', serviceType: 'storefront', serviceRadius: 8 },
    'b-produce': { lat: -26.2700, lng: 28.1150, city: 'Alberton', province: 'Gauteng', serviceType: 'storefront', serviceRadius: 15 }
  };

  // 3. Merchants
  for (const m of initialData.merchants) {
    const geo = merchantGeoMap[m.id] || { lat: -26.2625, lng: 28.1250, city: 'Alberton', province: 'Gauteng', serviceType: 'storefront', serviceRadius: 10 };
    await prisma.merchant.create({
      data: {
        id: m.id,
        name: m.name,
        owner: m.owner,
        phone: m.phone,
        kind: m.kind,
        category: m.category,
        tagline: m.tagline,
        suburb: m.suburb,
        city: geo.city,
        province: geo.province,
        latitude: geo.lat,
        longitude: geo.lng,
        serviceRadius: geo.serviceRadius,
        serviceType: geo.serviceType,
        serviceAreas: geo.serviceAreas || null,
        distanceKm: m.distanceKm,
        rating: m.rating,
        reviewCount: m.reviewCount,
        cover: m.cover,
        verified: m.verified,
        status: 'Approved',
        tier: m.tier,
        openNow: m.openNow,
        businessHours: 'Mon - Sat: 08:00 - 17:30',
        respondsIn: m.respondsIn,
        brandId: m.brandId,
        boosted: m.boosted || false,
        rank: m.rank,
        specialty: m.specialty,
        about: m.about,
        ownerId: m.id === 'b-avon' ? merchantUser.id : null
      }
    });

    // Create primary branch location
    await prisma.businessLocation.create({
      data: {
        merchantId: m.id,
        name: `${m.name} - Main Branch`,
        address: `${m.suburb}, ${geo.city}`,
        suburb: m.suburb,
        city: geo.city,
        province: geo.province,
        latitude: geo.lat,
        longitude: geo.lng,
        isPrimary: true,
        locationVerified: true,
        serviceRadius: geo.serviceRadius,
        serviceAreas: geo.serviceAreas || null,
        phone: m.phone
      }
    });
  }

  // Add multi-branch secondary locations for Mzansi Plumbing (b-plumb)
  await prisma.businessLocation.create({
    data: {
      merchantId: 'b-plumb',
      name: 'Mzansi Plumbing - Sandton Branch',
      address: '14 Jan Smuts Ave, Sandton',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2196',
      latitude: -26.1076,
      longitude: 28.0567,
      isPrimary: false,
      locationVerified: true,
      serviceRadius: 25.0,
      phone: '+27 11 883 4500'
    }
  });

  await prisma.businessLocation.create({
    data: {
      merchantId: 'b-plumb',
      name: 'Mzansi Plumbing - Cape Town Service Hub',
      address: '88 Strand St, Cape Town CBD',
      suburb: 'Cape Town CBD',
      city: 'Cape Town',
      province: 'Western Cape',
      postalCode: '8001',
      latitude: -33.9249,
      longitude: 18.4241,
      isPrimary: false,
      locationVerified: true,
      serviceRadius: 30.0,
      phone: '+27 21 424 0001'
    }
  });

  // Create sample user saved locations for consumer
  await prisma.userLocation.create({
    data: {
      userId: consumerUser.id,
      label: 'Home - Sandton',
      formattedAddress: 'Sandton, Johannesburg, Gauteng, 2196',
      suburb: 'Sandton',
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -26.1076,
      longitude: 28.0567,
      locationMode: 'MANUAL_LOCATION',
      isDefault: true
    }
  });

  await prisma.userLocation.create({
    data: {
      userId: consumerUser.id,
      label: 'Work - Midrand',
      formattedAddress: 'Midrand, Johannesburg, Gauteng, 1685',
      suburb: 'Midrand',
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: -25.9984,
      longitude: 28.1263,
      locationMode: 'MANUAL_LOCATION',
      isDefault: false
    }
  });

  console.log(`Seeded ${initialData.merchants.length} merchants with branch locations.`);

  // 4. Products & Services
  for (const p of initialData.products) {
    const isService = p.category === 'Plumbing' || p.category === 'Electrical' || p.name.toLowerCase().includes('call-out') || p.name.toLowerCase().includes('installation') || p.name.toLowerCase().includes('consultation');
    await prisma.product.create({
      data: {
        id: p.id,
        merchantId: p.merchantId,
        name: p.name,
        price: p.price,
        category: p.category,
        inStock: p.inStock,
        stockCount: isService ? 99 : 15,
        isService: isService,
        duration: isService ? '1 to 2 hours' : null,
        image: p.image,
        desc: p.desc
      }
    });
  }
  console.log(`Seeded ${initialData.products.length} products & services.`);

  // 5. Orders & Lines
  for (const o of initialData.orders) {
    await prisma.order.create({
      data: {
        id: o.id,
        merchantId: o.merchantId,
        businessName: o.businessName,
        customer: o.customer,
        phone: o.phone,
        address: o.address,
        placedAt: o.placedAt,
        status: o.status,
        total: o.total,
        deliveryType: 'Delivery',
        paymentMethod: 'Card on Delivery',
        paymentStatus: o.status === 'Delivered' ? 'Paid' : 'Pending',
        lines: {
          create: o.lines.map(l => ({
            name: l.name,
            qty: l.qty,
            price: l.price
          }))
        }
      }
    });
  }
  console.log(`Seeded ${initialData.orders.length} orders.`);

  // 6. Bookings (Service Appointments)
  const sampleBookings = [
    {
      id: 'bk-101',
      merchantId: 'b-plumb',
      userId: consumerUser.id,
      customerName: 'Thandiwe Nkosi',
      phone: '+27 82 119 4432',
      serviceName: 'Emergency Geyser Inspection & Valve Check',
      servicePrice: 450,
      date: '2026-09-12',
      timeSlot: '09:00 AM',
      status: 'Confirmed',
      notes: 'Water pressure dropped suddenly, please bring 15mm copper pipe fittings.'
    },
    {
      id: 'bk-102',
      merchantId: 'b-spark',
      userId: consumerUser.id,
      customerName: 'Thandiwe Nkosi',
      phone: '+27 82 119 4432',
      serviceName: 'Inverter & Load-Shedding DB Board Assessment',
      servicePrice: 650,
      date: '2026-09-14',
      timeSlot: '02:00 PM',
      status: 'Pending',
      notes: 'Need quote for 5kW Deye inverter setup with lithium battery.'
    }
  ];
  for (const b of sampleBookings) {
    await prisma.booking.create({ data: b });
  }
  console.log(`Seeded ${sampleBookings.length} Bookings.`);

  // 7. Reviews
  const sampleReviews = [
    {
      id: 'rev-1',
      merchantId: 'b-avon',
      userId: consumerUser.id,
      userName: 'Thandiwe Nkosi',
      rating: 5,
      comment: 'Nomsa brought my Far Away perfume within 2 hours! Genuine Avon product with original packaging and a lovely free sample.',
      status: 'Approved'
    },
    {
      id: 'rev-2',
      merchantId: 'b-avon',
      userName: 'Lerato Sithole',
      rating: 5,
      comment: 'Super fast response on WhatsApp. So convenient not having to wait 2 weeks for catalog delivery!',
      status: 'Approved'
    },
    {
      id: 'rev-3',
      merchantId: 'b-plumb',
      userName: 'David van der Merwe',
      rating: 5,
      comment: 'Sipho arrived on time, diagnosed the burst pipe cleanly, and provided a certified PIRB job card. Excellent local service.',
      status: 'Approved'
    },
    {
      id: 'rev-4',
      merchantId: 'b-bake',
      userName: 'Zanele Khumalo',
      rating: 5,
      comment: 'Best township bread and scones in Alberton North. Still warm when picked up!',
      status: 'Approved'
    }
  ];
  for (const r of sampleReviews) {
    await prisma.review.create({ data: r });
  }
  console.log(`Seeded ${sampleReviews.length} Reviews.`);

  // 8. Favourites
  await prisma.favourite.create({
    data: {
      userId: consumerUser.id,
      merchantId: 'b-avon'
    }
  });
  await prisma.favourite.create({
    data: {
      userId: consumerUser.id,
      merchantId: 'b-plumb'
    }
  });

  // 9. Promotions
  await prisma.promotion.create({
    data: {
      merchantId: 'b-avon',
      code: 'AVONSPRING15',
      discountPercent: 15,
      description: '15% off all Fragrances for Alberton North residents',
      active: true
    }
  });
  await prisma.promotion.create({
    data: {
      merchantId: 'b-plumb',
      code: 'PIRB10',
      discountPercent: 10,
      description: 'R50 off call-out fee for first-time home owners',
      active: true
    }
  });

  // 10. Messages
  for (const msg of initialData.messages) {
    await prisma.message.create({
      data: {
        id: msg.id,
        merchantId: msg.merchantId,
        sender: msg.sender,
        senderRole: msg.senderRole,
        text: msg.text,
        time: msg.time
      }
    });
  }

  // 11. Campaigns
  for (const c of initialData.campaigns) {
    await prisma.campaign.create({
      data: {
        id: c.id,
        sponsor: c.sponsor,
        headline: c.headline,
        cta: c.cta,
        zone: c.zone,
        status: c.status,
        budget: c.budget,
        impressions: c.impressions,
        clicks: c.clicks,
        ctr: c.ctr
      }
    });
  }

  // 12. KYC Approvals
  for (const app of initialData.approvals) {
    await prisma.kycApproval.create({
      data: {
        id: app.id,
        name: app.name,
        owner: app.owner,
        category: app.category,
        suburb: app.suburb,
        documents: JSON.stringify(app.documents),
        appliedDate: app.appliedDate,
        status: app.status
      }
    });
  }

  // 13. Notifications
  const sampleNotifications = [
    {
      role: 'consumer',
      userId: consumerUser.id,
      title: 'Order Confirmed',
      message: "Nomsa's Avon Corner confirmed your order #LBZ-1042 for delivery.",
      type: 'order'
    },
    {
      role: 'consumer',
      userId: consumerUser.id,
      title: 'Service Call-Out Confirmed',
      message: 'Mzansi Plumbing Works confirmed your appointment for 12 Sep at 09:00 AM.',
      type: 'booking'
    },
    {
      role: 'business',
      userId: merchantUser.id,
      title: 'New Order Received',
      message: 'Thandiwe Nkosi placed an order for Far Away EDP (R320).',
      type: 'order'
    },
    {
      role: 'admin',
      userId: adminUser.id,
      title: 'KYC Document Pending Review',
      message: 'Soweto Artisan Bakery submitted Health Certificate for approval.',
      type: 'approval'
    }
  ];
  for (const n of sampleNotifications) {
    await prisma.notification.create({ data: n });
  }

  // 14. Audit Logs
  await prisma.auditLog.create({
    data: {
      action: 'KYC_APPROVED',
      administrator: 'admin@localbiz.co.za',
      details: 'Approved trade certificates for Mzansi Plumbing Works'
    }
  });
  await prisma.auditLog.create({
    data: {
      action: 'SYSTEM_SETTINGS_UPDATE',
      administrator: 'admin@localbiz.co.za',
      details: 'Platform commission model toggled'
    }
  });

  // 15. Admin Settings
  await prisma.adminSetting.create({
    data: {
      id: 1,
      commissionEnabled: initialData.adminSettings.commissionEnabled,
      commissionRate: initialData.adminSettings.commissionRate,
      minimumSubscription: initialData.adminSettings.minimumSubscription,
      platformName: 'LocalBiz South Africa',
      supportEmail: 'support@localbiz.co.za',
      supportPhone: '+27 11 907 5500',
      defaultRadius: 10.0,
      radiusOptions: '1,2,5,10,25,50,100',
      locationProvider: 'database'
    }
  });

  console.log('Seeding completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

