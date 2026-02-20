-- Migration 015: Dictionary V2 - Schema enhancements for 27K import + community features
-- Adds: russian, part_of_speech, english, source_info to dictionary_entries
-- Adds: field_sources table for tracking origin of each field value
-- Allows: NULL dialect_id in translations (unknown dialect)
-- Adds: source 'Community' to dictionary_entries source ENUM

-- ===========================
-- 1. Extend dictionary_entries
-- ===========================

-- Add new columns
ALTER TABLE dictionary_entries
    ADD COLUMN part_of_speech VARCHAR(50) NULL AFTER pronunciation_guide,
    ADD COLUMN russian TEXT NULL AFTER part_of_speech,
    ADD COLUMN english TEXT NULL AFTER russian,
    ADD COLUMN source_info JSON NULL AFTER english;

-- Extend source ENUM to include 'Community'
ALTER TABLE dictionary_entries
    MODIFY COLUMN source ENUM('AI', 'Manual', 'User', 'Community') DEFAULT 'Manual';

-- ===========================
-- 2. Allow NULL dialect_id in translations
-- ===========================

-- Drop existing FK, modify column, re-add FK with SET NULL
ALTER TABLE translations DROP FOREIGN KEY translations_ibfk_2;
ALTER TABLE translations MODIFY COLUMN dialect_id INT NULL;
ALTER TABLE translations ADD CONSTRAINT translations_ibfk_2
    FOREIGN KEY (dialect_id) REFERENCES dialects(id) ON DELETE SET NULL;

-- ===========================
-- 3. Field sources tracking table
-- ===========================

CREATE TABLE IF NOT EXISTS field_sources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NOT NULL,
    field_name VARCHAR(50) NOT NULL COMMENT 'e.g. hebrew, latin, cyrillic, definition, russian',
    source_type ENUM('import', 'ai', 'community', 'manual') NOT NULL DEFAULT 'import',
    confidence FLOAT NULL COMMENT 'AI confidence score (NULL for non-AI)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    INDEX idx_entry_field (entry_id, field_name),
    INDEX idx_source_type (source_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ===========================
-- 4. Add field_name support to translation_suggestions
-- ===========================

ALTER TABLE translation_suggestions
    ADD COLUMN field_name VARCHAR(50) NULL AFTER translation_id,
    ADD COLUMN suggested_russian VARCHAR(500) NULL AFTER suggested_cyrillic;

-- ===========================
-- 5. Add FULLTEXT index on translations.hebrew for reverse search
-- ===========================

ALTER TABLE translations ADD FULLTEXT INDEX ft_hebrew (hebrew);
