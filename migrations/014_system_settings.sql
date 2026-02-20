-- Migration 014: System Settings with Encrypted Values
-- Adds a key-value settings table for encrypted secrets (e.g., API keys)

CREATE TABLE IF NOT EXISTS system_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    encrypted_value TEXT NOT NULL COMMENT 'AES-256-GCM encrypted value',
    iv VARCHAR(32) NOT NULL COMMENT 'Initialization vector (hex)',
    auth_tag VARCHAR(32) NOT NULL COMMENT 'GCM auth tag (hex)',
    description VARCHAR(255),
    updated_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_setting_key (setting_key),
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Extend system_logs event_type to include settings changes
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
    'FEATURE_FLAG_CHANGED',
    'SETTING_CHANGED'
) NOT NULL;
