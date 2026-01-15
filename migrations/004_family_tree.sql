-- Migration: Family Tree Module
-- Creates table for family members and relationships

CREATE TABLE IF NOT EXISTS family_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- The user managing this profile (optional, for finding "my tree")
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    maiden_name VARCHAR(100),
    gender ENUM('male', 'female', 'other') DEFAULT 'other',
    
    birth_date DATE,
    death_date DATE,
    birth_place VARCHAR(255),
    death_place VARCHAR(255),
    
    biography TEXT,
    photo_url VARCHAR(500),
    
    father_id INT,
    mother_id INT,
    spouse_id INT, -- Current main spouse, can be complex in reality but keeping simple for MVP
    
    is_alive BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (father_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (mother_id) REFERENCES family_members(id) ON DELETE SET NULL,
    FOREIGN KEY (spouse_id) REFERENCES family_members(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add family tree feature flag
INSERT IGNORE INTO feature_flags (feature_key, name, description, status) VALUES
('family_tree_module', 'אילן יוחסין', 'בניית עץ משפחה קהילתי', 'admin_only');

-- Indexes for search
CREATE INDEX idx_family_names ON family_members(last_name, first_name);
CREATE INDEX idx_family_parents ON family_members(father_id, mother_id);
