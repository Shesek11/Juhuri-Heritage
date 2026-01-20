-- Migration 007: Dictionary Community Features
-- Enables community-driven translations, voting, and suggestions

-- 1. Allow entries WITHOUT translations (for community to fill in)
ALTER TABLE dictionary_entries 
ADD COLUMN IF NOT EXISTS needs_translation BOOLEAN DEFAULT FALSE;

-- 2. Add missing_dialects column (JSON array of dialect names still needed)
ALTER TABLE dictionary_entries
ADD COLUMN IF NOT EXISTS missing_dialects JSON DEFAULT NULL;

-- 3. Translation Votes - Track community votes on translations
CREATE TABLE IF NOT EXISTS translation_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    translation_id INT NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    vote_type ENUM('up', 'down') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (translation_id, user_id),
    INDEX idx_translation (translation_id),
    INDEX idx_user (user_id),
    FOREIGN KEY (translation_id) REFERENCES translations(id) ON DELETE CASCADE
);

-- 4. Translation Corrections/Suggestions
CREATE TABLE IF NOT EXISTS translation_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    translation_id INT NULL COMMENT 'NULL if suggesting new dialect translation',
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(100) NOT NULL,
    dialect VARCHAR(50) NOT NULL,
    suggested_hebrew VARCHAR(255) NOT NULL,
    suggested_latin VARCHAR(255),
    suggested_cyrillic VARCHAR(255),
    reason TEXT COMMENT 'Why this change is suggested',
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by INT NULL,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_entry (entry_id),
    INDEX idx_status (status),
    INDEX idx_user (user_id),
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 5. Add vote counts to translations table for quick display
ALTER TABLE translations
ADD COLUMN IF NOT EXISTS upvotes INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS downvotes INT DEFAULT 0;
