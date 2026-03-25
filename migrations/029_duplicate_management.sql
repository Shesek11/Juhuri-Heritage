-- Migration 029: Duplicate entry management
-- Adds merge_log, merge_suggestions tables and term_normalized column

-- 1. Audit trail for merge operations
CREATE TABLE IF NOT EXISTS merge_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    kept_entry_id INT NOT NULL,
    deleted_entry_id INT NOT NULL,
    deleted_term VARCHAR(255) NOT NULL,
    merge_details JSON NOT NULL,
    merged_by INT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (kept_entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (merged_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_kept (kept_entry_id),
    INDEX idx_merged_by (merged_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. User-proposed merge suggestions
CREATE TABLE IF NOT EXISTS merge_suggestions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id_a INT NOT NULL,
    entry_id_b INT NOT NULL,
    reason TEXT,
    user_id INT,
    user_name VARCHAR(100),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    reviewed_by INT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id_a) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id_b) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    UNIQUE KEY uniq_pair (entry_id_a, entry_id_b)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Normalized term column for fast duplicate detection
ALTER TABLE dictionary_entries
    ADD COLUMN term_normalized VARCHAR(255) NULL AFTER term;

CREATE INDEX idx_term_normalized ON dictionary_entries(term_normalized);

-- 4. Extend system_logs event_type
ALTER TABLE system_logs
MODIFY COLUMN event_type ENUM(
    'ENTRY_ADDED',
    'ENTRY_APPROVED',
    'ENTRY_DELETED',
    'ENTRY_REJECTED',
    'ENTRY_MERGED',
    'USER_LOGIN',
    'USER_REGISTER',
    'USER_ROLE_CHANGE',
    'USER_DELETED',
    'DIALECT_ADDED',
    'FEATURE_FLAG_CHANGED',
    'SETTING_CHANGED'
) NOT NULL;

-- 5. Populate term_normalized for existing entries
-- Strips Hebrew niqqud (U+0591 to U+05C7) and normalizes whitespace
UPDATE dictionary_entries
SET term_normalized = LOWER(TRIM(
    REGEXP_REPLACE(
        REGEXP_REPLACE(term, '[\\x{0591}-\\x{05C7}]', ''),
        '\\s+', ' '
    )
))
WHERE term IS NOT NULL AND term != '';
