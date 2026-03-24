-- Migration: Add RBAC and Feature Flags
-- Run this on your MariaDB server after the initial schema

-- ===========================
-- UPDATE USERS TABLE: Add 'moderator' role
-- ===========================
ALTER TABLE users 
MODIFY COLUMN role ENUM('admin', 'moderator', 'approver', 'user') DEFAULT 'user';

-- Note: 'approver' is kept for backward compatibility but 'moderator' is the new preferred term

-- ===========================
-- UPDATE SYSTEM LOGS: Add new event type
-- ===========================
ALTER TABLE system_logs
MODIFY COLUMN event_type ENUM(
    'ENTRY_ADDED', 
    'ENTRY_APPROVED', 
    'ENTRY_DELETED', 
    'ENTRY_REJECTED', 
    'USER_LOGIN', 
    'USER_REGISTER', 
    'USER_ROLE_CHANGE', 
    'USER_DELETED', 
    'DIALECT_ADDED',
    'FEATURE_FLAG_CHANGED'
) NOT NULL;

-- ===========================
-- FEATURE FLAGS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS feature_flags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    feature_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status ENUM('active', 'admin_only', 'disabled') DEFAULT 'disabled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_key (feature_key),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default feature flags for planned features
INSERT IGNORE INTO feature_flags (feature_key, name, description, status) VALUES
    ('tutor_module', 'מורה פרטי', 'שיעורים מונחי בינה מלאכותית', 'coming_soon'),
    ('recipes_module', 'מתכונים', 'אזור מתכונים קהילתי', 'disabled'),
    ('marketplace_module', 'אוכל באזור שלך', 'מרקטפלייס אוכל קווקזי', 'disabled'),
    ('family_tree_module', 'אילן יוחסין', 'מערכת אילן יוחסין קהילתי', 'disabled');
