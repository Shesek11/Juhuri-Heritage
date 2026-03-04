-- Migration 013: Marketplace Orders System
-- Adds order tracking, order items, and notifications

-- 1. Orders table
CREATE TABLE IF NOT EXISTS marketplace_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(20) UNIQUE NOT NULL COMMENT 'e.g. ORD-20240126-0001',
    user_id INT NOT NULL COMMENT 'Customer',
    vendor_id INT NOT NULL,

    -- Order details
    status ENUM('pending', 'confirmed', 'ready', 'completed', 'cancelled') DEFAULT 'pending',
    total_price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'ILS',

    -- Customer info
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    customer_notes TEXT,

    -- Pickup/Delivery
    pickup_time DATETIME NULL COMMENT 'When customer wants to pick up',

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP NULL,
    ready_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    cancelled_at TIMESTAMP NULL,
    cancellation_reason TEXT,

    INDEX idx_user_orders (user_id),
    INDEX idx_vendor_orders (vendor_id),
    INDEX idx_status (status),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Order items (what was ordered)
CREATE TABLE IF NOT EXISTS marketplace_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    menu_item_id INT NULL COMMENT 'NULL if item was deleted',

    -- Snapshot of item at time of order (in case menu changes)
    item_name VARCHAR(255) NOT NULL,
    item_name_hebrew VARCHAR(255),
    item_description TEXT,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    notes TEXT COMMENT 'Special requests from customer',

    INDEX idx_order (order_id),
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_item_id) REFERENCES marketplace_menu_items(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Notifications table (for vendors and customers)
CREATE TABLE IF NOT EXISTS marketplace_notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL COMMENT 'Recipient',
    type ENUM('new_order', 'order_confirmed', 'order_ready', 'order_completed', 'order_cancelled', 'new_review') NOT NULL,

    -- Related entities
    order_id INT NULL,
    vendor_id INT NULL,
    review_id INT NULL,

    -- Notification content
    title VARCHAR(255) NOT NULL,
    message TEXT,

    -- Status
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_unread (user_id, is_read),
    INDEX idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES marketplace_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES marketplace_vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Order statistics view (for analytics)
CREATE OR REPLACE VIEW marketplace_order_stats AS
SELECT
    v.id as vendor_id,
    v.name as vendor_name,
    COUNT(o.id) as total_orders,
    SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
    SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
    SUM(CASE WHEN o.status = 'completed' THEN o.total_price ELSE 0 END) as total_revenue,
    AVG(CASE WHEN o.status = 'completed' THEN o.total_price ELSE NULL END) as avg_order_value,
    COUNT(DISTINCT o.user_id) as unique_customers
FROM marketplace_vendors v
LEFT JOIN marketplace_orders o ON v.id = o.vendor_id
GROUP BY v.id, v.name;

-- 5. Add indexes for performance
CREATE INDEX idx_order_number ON marketplace_orders(order_number);
CREATE INDEX idx_vendor_status ON marketplace_orders(vendor_id, status);
CREATE INDEX idx_user_created ON marketplace_orders(user_id, created_at DESC);
