-- ============================================================================
-- LocalBiz Hyperlocal Business Marketplace Seed Data
-- Dialect: MySQL 8.0+ / MariaDB 10.5+
-- Realistic South African seed dataset
-- Passwords: All hashed with bcrypt (salt rounds: 10)
--   admin123:    $2b$10$a6VO/H6NLu4TLS2VzWZfmuS05/B0GwvQ.rqwUKxWuG4EaaPu0F7/O
--   customer123: $2b$10$rR2EfEkxx/1L5SmFCkbvM.2TuKOVGwV8ZEvy629zOE4.AIRsyShXu
--   merchant123: $2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC
-- ============================================================================

START TRANSACTION;

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. SEED ROLES
-- ----------------------------------------------------------------------------
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'ADMIN', 'Super platform administrator with full governance access'),
(2, 'BUSINESS', 'Verified local merchant or service provider business owner'),
(3, 'CONSUMER', 'Local shopper or community resident purchasing goods and booking services');

-- ----------------------------------------------------------------------------
-- 2. SEED USERS
-- 1 Administrator, 3 Consumers, 5 Business Owners
-- ----------------------------------------------------------------------------
INSERT INTO `users` (`id`, `role_id`, `name`, `email`, `password_hash`, `phone`, `status`, `avatar`) VALUES
-- 1 Super Administrator
(1, 1, 'Vuyo Admin', 'admin@localbiz.co.za', '$2b$10$a6VO/H6NLu4TLS2VzWZfmuS05/B0GwvQ.rqwUKxWuG4EaaPu0F7/O', '+27 11 907 5500', 'ACTIVE', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'),

-- 3 Consumers
(2, 3, 'Thandiwe Nkosi', 'thandiwe@gmail.com', '$2b$10$rR2EfEkxx/1L5SmFCkbvM.2TuKOVGwV8ZEvy629zOE4.AIRsyShXu', '+27 82 119 4432', 'ACTIVE', 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=200&q=80'),
(3, 3, 'Sipho Zulu', 'sipho.zulu@gmail.com', '$2b$10$rR2EfEkxx/1L5SmFCkbvM.2TuKOVGwV8ZEvy629zOE4.AIRsyShXu', '+27 82 555 1234', 'ACTIVE', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'),
(4, 3, 'Lerato Khumalo', 'lerato.khumalo@gmail.com', '$2b$10$rR2EfEkxx/1L5SmFCkbvM.2TuKOVGwV8ZEvy629zOE4.AIRsyShXu', '+27 83 902 4411', 'ACTIVE', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80'),

-- 5 Business Owners
(5, 2, 'Nomsa Dube', 'nomsa@avoncorner.co.za', '$2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC', '+27 82 459 1102', 'ACTIVE', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'),
(6, 2, 'Thabo Moloi', 'thabo@kasibakery.co.za', '$2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC', '+27 83 400 9912', 'ACTIVE', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'),
(7, 2, 'Johan van der Merwe', 'johan@meyersdalplumbing.co.za', '$2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC', '+27 82 300 8877', 'ACTIVE', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80'),
(8, 2, 'Kabelo Sithole', 'kabelo@ekurhulenisolar.co.za', '$2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC', '+27 84 210 5566', 'ACTIVE', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80'),
(9, 2, 'Mama Zola Ndaba', 'zola@organicproduce.co.za', '$2b$10$2VP1So9yP7ju9m.owSNK4ObKLEwDkz9IgDNF7arxGmfpjmeChj7QC', '+27 76 901 3322', 'ACTIVE', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80');

-- ----------------------------------------------------------------------------
-- 3. SEED CATEGORIES
-- ----------------------------------------------------------------------------
INSERT INTO `categories` (`id`, `name`, `slug`, `icon`, `description`) VALUES
(1, 'Beauty & Cosmetics', 'beauty-cosmetics', 'Heart', 'Direct brand agents, skincare, fragrance, salon haircare & personal grooming'),
(2, 'Bakery & Food', 'bakery-food', 'Croissant', 'Township bakeries, fresh bread, hot catering, cakes & artisanal savouries'),
(3, 'Plumbing & Repairs', 'plumbing-repairs', 'Wrench', 'Registered PIRB master plumbers, geysers, pipe maintenance & leak detection'),
(4, 'Electrical & Solar', 'electrical-solar', 'Zap', 'Certified electricians, COCs, solar backup, inverters & battery maintenance'),
(5, 'Fresh Produce', 'fresh-produce', 'Carrot', 'Organic farm veggies, free-range eggs & locally grown seasonal fruit bundles'),
(6, 'Health & Wellness', 'health-wellness', 'Sparkles', 'Natural herbal teas, nutritional supplements, holistic health & consultations');

-- ----------------------------------------------------------------------------
-- 4. SEED BUSINESSES (5 Businesses with KYC statuses)
-- ----------------------------------------------------------------------------
INSERT INTO `businesses` (`id`, `owner_id`, `name`, `description`, `category`, `email`, `phone`, `website`, `logo`, `cover_image`, `status`, `approved_at`) VALUES
(1, 5, 'Nomsa\'s Avon Corner', 'Certified Premier Avon & Justine Brand Agent in Alberton North. Genuine fragrance, skincare, makeup, and same-day delivery.', 'Beauty & Cosmetics', 'orders@avoncorner.co.za', '+27 82 459 1102', 'https://avoncorner.co.za', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1200&q=80', 'APPROVED', '2026-01-15 08:30:00'),

(2, 6, 'Kasi Fresh Bakery', 'Hearty township bakery delivering wood-fired sourdough, fresh buns, vetkoek, and celebration cakes daily across Katlehong & Alberton.', 'Bakery & Food', 'info@kasibakery.co.za', '+27 83 400 9912', 'https://kasibakery.co.za', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=80', 'APPROVED', '2026-01-18 10:00:00'),

(3, 7, 'Meyersdal Master Plumbers', 'Registered PIRB Master Plumbers offering 24/7 geyser repairs, blocked drains, bathroom renovations, and solar geyser conversions.', 'Plumbing & Repairs', 'dispatch@meyersdalplumbing.co.za', '+27 82 300 8877', 'https://meyersdalplumbing.co.za', 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=1200&q=80', 'APPROVED', '2026-02-01 11:15:00'),

(4, 8, 'Ekurhuleni Solar & Electric', 'Licensed master electricians specializing in load shedding backup solutions, lithium inverter setups, and compliance certificates (COCs).', 'Electrical & Solar', 'power@ekurhulenisolar.co.za', '+27 84 210 5566', 'https://ekurhulenisolar.co.za', 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80', 'APPROVED', '2026-02-10 14:00:00'),

(5, 9, 'Zola Organic Farm Stall', 'Family-run organic peri-urban farm stand providing farm-fresh seasonal vegetable crates, raw honey, and free-range pastured eggs.', 'Fresh Produce', 'sales@organicproduce.co.za', '+27 76 901 3322', NULL, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=200&q=80', 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1200&q=80', 'PENDING', NULL);

-- ----------------------------------------------------------------------------
-- 5. SEED BUSINESS_CATEGORIES (Junction)
-- ----------------------------------------------------------------------------
INSERT INTO `business_categories` (`business_id`, `category_id`) VALUES
(1, 1), -- Nomsa -> Beauty & Cosmetics
(2, 2), -- Kasi Fresh -> Bakery & Food
(3, 3), -- Meyersdal -> Plumbing & Repairs
(4, 4), -- Ekurhuleni -> Electrical & Solar
(5, 5), -- Zola Organic -> Fresh Produce
(1, 6); -- Nomsa also offers Health & Wellness skincare supplements

-- ----------------------------------------------------------------------------
-- 6. SEED ADDRESSES
-- ----------------------------------------------------------------------------
INSERT INTO `addresses` (`id`, `user_id`, `business_id`, `type`, `street_address`, `suburb`, `city`, `province`, `postal_code`, `latitude`, `longitude`, `is_default`) VALUES
-- Consumer Addresses
(1, 2, NULL, 'DELIVERY', '14 Voortrekker Ave, Apt 4B', 'Alberton North', 'Alberton', 'Gauteng', '1449', -26.25700000, 28.12100000, 1),
(2, 3, NULL, 'DELIVERY', '88 Michelle Ave', 'Meyersdal', 'Alberton', 'Gauteng', '1448', -26.28900000, 28.09800000, 1),
(3, 4, NULL, 'DELIVERY', '23 Hennie Alberts St', 'Brackenhurst', 'Alberton', 'Gauteng', '1448', -26.31100000, 28.10500000, 1),

-- Business Addresses
(4, NULL, 1, 'BUSINESS', '45 Hendrik Potgieter St', 'Alberton North', 'Alberton', 'Gauteng', '1449', -26.25850000, 28.12320000, 1),
(5, NULL, 2, 'BUSINESS', '102 Sontonga Rd', 'Katlehong', 'Ekurhuleni', 'Gauteng', '1431', -26.33000000, 28.15000000, 1),
(6, NULL, 3, 'BUSINESS', '12 Hennie Alberts St', 'Meyersdal', 'Alberton', 'Gauteng', '1448', -26.29050000, 28.10120000, 1),
(7, NULL, 4, 'BUSINESS', '77 True North Rd', 'Mulbarton', 'Johannesburg', 'Gauteng', '2059', -26.28100000, 28.06200000, 1),
(8, NULL, 5, 'BUSINESS', 'Farm 14, Eikenhof Rd', 'Alberton South', 'Alberton', 'Gauteng', '1448', -26.34000000, 28.08000000, 1);

-- ----------------------------------------------------------------------------
-- 7. SEED BUSINESS_HOURS
-- ----------------------------------------------------------------------------
INSERT INTO `business_hours` (`business_id`, `day_of_week`, `open_time`, `close_time`, `is_closed`) VALUES
-- Business 1: Nomsa's Avon (Mon-Fri 08:30-17:30, Sat 09:00-14:00, Sun Closed)
(1, 'MONDAY', '08:30:00', '17:30:00', 0),
(1, 'TUESDAY', '08:30:00', '17:30:00', 0),
(1, 'WEDNESDAY', '08:30:00', '17:30:00', 0),
(1, 'THURSDAY', '08:30:00', '17:30:00', 0),
(1, 'FRIDAY', '08:30:00', '17:30:00', 0),
(1, 'SATURDAY', '09:00:00', '14:00:00', 0),
(1, 'SUNDAY', NULL, NULL, 1),

-- Business 2: Kasi Fresh Bakery (Mon-Sun 06:00-18:00)
(2, 'MONDAY', '06:00:00', '18:00:00', 0),
(2, 'TUESDAY', '06:00:00', '18:00:00', 0),
(2, 'WEDNESDAY', '06:00:00', '18:00:00', 0),
(2, 'THURSDAY', '06:00:00', '18:00:00', 0),
(2, 'FRIDAY', '06:00:00', '18:00:00', 0),
(2, 'SATURDAY', '06:00:00', '17:00:00', 0),
(2, 'SUNDAY', '07:00:00', '13:00:00', 0),

-- Business 3: Meyersdal Plumbers (Mon-Sat 07:30-17:00)
(3, 'MONDAY', '07:30:00', '17:00:00', 0),
(3, 'TUESDAY', '07:30:00', '17:00:00', 0),
(3, 'WEDNESDAY', '07:30:00', '17:00:00', 0),
(3, 'THURSDAY', '07:30:00', '17:00:00', 0),
(3, 'FRIDAY', '07:30:00', '17:00:00', 0),
(3, 'SATURDAY', '08:00:00', '13:00:00', 0),
(3, 'SUNDAY', NULL, NULL, 1);

-- ----------------------------------------------------------------------------
-- 8. SEED PRODUCTS
-- ----------------------------------------------------------------------------
INSERT INTO `products` (`id`, `business_id`, `category_id`, `name`, `description`, `price`, `stock`, `image`, `status`) VALUES
-- Nomsa's Avon Products
(1, 1, 1, 'Far Away Glamour Eau de Parfum 50ml', 'Luminous Madagascar vanilla, black currant bud, and sophisticated orange blossom.', 260.00, 18, 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),
(2, 1, 1, 'Anew Renewal Protinol Power Serum 30ml', 'Award-winning dual collagen booster restoring 7 cosmetic skin signs in 7 days.', 320.00, 12, 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),
(3, 1, 1, 'Ultra Matte Lipstick - Ruby Kiss', 'Velvety hydrating matte color enriched with nourishing avocado and sesame seed oils.', 115.00, 25, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),

-- Kasi Fresh Bakery Products
(4, 2, 2, 'Kasi Artisan Sourdough Loaf 800g', 'Slow-fermented crusty sourdough baked fresh every dawn in brick ovens.', 32.00, 40, 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),
(5, 2, 2, 'Golden Braai Buns (Pack of 6)', 'Soft sesame sweet potato buns perfect for weekend shisanyama and family braais.', 26.00, 60, 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),
(6, 2, 2, 'Traditional Milk Tart (Melktert 24cm)', 'Silky cinnamon-dusted custard baked into crisp sweet shortcrust pastry.', 85.00, 15, 'https://images.unsplash.com/photo-1535141192574-5d4897c13136?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),

-- Zola Organic Farm Products
(7, 5, 5, 'Township Weekly Harvest Veggie Box', '5kg mixed crate: organic spinach, carrots, sweet potatoes, cabbage, beetroot and onions.', 175.00, 20, 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=70', 'ACTIVE'),
(8, 5, 5, 'Pasture-Raised Free-Range Eggs (30 Tray)', 'Fresh grain-fed brown farm eggs collected daily from roaming pastured hens.', 95.00, 30, 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=70', 'ACTIVE');

-- ----------------------------------------------------------------------------
-- 9. SEED SERVICES
-- ----------------------------------------------------------------------------
INSERT INTO `services` (`id`, `business_id`, `category_id`, `name`, `description`, `price`, `duration`, `booking_required`, `status`) VALUES
-- Meyersdal Master Plumbers
(1, 3, 3, 'Emergency Geyser Replacement & Call-Out', 'Complete PIRB compliance geyser installation, pressure relief valves, and electrical hookup.', 850.00, '2 - 3 hours', 1, 'ACTIVE'),
(2, 3, 3, 'High-Pressure Drain Jetting & CCTV Inspection', 'Clear stubborn root blockages and inspect underground sewer pipes with endoscopic cameras.', 650.00, '1 - 2 hours', 1, 'ACTIVE'),

-- Ekurhuleni Solar & Electric
(3, 4, 4, 'Home Solar & Battery Backup Readiness Audit', 'Professional assessment of DB board, essential loads, roof orientation, and sizing report.', 450.00, '1.5 hours', 1, 'ACTIVE'),
(4, 4, 4, 'Electrical Certificate of Compliance (COC) Inspection', 'Full inspection of residential electrical installation for property transfer or insurance.', 750.00, '2 hours', 1, 'ACTIVE'),

-- Nomsa Beauty Consultation
(5, 1, 1, 'Bridal Makeup & Skincare Consultation', 'Personalized bridal glamour trial, foundation matching, and custom 4-week skincare regimen.', 350.00, '1 hour', 1, 'ACTIVE');

-- ----------------------------------------------------------------------------
-- 10. SEED ORDERS
-- ----------------------------------------------------------------------------
INSERT INTO `orders` (`id`, `order_number`, `customer_id`, `business_id`, `subtotal`, `delivery_fee`, `service_fee`, `discount_amount`, `total_amount`, `status`, `delivery_type`, `delivery_address_id`, `special_notes`) VALUES
-- Order 1: Thandiwe buys Far Away perfume and lipstick (Delivered)
(1, 'LBZ-2026-1001', 2, 1, 375.00, 35.00, 5.00, 0.00, 415.00, 'DELIVERED', 'DELIVERY', 1, 'Please buzz 4B at the intercom gate'),

-- Order 2: Sipho buys bakery goods (Completed / Collected)
(2, 'LBZ-2026-1002', 3, 2, 143.00, 0.00, 5.00, 14.30, 133.70, 'COMPLETED', 'COLLECTION', NULL, 'Collecting before 11am for Sunday family braai'),

-- Order 3: Lerato buys Anew Serum (Out for delivery)
(3, 'LBZ-2026-1003', 4, 1, 320.00, 35.00, 5.00, 0.00, 360.00, 'OUT_FOR_DELIVERY', 'DELIVERY', 3, 'Leave with security guard if not home'),

-- Order 4: Thandiwe buys Fresh Produce Box (Pending acceptance)
(4, 'LBZ-2026-1004', 2, 5, 270.00, 35.00, 5.00, 0.00, 310.00, 'PENDING', 'DELIVERY', 1, 'Please ensure leafy greens are fresh');

-- ----------------------------------------------------------------------------
-- 11. SEED ORDER_ITEMS
-- ----------------------------------------------------------------------------
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `item_name`, `unit_price`, `quantity`, `subtotal`) VALUES
-- Items for Order 1
(1, 1, 1, 'Far Away Glamour Eau de Parfum 50ml', 260.00, 1, 260.00),
(2, 1, 3, 'Ultra Matte Lipstick - Ruby Kiss', 115.00, 1, 115.00),

-- Items for Order 2
(3, 2, 4, 'Kasi Artisan Sourdough Loaf 800g', 32.00, 1, 32.00),
(4, 2, 5, 'Golden Braai Buns (Pack of 6)', 26.00, 1, 26.00),
(5, 2, 6, 'Traditional Milk Tart (Melktert 24cm)', 85.00, 1, 85.00),

-- Items for Order 3
(6, 3, 2, 'Anew Renewal Protinol Power Serum 30ml', 320.00, 1, 320.00),

-- Items for Order 4
(7, 4, 7, 'Township Weekly Harvest Veggie Box', 175.00, 1, 175.00),
(8, 4, 8, 'Pasture-Raised Free-Range Eggs (30 Tray)', 95.00, 1, 95.00);

-- ----------------------------------------------------------------------------
-- 12. SEED BOOKINGS
-- ----------------------------------------------------------------------------
INSERT INTO `bookings` (`id`, `booking_reference`, `customer_id`, `business_id`, `service_id`, `appointment_date`, `start_time`, `end_time`, `service_price`, `address_id`, `status`, `customer_notes`) VALUES
-- Booking 1: Sipho books geyser replacement (Completed)
(1, 'BK-2026-501', 3, 3, 1, '2026-03-01', '09:00:00', '12:00:00', 850.00, 2, 'COMPLETED', 'Water leaking through ceiling valve. Urgent assistance needed.'),

-- Booking 2: Lerato books solar audit (Confirmed)
(2, 'BK-2026-502', 4, 4, 3, '2026-03-12', '14:00:00', '15:30:00', 450.00, 3, 'CONFIRMED', 'Looking to install 5kW inverter with 5kWh lithium battery.'),

-- Booking 3: Thandiwe books bridal makeover (In progress / upcoming)
(3, 'BK-2026-503', 2, 1, 5, '2026-03-18', '11:00:00', '12:00:00', 350.00, 1, 'CONFIRMED', 'Trial run before wedding reception in May.'),

-- Booking 4: Sipho books electrical COC (Pending review)
(4, 'BK-2026-504', 3, 4, 4, '2026-03-25', '10:00:00', '12:00:00', 750.00, 2, 'PENDING', 'Selling house, require official certificate.');

-- ----------------------------------------------------------------------------
-- 13. SEED PAYMENTS
-- ----------------------------------------------------------------------------
INSERT INTO `payments` (`id`, `payment_reference`, `order_id`, `booking_id`, `payer_id`, `amount`, `payment_method`, `status`, `transaction_id`, `paid_at`) VALUES
-- Payment for Order 1 (Card online - Success)
(1, 'PAY-2026-7001', 1, NULL, 2, 415.00, 'CARD', 'SUCCESS', 'TXN_VISA_9831924', '2026-02-28 14:15:20'),

-- Payment for Order 2 (Cash on Collection - Success)
(2, 'PAY-2026-7002', 2, NULL, 3, 133.70, 'CASH_ON_DELIVERY', 'SUCCESS', 'TXN_CASH_102', '2026-03-01 10:45:00'),

-- Payment for Order 3 (Card online - Success)
(3, 'PAY-2026-7003', 3, NULL, 4, 360.00, 'CARD', 'SUCCESS', 'TXN_MC_5521098', '2026-03-05 09:30:11'),

-- Payment for Booking 1 (POS Terminal at handover - Success)
(4, 'PAY-2026-7004', NULL, 1, 3, 850.00, 'POS_TERMINAL', 'SUCCESS', 'TXN_SB_POS_88219', '2026-03-01 12:10:00'),

-- Payment for Booking 2 (EFT / Card - Pending confirmation)
(5, 'PAY-2026-7005', NULL, 2, 4, 450.00, 'CARD', 'SUCCESS', 'TXN_OZOW_119832', '2026-03-08 16:20:00'),

-- Payment for Order 4 (Pending Cash on Delivery)
(6, 'PAY-2026-7006', 4, NULL, 2, 310.00, 'CASH_ON_DELIVERY', 'PENDING', NULL, NULL);

-- ----------------------------------------------------------------------------
-- 14. SEED REVIEWS & REPLIES
-- ----------------------------------------------------------------------------
INSERT INTO `reviews` (`id`, `business_id`, `customer_id`, `order_id`, `booking_id`, `rating`, `comment`, `merchant_reply`, `replied_at`, `status`) VALUES
(1, 1, 2, 1, NULL, 5, 'Nomsa is simply the best! Delivered my Far Away perfume within 2 hours of ordering. Authentic, beautifully wrapped, with complimentary testers!', 'Thank you so much Thandiwe! Always an absolute pleasure serving our Alberton community!', '2026-03-01 09:12:00', 'APPROVED'),

(2, 2, 3, 2, NULL, 5, 'That melktert and sourdough loaf was out of this world. Best bakery in Katlehong by far. Fresh, warm, and friendly staff.', 'Siyabonga Sipho! The bakers start at 4am every day and this feedback makes our whole day!', '2026-03-02 11:30:00', 'APPROVED'),

(3, 3, 3, NULL, 1, 5, 'Johan and his apprentice arrived in 35 minutes when my geyser burst. Replaced the unit cleanly and handled the insurance paperwork on the spot. Lifesaver!', 'Glad we could resolve the leak quickly before floor damage occurred, Sipho! Stay safe!', '2026-03-02 14:00:00', 'APPROVED'),

(4, 4, 4, NULL, 2, 4, 'Very knowledgeable solar engineer. Kabelo gave us an honest assessment instead of overselling oversized batteries. Highly recommended.', NULL, NULL, 'APPROVED');

-- ----------------------------------------------------------------------------
-- 15. SEED NOTIFICATIONS
-- ----------------------------------------------------------------------------
INSERT INTO `notifications` (`id`, `user_id`, `type`, `title`, `message`, `is_read`) VALUES
(1, 2, 'ORDER', 'Order Delivered!', 'Your order #LBZ-2026-1001 from Nomsa\'s Avon Corner has been delivered.', 1),
(2, 3, 'BOOKING', 'Appointment Confirmed', 'Meyersdal Master Plumbers confirmed your geyser appointment for March 1 at 09:00 AM.', 1),
(3, 4, 'BOOKING', 'Solar Audit Confirmed', 'Ekurhuleni Solar & Electric confirmed your booking for March 12 at 14:00 PM.', 0),
(4, 5, 'ORDER', 'New Order Received', 'Thandiwe placed order #LBZ-2026-1001 for R415.00.', 1),
(5, 1, 'APPROVAL', 'New Seller Registration', 'Zola Organic Farm Stall submitted trade verification documents for review.', 0);

-- ----------------------------------------------------------------------------
-- 16. SEED FAVORITES
-- ----------------------------------------------------------------------------
INSERT INTO `favorites` (`id`, `user_id`, `business_id`) VALUES
(1, 2, 1), -- Thandiwe favorites Nomsa's Avon
(2, 2, 2), -- Thandiwe favorites Kasi Fresh Bakery
(3, 3, 3), -- Sipho favorites Meyersdal Master Plumbers
(4, 3, 2), -- Sipho favorites Kasi Fresh Bakery
(5, 4, 4); -- Lerato favorites Ekurhuleni Solar

-- ----------------------------------------------------------------------------
-- 17. SEED PROMOTIONS
-- ----------------------------------------------------------------------------
INSERT INTO `promotions` (`id`, `business_id`, `code`, `discount_percent`, `description`, `min_spend`, `start_date`, `end_date`, `is_active`) VALUES
(1, 1, 'ALBERTON10', 10.00, 'Get 10% off on all Avon & Justine skincare and perfumes', 150.00, '2026-01-01', '2026-12-31', 1),
(2, 2, 'KASIBRAAI', 10.00, '10% discount on weekend braai rolls and celebration milk tarts', 100.00, '2026-02-01', '2026-06-30', 1),
(3, 4, 'SOLAR2026', 15.00, '15% discount on residential solar readiness audits and COC inspections', 400.00, '2026-01-15', '2026-05-31', 1);

-- ----------------------------------------------------------------------------
-- 18. SEED MESSAGES
-- ----------------------------------------------------------------------------
INSERT INTO `messages` (`id`, `sender_id`, `business_id`, `sender_role`, `message_text`, `is_read`) VALUES
(1, 2, 1, 'CONSUMER', 'Sawubona Sis Nomsa! Do you have the Far Away Glamour perfume in stock for delivery today?', 1),
(2, 5, 1, 'BUSINESS', 'Yebo Thandiwe! Yes, I have 3 bottles on hand. Order through the app and I will dispatch within the hour.', 1),
(3, 4, 4, 'CONSUMER', 'Dumelang Kabelo, do you service systems that have Deye or Sunsynk inverters?', 1),
(4, 8, 4, 'BUSINESS', 'Hello Lerato, yes we are certified installers for both Sunsynk and Deye inverters in Ekurhuleni.', 1);

-- ----------------------------------------------------------------------------
-- 19. SEED AUDIT_LOGS
-- ----------------------------------------------------------------------------
INSERT INTO `audit_logs` (`id`, `user_id`, `action`, `entity_type`, `entity_id`, `details`, `ip_address`) VALUES
(1, 1, 'KYC_APPROVED', 'BUSINESS', '1', '{"business_name": "Nomsa\'s Avon Corner", "approved_by": "Vuyo Admin", "documents_verified": ["SA_ID", "Avon_Agent_Contract", "Proof_Of_Address"]}', '196.25.1.10'),
(2, 1, 'KYC_APPROVED', 'BUSINESS', '2', '{"business_name": "Kasi Fresh Bakery", "approved_by": "Vuyo Admin", "documents_verified": ["SA_ID", "Health_Permit", "CIPC_Registration"]}', '196.25.1.10'),
(3, 1, 'KYC_APPROVED', 'BUSINESS', '3', '{"business_name": "Meyersdal Master Plumbers", "approved_by": "Vuyo Admin", "documents_verified": ["PIRB_Registration", "SA_ID", "Public_Liability_Insurance"]}', '196.25.1.10'),
(4, 1, 'KYC_APPROVED', 'BUSINESS', '4', '{"business_name": "Ekurhuleni Solar & Electric", "approved_by": "Vuyo Admin", "documents_verified": ["Department_Of_Labour_Wiremans_License", "SA_ID", "ECA_Member"]}', '196.25.1.10'),
(5, 1, 'SETTINGS_UPDATE', 'ADMIN_SETTINGS', '1', '{"commission_mode": "SUBSCRIPTION", "flat_rate": 50, "commission_rate": 5.0}', '196.25.1.10');

-- ----------------------------------------------------------------------------
-- 20. SEED LOCATIONS (Key South African reference points)
-- ----------------------------------------------------------------------------
INSERT INTO `locations` (`id`, `country`, `country_code`, `province`, `province_code`, `municipality`, `city`, `suburb`, `postal_code`, `formatted_address`, `latitude`, `longitude`, `location_type`, `active`, `aliases`) VALUES
('loc-gp-jhb-sandton', 'South Africa', 'ZA', 'Gauteng', 'GP', 'City of Johannesburg', 'Johannesburg', 'Sandton', '2196', 'Sandton, Johannesburg, Gauteng, 2196', -26.10760000, 28.05670000, 'suburb', 1, 'Sandton City, Sandhurst, Inanda'),
('loc-gp-jhb-rosebank', 'South Africa', 'ZA', 'Gauteng', 'GP', 'City of Johannesburg', 'Johannesburg', 'Rosebank', '2196', 'Rosebank, Johannesburg, Gauteng, 2196', -26.14580000, 28.04330000, 'suburb', 1, 'Rosebank Mall, Oxford Road'),
('loc-gp-jhb-cbd', 'South Africa', 'ZA', 'Gauteng', 'GP', 'City of Johannesburg', 'Johannesburg', 'Johannesburg CBD', '2001', 'Johannesburg CBD, Gauteng, 2001', -26.20410000, 28.04730000, 'suburb', 1, 'Jo''burg, Joburg Central, Marshalltown, Gandhi Square'),
('loc-gp-eku-alberton', 'South Africa', 'ZA', 'Gauteng', 'GP', 'City of Ekurhuleni', 'Alberton', 'Alberton North', '1449', 'Alberton North, Alberton, Gauteng, 1449', -26.25850000, 28.12320000, 'suburb', 1, 'Alberton City, New Redruth, Raceview'),
('loc-gp-eku-katlehong', 'South Africa', 'ZA', 'Gauteng', 'GP', 'City of Ekurhuleni', 'Katlehong', 'Katlehong South', '1431', 'Katlehong, Ekurhuleni, Gauteng, 1431', -26.33000000, 28.15000000, 'suburb', 1, 'Kasi, Sontonga, Huntersfield'),
('loc-wc-cpt-cbd', 'South Africa', 'ZA', 'Western Cape', 'WC', 'City of Cape Town', 'Cape Town', 'Cape Town City Centre', '8001', 'Cape Town City Centre, Western Cape, 8001', -33.92490000, 18.42410000, 'suburb', 1, 'CPT CBD, Waterfront, Foreshore, Long Street'),
('loc-wc-cpt-campsbay', 'South Africa', 'ZA', 'Western Cape', 'WC', 'City of Cape Town', 'Cape Town', 'Camps Bay', '8005', 'Camps Bay, Cape Town, Western Cape, 8005', -33.95100000, 18.37800000, 'suburb', 1, 'Atlantic Seaboard, Clifton, Bakoven'),
('loc-kzn-eth-durban-cbd', 'South Africa', 'ZA', 'KwaZulu-Natal', 'KZN', 'eThekwini Metropolitan', 'Durban', 'Durban Central', '4001', 'Durban Central, KwaZulu-Natal, 4001', -29.85870000, 31.02180000, 'suburb', 1, 'Durban CBD, Point, South Beach, Marine Parade'),
('loc-kzn-eth-umhlanga', 'South Africa', 'ZA', 'KwaZulu-Natal', 'KZN', 'eThekwini Metropolitan', 'Umhlanga', 'Umhlanga Rocks', '4319', 'Umhlanga Rocks, KwaZulu-Natal, 4319', -29.72850000, 31.08580000, 'suburb', 1, 'Gateway, Lighthouse, Pearls of Umhlanga');

-- ----------------------------------------------------------------------------
-- 21. SEED BUSINESS_LOCATIONS
-- ----------------------------------------------------------------------------
INSERT INTO `business_locations` (`id`, `merchant_id`, `name`, `address`, `suburb`, `city`, `province`, `postal_code`, `latitude`, `longitude`, `is_primary`, `location_verified`, `service_radius`, `active`) VALUES
('bus-loc-1-primary', 1, 'Main Store & Dispatch', '45 Hendrik Potgieter St', 'Alberton North', 'Alberton', 'Gauteng', '1449', -26.25850000, 28.12320000, 1, 1, 15.00, 1),
('bus-loc-1-sandton', 1, 'Sandton Collection Hub', 'Sandton City Level 2', 'Sandton', 'Johannesburg', 'Gauteng', '2196', -26.10760000, 28.05670000, 0, 1, 10.00, 1),
('bus-loc-2-primary', 2, 'Main Bakery', '102 Sontonga Rd', 'Katlehong', 'Katlehong', 'Gauteng', '1431', -26.33000000, 28.15000000, 1, 1, 20.00, 1),
('bus-loc-3-primary', 3, 'Main Dispatch Base', '12 Hennie Alberts St', 'Meyersdal', 'Alberton', 'Gauteng', '1448', -26.29050000, 28.10120000, 1, 1, 35.00, 1),
('bus-loc-4-primary', 4, 'Operations HQ', '77 True North Rd', 'Mulbarton', 'Johannesburg', 'Gauteng', '2059', -26.28100000, 28.06200000, 1, 1, 50.00, 1),
('bus-loc-5-primary', 5, 'Farm Stand', 'Farm 14, Eikenhof Rd', 'Alberton South', 'Alberton', 'Gauteng', '1448', -26.34000000, 28.08000000, 1, 0, 15.00, 1);

-- ----------------------------------------------------------------------------
-- 22. SEED USER_LOCATIONS
-- ----------------------------------------------------------------------------
INSERT INTO `user_locations` (`id`, `user_id`, `label`, `formatted_address`, `suburb`, `city`, `province`, `latitude`, `longitude`, `location_mode`, `is_default`) VALUES
('user-loc-thandi-home', 2, 'Home', '14 Voortrekker Ave, Alberton North, Gauteng, 1449', 'Alberton North', 'Alberton', 'Gauteng', -26.25700000, 28.12100000, 'MANUAL_LOCATION', 1),
('user-loc-sipho-home', 3, 'Home', '88 Michelle Ave, Meyersdal, Alberton, Gauteng, 1448', 'Meyersdal', 'Alberton', 'Gauteng', -26.28900000, 28.09800000, 'MANUAL_LOCATION', 1);

-- ----------------------------------------------------------------------------
-- 23. SEED ADMIN_SETTINGS
-- ----------------------------------------------------------------------------
INSERT INTO `admin_settings` (`id`, `key`, `value`) VALUES
('setting-loc-provider', 'location_provider', 'DATABASE'),
('setting-default-radius', 'default_radius', '25'),
('setting-max-radius', 'max_radius', '100');

SET FOREIGN_KEY_CHECKS = 1;

COMMIT;
