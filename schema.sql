-- Juhuri Heritage Database Schema
-- Run this on your MariaDB server

-- ===========================
-- USERS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'approver', 'user') DEFAULT 'user',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    contributions_count INT DEFAULT 0,
    xp INT DEFAULT 0,
    level INT DEFAULT 1,
    current_streak INT DEFAULT 0,
    last_login_date TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- DIALECTS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS dialects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default dialects
INSERT IGNORE INTO dialects (name, description) VALUES
    ('Quba', 'קובה (כללי)'),
    ('Derbent', 'דרבנט'),
    ('Madjalis', 'מג''ליס / קייטאג'),
    ('Vartashen', 'ורטשן / אוגוז'),
    ('North Caucasus', 'צפון הקווקז'),
    ('General', 'כללי');

-- ===========================
-- DICTIONARY ENTRIES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS dictionary_entries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    term VARCHAR(255) NOT NULL,
    detected_language ENUM('Hebrew', 'Juhuri', 'English') DEFAULT 'Hebrew',
    pronunciation_guide TEXT,
    source ENUM('AI', 'Manual', 'User') DEFAULT 'Manual',
    status ENUM('active', 'pending') DEFAULT 'pending',
    contributor_id INT NULL,
    approved_by INT NULL,
    approved_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (contributor_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_term (term),
    INDEX idx_status (status),
    FULLTEXT INDEX ft_term (term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- TRANSLATIONS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS translations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    dialect_id INT NOT NULL,
    hebrew TEXT,
    latin TEXT,
    cyrillic TEXT,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (dialect_id) REFERENCES dialects(id) ON DELETE CASCADE,
    INDEX idx_entry (entry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- DEFINITIONS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS definitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    definition TEXT NOT NULL,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    INDEX idx_entry (entry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- EXAMPLES TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS examples (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    origin TEXT NOT NULL,
    translated TEXT,
    transliteration TEXT,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    INDEX idx_entry (entry_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- USER PROGRESS (Completed Units)
-- ===========================
CREATE TABLE IF NOT EXISTS user_progress (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    unit_id VARCHAR(100) NOT NULL,
    completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    score INT DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_progress (user_id, unit_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- SYSTEM LOGS TABLE
-- ===========================
CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    event_type ENUM(
        'ENTRY_ADDED', 
        'ENTRY_APPROVED', 
        'ENTRY_DELETED', 
        'ENTRY_REJECTED', 
        'USER_LOGIN', 
        'USER_REGISTER', 
        'USER_ROLE_CHANGE', 
        'USER_DELETED', 
        'DIALECT_ADDED'
    ) NOT NULL,
    description TEXT,
    user_id INT NULL,
    user_name VARCHAR(255),
    metadata JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_event_type (event_type),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- CACHE TABLE (for AI responses)
-- ===========================
CREATE TABLE IF NOT EXISTS query_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    query_hash VARCHAR(64) NOT NULL UNIQUE,
    query_text VARCHAR(255) NOT NULL,
    response JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    INDEX idx_hash (query_hash),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
