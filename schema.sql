-- ============================================================================
-- LocalBiz Hyperlocal Business Marketplace Database Schema
-- Dialect: MySQL 8.0+ / MariaDB 10.5+
-- Storage Engine: InnoDB
-- Charset: utf8mb4 / Collation: utf8mb4_unicode_ci
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET time_zone = '+00:00';

-- ----------------------------------------------------------------------------
-- Drop existing tables in reverse dependency order
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
DROP TABLE IF EXISTS `user_locations`;
DROP TABLE IF EXISTS `business_locations`;
DROP TABLE IF EXISTS `locations`;
DROP TABLE IF EXISTS `admin_settings`;
DROP TABLE IF EXISTS `messages`;
DROP TABLE IF EXISTS `promotions`;
DROP TABLE IF EXISTS `favorites`;
DROP TABLE IF EXISTS `notifications`;
DROP TABLE IF EXISTS `reviews`;
DROP TABLE IF EXISTS `payments`;
DROP TABLE IF EXISTS `bookings`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `services`;
DROP TABLE IF EXISTS `products`;
DROP TABLE IF EXISTS `business_hours`;
DROP TABLE IF EXISTS `addresses`;
DROP TABLE IF EXISTS `business_categories`;
DROP TABLE IF EXISTS `categories`;
DROP TABLE IF EXISTS `businesses`;
DROP TABLE IF EXISTS `users`;
DROP TABLE IF EXISTS `roles`;

-- ============================================================================
-- 1. ROLES TABLE
-- Defines user authorization levels (e.g. ADMIN, BUSINESS, CONSUMER)
-- ============================================================================
CREATE TABLE `roles` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_roles_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 2. USERS TABLE
-- Authentication, profile details, and role reference
-- ============================================================================
CREATE TABLE `users` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION') NOT NULL DEFAULT 'ACTIVE',
    `avatar` VARCHAR(500) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_users_email` (`email`),
    KEY `idx_users_role_id` (`role_id`),
    KEY `idx_users_status` (`status`),
    CONSTRAINT `fk_users_role` FOREIGN KEY (`role_id`) 
        REFERENCES `roles` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 3. BUSINESSES TABLE
-- Registered vendor profiles, KYC status, contact, and branding
-- ============================================================================
CREATE TABLE `businesses` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `owner_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `category` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(30) NOT NULL,
    `website` VARCHAR(255) NULL,
    `logo` VARCHAR(500) NULL,
    `cover_image` VARCHAR(500) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED') NOT NULL DEFAULT 'PENDING',
    `approved_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_businesses_owner_id` (`owner_id`),
    KEY `idx_businesses_status` (`status`),
    KEY `idx_businesses_category` (`category`),
    CONSTRAINT `fk_businesses_owner` FOREIGN KEY (`owner_id`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 4. CATEGORIES TABLE
-- High-level business and product taxonomy
-- ============================================================================
CREATE TABLE `categories` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `icon` VARCHAR(50) NULL DEFAULT 'Tag',
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_categories_name` (`name`),
    UNIQUE KEY `uq_categories_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 5. BUSINESS_CATEGORIES TABLE (Junction)
-- Many-to-many relationship between businesses and categories
-- ============================================================================
CREATE TABLE `business_categories` (
    `business_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`business_id`, `category_id`),
    KEY `idx_bc_category_id` (`category_id`),
    CONSTRAINT `fk_bc_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_bc_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 6. ADDRESSES TABLE
-- Geographic locations for consumers (delivery/residential) and businesses
-- ============================================================================
CREATE TABLE `addresses` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NULL,
    `business_id` INT UNSIGNED NULL,
    `type` ENUM('RESIDENTIAL', 'BUSINESS', 'DELIVERY', 'BILLING') NOT NULL DEFAULT 'RESIDENTIAL',
    `street_address` VARCHAR(255) NOT NULL,
    `suburb` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL DEFAULT 'Johannesburg',
    `province` VARCHAR(100) NOT NULL DEFAULT 'Gauteng',
    `postal_code` VARCHAR(20) NOT NULL,
    `latitude` DECIMAL(10, 8) NULL,
    `longitude` DECIMAL(11, 8) NULL,
    `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_addresses_user_id` (`user_id`),
    KEY `idx_addresses_business_id` (`business_id`),
    KEY `idx_addresses_suburb` (`suburb`),
    CONSTRAINT `fk_addresses_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_addresses_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 7. BUSINESS_HOURS TABLE
-- Operating schedule per day of the week
-- ============================================================================
CREATE TABLE `business_hours` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_id` INT UNSIGNED NOT NULL,
    `day_of_week` ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY') NOT NULL,
    `open_time` TIME NULL,
    `close_time` TIME NULL,
    `is_closed` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_business_day` (`business_id`, `day_of_week`),
    KEY `idx_business_hours_business_id` (`business_id`),
    CONSTRAINT `fk_business_hours_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 8. PRODUCTS TABLE
-- Physical catalog items sold by businesses
-- ============================================================================
CREATE TABLE `products` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `stock` INT NOT NULL DEFAULT 0,
    `image` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED', 'DRAFT') NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_products_business_id` (`business_id`),
    KEY `idx_products_category_id` (`category_id`),
    KEY `idx_products_status` (`status`),
    KEY `idx_products_price` (`price`),
    CONSTRAINT `fk_products_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_products_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 9. SERVICES TABLE
-- Professional trade call-outs, beauty sessions, and bookable appointments
-- ============================================================================
CREATE TABLE `services` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `duration` VARCHAR(50) NOT NULL,
    `booking_required` BOOLEAN NOT NULL DEFAULT TRUE,
    `status` ENUM('ACTIVE', 'UNAVAILABLE', 'ARCHIVED') NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_services_business_id` (`business_id`),
    KEY `idx_services_category_id` (`category_id`),
    KEY `idx_services_status` (`status`),
    CONSTRAINT `fk_services_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_services_category` FOREIGN KEY (`category_id`) 
        REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 10. ORDERS TABLE
-- Consumer purchases with 9-stage fulfillment status lifecycle
-- ============================================================================
CREATE TABLE `orders` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(30) NOT NULL,
    `customer_id` INT UNSIGNED NOT NULL,
    `business_id` INT UNSIGNED NOT NULL,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `delivery_fee` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `service_fee` DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `total_amount` DECIMAL(10, 2) NOT NULL,
    `status` ENUM(
        'PENDING', 
        'ACCEPTED', 
        'REJECTED', 
        'PROCESSING', 
        'READY', 
        'OUT_FOR_DELIVERY', 
        'DELIVERED', 
        'COMPLETED', 
        'CANCELLED'
    ) NOT NULL DEFAULT 'PENDING',
    `delivery_type` ENUM('DELIVERY', 'COLLECTION') NOT NULL DEFAULT 'DELIVERY',
    `delivery_address_id` INT UNSIGNED NULL,
    `special_notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_orders_order_number` (`order_number`),
    KEY `idx_orders_customer_id` (`customer_id`),
    KEY `idx_orders_business_id` (`business_id`),
    KEY `idx_orders_status` (`status`),
    KEY `idx_orders_created_at` (`created_at`),
    CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_orders_address` FOREIGN KEY (`delivery_address_id`) 
        REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 11. ORDER_ITEMS TABLE
-- Line items capturing snapshot price at time of purchase
-- ============================================================================
CREATE TABLE `order_items` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` INT UNSIGNED NOT NULL,
    `product_id` INT UNSIGNED NULL,
    `item_name` VARCHAR(150) NOT NULL,
    `unit_price` DECIMAL(10, 2) NOT NULL,
    `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
    `subtotal` DECIMAL(10, 2) NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_order_items_order_id` (`order_id`),
    KEY `idx_order_items_product_id` (`product_id`),
    CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) 
        REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) 
        REFERENCES `products` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 12. BOOKINGS TABLE
-- Service appointment reservations with 8-stage booking status lifecycle
-- ============================================================================
CREATE TABLE `bookings` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `booking_reference` VARCHAR(30) NOT NULL,
    `customer_id` INT UNSIGNED NOT NULL,
    `business_id` INT UNSIGNED NOT NULL,
    `service_id` INT UNSIGNED NOT NULL,
    `appointment_date` DATE NOT NULL,
    `start_time` TIME NOT NULL,
    `end_time` TIME NULL,
    `service_price` DECIMAL(10, 2) NOT NULL,
    `address_id` INT UNSIGNED NULL,
    `status` ENUM(
        'PENDING', 
        'CONFIRMED', 
        'REJECTED', 
        'RESCHEDULED', 
        'IN_PROGRESS', 
        'COMPLETED', 
        'CANCELLED', 
        'NO_SHOW'
    ) NOT NULL DEFAULT 'PENDING',
    `customer_notes` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_bookings_reference` (`booking_reference`),
    KEY `idx_bookings_customer_id` (`customer_id`),
    KEY `idx_bookings_business_id` (`business_id`),
    KEY `idx_bookings_service_id` (`service_id`),
    KEY `idx_bookings_status` (`status`),
    KEY `idx_bookings_date` (`appointment_date`),
    CONSTRAINT `fk_bookings_customer` FOREIGN KEY (`customer_id`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_service` FOREIGN KEY (`service_id`) 
        REFERENCES `services` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `fk_bookings_address` FOREIGN KEY (`address_id`) 
        REFERENCES `addresses` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 13. PAYMENTS TABLE
-- Transaction ledger records with 6-stage payment status lifecycle
-- ============================================================================
CREATE TABLE `payments` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `payment_reference` VARCHAR(50) NOT NULL,
    `order_id` INT UNSIGNED NULL,
    `booking_id` INT UNSIGNED NULL,
    `payer_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `payment_method` ENUM('CARD', 'CASH_ON_DELIVERY', 'EFT', 'POS_TERMINAL', 'WALLET') NOT NULL DEFAULT 'CARD',
    `status` ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `transaction_id` VARCHAR(100) NULL,
    `paid_at` TIMESTAMP NULL DEFAULT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_payments_reference` (`payment_reference`),
    KEY `idx_payments_order_id` (`order_id`),
    KEY `idx_payments_booking_id` (`booking_id`),
    KEY `idx_payments_payer_id` (`payer_id`),
    KEY `idx_payments_status` (`status`),
    CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) 
        REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_booking` FOREIGN KEY (`booking_id`) 
        REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_payments_payer` FOREIGN KEY (`payer_id`) 
        REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 14. REVIEWS TABLE
-- Customer feedback, 1-5 rating, and merchant responses
-- ============================================================================
CREATE TABLE `reviews` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_id` INT UNSIGNED NOT NULL,
    `customer_id` INT UNSIGNED NOT NULL,
    `order_id` INT UNSIGNED NULL,
    `booking_id` INT UNSIGNED NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `comment` TEXT NULL,
    `merchant_reply` TEXT NULL,
    `replied_at` TIMESTAMP NULL DEFAULT NULL,
    `status` ENUM('APPROVED', 'PENDING', 'FLAGGED', 'HIDDEN') NOT NULL DEFAULT 'APPROVED',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_reviews_business_id` (`business_id`),
    KEY `idx_reviews_customer_id` (`customer_id`),
    KEY `idx_reviews_rating` (`rating`),
    KEY `idx_reviews_status` (`status`),
    CONSTRAINT `chk_reviews_rating` CHECK (`rating` >= 1 AND `rating` <= 5),
    CONSTRAINT `fk_reviews_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_customer` FOREIGN KEY (`customer_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_order` FOREIGN KEY (`order_id`) 
        REFERENCES `orders` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT `fk_reviews_booking` FOREIGN KEY (`booking_id`) 
        REFERENCES `bookings` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 15. NOTIFICATIONS TABLE
-- Real-time in-app alerts for orders, bookings, and KYC status
-- ============================================================================
CREATE TABLE `notifications` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `type` ENUM('ORDER', 'BOOKING', 'PAYMENT', 'PROMOTION', 'SYSTEM', 'APPROVAL') NOT NULL,
    `title` VARCHAR(150) NOT NULL,
    `message` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_notifications_user_read` (`user_id`, `is_read`),
    CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 16. FAVORITES TABLE
-- Customer bookmarked businesses with unique constraint
-- ============================================================================
CREATE TABLE `favorites` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NOT NULL,
    `business_id` INT UNSIGNED NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_user_business_favorite` (`user_id`, `business_id`),
    KEY `idx_favorites_user_id` (`user_id`),
    KEY `idx_favorites_business_id` (`business_id`),
    CONSTRAINT `fk_favorites_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_favorites_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 17. PROMOTIONS TABLE
-- Merchant discount vouchers and coupon codes
-- ============================================================================
CREATE TABLE `promotions` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `business_id` INT UNSIGNED NOT NULL,
    `code` VARCHAR(50) NOT NULL,
    `discount_percent` DECIMAL(5, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `min_spend` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    `start_date` DATE NOT NULL,
    `end_date` DATE NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_promotions_code` (`code`),
    KEY `idx_promotions_business_id` (`business_id`),
    KEY `idx_promotions_active` (`is_active`),
    CONSTRAINT `fk_promotions_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 18. MESSAGES TABLE
-- Direct peer-to-peer chat between consumers and merchant owners
-- ============================================================================
CREATE TABLE `messages` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `sender_id` INT UNSIGNED NOT NULL,
    `business_id` INT UNSIGNED NOT NULL,
    `sender_role` ENUM('CONSUMER', 'BUSINESS') NOT NULL DEFAULT 'CONSUMER',
    `message_text` TEXT NOT NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_messages_business_sender` (`business_id`, `sender_id`),
    KEY `idx_messages_sender_id` (`sender_id`),
    CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_messages_business` FOREIGN KEY (`business_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 19. AUDIT_LOGS TABLE
-- Security governance and platform event ledger
-- ============================================================================
CREATE TABLE `audit_logs` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` INT UNSIGNED NULL,
    `administrator` VARCHAR(150) NULL DEFAULT 'System Admin',
    `action` VARCHAR(100) NOT NULL,
    `entity_type` VARCHAR(50) NOT NULL,
    `entity_id` VARCHAR(50) NULL,
    `details` JSON NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_audit_logs_user_id` (`user_id`),
    KEY `idx_audit_logs_action` (`action`),
    KEY `idx_audit_logs_entity` (`entity_type`, `entity_id`),
    KEY `idx_audit_logs_created_at` (`created_at`),
    CONSTRAINT `fk_audit_logs_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 20. LOCATIONS TABLE
-- South African geographic discovery dataset (Provinces, Cities, Suburbs)
-- ============================================================================
CREATE TABLE `locations` (
    `id` VARCHAR(50) NOT NULL,
    `country` VARCHAR(100) NOT NULL DEFAULT 'South Africa',
    `country_code` VARCHAR(10) NOT NULL DEFAULT 'ZA',
    `province` VARCHAR(100) NOT NULL,
    `province_code` VARCHAR(20) NULL,
    `municipality` VARCHAR(100) NOT NULL,
    `city` VARCHAR(100) NOT NULL,
    `suburb` VARCHAR(100) NULL,
    `postal_code` VARCHAR(20) NULL,
    `formatted_address` VARCHAR(255) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `location_type` ENUM('province', 'municipality', 'city', 'town', 'suburb', 'locality') NOT NULL DEFAULT 'suburb',
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    `aliases` TEXT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_locations_province` (`province`),
    KEY `idx_locations_city` (`city`),
    KEY `idx_locations_suburb` (`suburb`),
    KEY `idx_locations_type` (`location_type`),
    KEY `idx_locations_coords` (`latitude`, `longitude`),
    KEY `idx_locations_active` (`active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 21. BUSINESS_LOCATIONS TABLE
-- Multi-branch support and geocoded merchant storefronts / service bases
-- ============================================================================
CREATE TABLE `business_locations` (
    `id` VARCHAR(50) NOT NULL,
    `merchant_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(150) NOT NULL DEFAULT 'Main Branch',
    `address` VARCHAR(255) NOT NULL,
    `suburb` VARCHAR(100) NULL,
    `city` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `postal_code` VARCHAR(20) NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `is_primary` BOOLEAN NOT NULL DEFAULT TRUE,
    `location_verified` BOOLEAN NOT NULL DEFAULT FALSE,
    `service_radius` DECIMAL(6, 2) DEFAULT 10.00,
    `service_areas` JSON NULL,
    `operating_hours` VARCHAR(255) NULL,
    `phone` VARCHAR(30) NULL,
    `email` VARCHAR(255) NULL,
    `active` BOOLEAN NOT NULL DEFAULT TRUE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_bus_loc_merchant` (`merchant_id`),
    KEY `idx_bus_loc_city` (`city`),
    KEY `idx_bus_loc_province` (`province`),
    KEY `idx_bus_loc_coords` (`latitude`, `longitude`),
    KEY `idx_bus_loc_active` (`active`),
    CONSTRAINT `fk_bus_loc_business` FOREIGN KEY (`merchant_id`) 
        REFERENCES `businesses` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 22. USER_LOCATIONS TABLE
-- Saved discovery locations and delivery addresses for users
-- ============================================================================
CREATE TABLE `user_locations` (
    `id` VARCHAR(50) NOT NULL,
    `user_id` INT UNSIGNED NOT NULL,
    `label` VARCHAR(50) NULL,
    `formatted_address` VARCHAR(255) NOT NULL,
    `suburb` VARCHAR(100) NULL,
    `city` VARCHAR(100) NOT NULL,
    `province` VARCHAR(100) NOT NULL,
    `latitude` DECIMAL(10, 8) NOT NULL,
    `longitude` DECIMAL(11, 8) NOT NULL,
    `location_mode` ENUM('CURRENT_LOCATION', 'MANUAL_LOCATION', 'MAP_LOCATION') NOT NULL DEFAULT 'MANUAL_LOCATION',
    `is_default` BOOLEAN NOT NULL DEFAULT FALSE,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_loc_user` (`user_id`),
    KEY `idx_user_loc_default` (`is_default`),
    CONSTRAINT `fk_user_loc_user` FOREIGN KEY (`user_id`) 
        REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- 23. ADMIN_SETTINGS TABLE
-- Platform-wide configuration, provider selection, commission rules
-- ============================================================================
CREATE TABLE `admin_settings` (
    `id` VARCHAR(50) NOT NULL,
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uq_admin_settings_key` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
