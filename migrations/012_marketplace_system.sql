-- Migration 012: Marketplace System
-- Complete marketplace system for selling traditional food

-- =====================================================
-- VENDORS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL COMMENT 'Owner user. NULL if community-reported vendor',

    -- Basic Info
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    logo_url VARCHAR(512),
    about_text TEXT,
    about_image_url VARCHAR(512),

    -- Contact
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),

    -- Location
    address TEXT NOT NULL,
    city VARCHAR(100),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Status
    is_verified BOOLEAN DEFAULT FALSE COMMENT 'Admin verified',
    is_active BOOLEAN DEFAULT TRUE,
    status ENUM('pending', 'active', 'suspended') DEFAULT 'pending',

    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_slug (slug),
    INDEX idx_location (latitude, longitude),
    INDEX idx_status (status, is_active),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- MENU ITEMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,

    -- Item Info
    name VARCHAR(255) NOT NULL,
    name_hebrew VARCHAR(255),
    description TEXT,
    category VARCHAR(100) COMMENT 'appetizer, main, dessert, etc.',

    -- Pricing
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ILS',

    -- Media
    image_url VARCHAR(512),

    -- Availability
    is_available BOOLEAN DEFAULT TRUE,
    stock_quantity INT DEFAULT NULL COMMENT 'NULL = unlimited',

    -- Metadata
    display_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_category (category),
    INDEX idx_available (is_available),

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- OPENING HOURS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_hours (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,

    day_of_week TINYINT NOT NULL COMMENT '0=Sunday, 6=Saturday',
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN DEFAULT FALSE,

    notes VARCHAR(255) COMMENT 'Special notes for this day',

    UNIQUE KEY unique_vendor_day (vendor_id, day_of_week),

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- SPECIAL CLOSURES TABLE (Holidays, Vacations)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_closures (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,

    closure_date DATE NOT NULL,
    reason VARCHAR(255),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_vendor_date (vendor_id, closure_date),

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- REVIEWS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    user_id INT NOT NULL,

    rating TINYINT NOT NULL COMMENT '1-5 stars',
    comment TEXT,

    -- Moderation
    is_verified BOOLEAN DEFAULT FALSE,
    is_hidden BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_user (user_id),
    INDEX idx_rating (rating),

    UNIQUE KEY unique_user_vendor (user_id, vendor_id),

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT chk_rating CHECK (rating >= 1 AND rating <= 5)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- UPDATES & PROMOTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_updates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,

    title VARCHAR(255) NOT NULL,
    content TEXT,
    image_url VARCHAR(512),

    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMP NULL COMMENT 'NULL = never expires',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_vendor (vendor_id),
    INDEX idx_active_expires (is_active, expires_at),

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- COMMUNITY REPORTS TABLE
-- For users to report vendors not yet in system
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,

    -- Reporter
    reporter_id INT NOT NULL,

    -- Reported Vendor Info
    vendor_id INT NULL COMMENT 'NULL if new vendor report',
    vendor_name VARCHAR(255) NOT NULL,
    vendor_address TEXT NOT NULL,
    vendor_phone VARCHAR(50),
    description TEXT COMMENT 'What they sell, why reporting',

    -- Status
    status ENUM('pending', 'approved', 'rejected', 'merged') DEFAULT 'pending',
    admin_notes TEXT,
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_reporter (reporter_id),
    INDEX idx_status (status),
    INDEX idx_vendor (vendor_id),

    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE SET NULL,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- CART ITEMS TABLE (Local Shopping Cart)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_cart_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    menu_item_id INT NOT NULL,

    quantity INT NOT NULL DEFAULT 1,
    notes TEXT COMMENT 'Special requests',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY unique_user_item (user_id, menu_item_id),
    INDEX idx_user (user_id),

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES marketplace_menu_items(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- VENDOR STATISTICS (Denormalized for performance)
-- =====================================================
CREATE TABLE IF NOT EXISTS marketplace_vendor_stats (
    vendor_id INT PRIMARY KEY,

    total_reviews INT DEFAULT 0,
    average_rating DECIMAL(3, 2) DEFAULT 0.00,
    total_menu_items INT DEFAULT 0,

    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- =====================================================
-- DEFAULT OPENING HOURS (Helper to insert standard hours)
-- =====================================================
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS create_default_hours(IN vid INT)
BEGIN
    -- Sunday-Thursday: 9:00-21:00
    INSERT IGNORE INTO marketplace_hours (vendor_id, day_of_week, open_time, close_time, is_closed) VALUES
    (vid, 0, '09:00:00', '21:00:00', FALSE),
    (vid, 1, '09:00:00', '21:00:00', FALSE),
    (vid, 2, '09:00:00', '21:00:00', FALSE),
    (vid, 3, '09:00:00', '21:00:00', FALSE),
    (vid, 4, '09:00:00', '21:00:00', FALSE),
    -- Friday: 9:00-14:00 (before Shabbat)
    (vid, 5, '09:00:00', '14:00:00', FALSE),
    -- Saturday: Closed
    (vid, 6, NULL, NULL, TRUE);
END //
DELIMITER ;
