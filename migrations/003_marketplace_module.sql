-- Migration: Marketplace Module
-- Creates tables for the vendor/marketplace system

-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    business_name VARCHAR(255) NOT NULL,
    description TEXT,
    phone VARCHAR(20),
    address VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    is_active BOOLEAN DEFAULT TRUE,
    is_open BOOLEAN DEFAULT FALSE,
    opening_hours JSON, -- { "sunday": { "open": "09:00", "close": "17:00" }, ... }
    delivery_radius_km DECIMAL(4, 1) DEFAULT 5.0,
    cover_image VARCHAR(500),
    rating DECIMAL(3, 2) DEFAULT 0.00,
    review_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Menu Items table
CREATE TABLE IF NOT EXISTS menu_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    is_available BOOLEAN DEFAULT TRUE,
    category VARCHAR(50) DEFAULT 'main', -- main, side, dessert, drink
    preparation_time_minutes INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Vendor Inquiries / Messages
CREATE TABLE IF NOT EXISTS vendor_inquiries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id INT NOT NULL,
    user_id INT NOT NULL,
    message TEXT NOT NULL,
    items_interested JSON, -- Array of menu_item IDs or objects
    status ENUM('new', 'read', 'replied') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add marketplace feature flag
INSERT IGNORE INTO feature_flags (feature_key, name, description, status) VALUES
('marketplace_module', 'שוק אוכל', 'מאפשר גישה למכירה וקנייה של אוכל ביתי', 'admin_only');

-- Indexes for geolocation search
CREATE INDEX idx_vendors_geo ON vendors(latitude, longitude);
CREATE INDEX idx_vendors_active ON vendors(is_active);
