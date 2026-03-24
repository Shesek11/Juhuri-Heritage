-- Migration 027: Add source_name column + standardize source ENUM values
-- source_name: stores contributor/dictionary name (e.g., "מילון אניסימוב", "יוסי שמעוני")
-- source ENUM: AI / מאגר / קהילה (replacing Manual/User/Community)

-- ===========================
-- 1. Add source_name column
-- ===========================
ALTER TABLE dictionary_entries
    ADD COLUMN source_name VARCHAR(255) NULL AFTER source;

-- ===========================
-- 2. Extend ENUM to include both old and new values (transition step)
-- ===========================
ALTER TABLE dictionary_entries
    MODIFY COLUMN source ENUM('AI', 'Manual', 'User', 'Community', 'מאגר', 'קהילה') DEFAULT 'מאגר';

-- ===========================
-- 3. Migrate old values to new
-- ===========================
UPDATE dictionary_entries SET source = 'מאגר' WHERE source IN ('Manual', 'User');
UPDATE dictionary_entries SET source = 'קהילה' WHERE source = 'Community';

-- ===========================
-- 4. Restrict ENUM to final values only
-- ===========================
ALTER TABLE dictionary_entries
    MODIFY COLUMN source ENUM('AI', 'מאגר', 'קהילה') DEFAULT 'מאגר';

-- ===========================
-- 5. Backfill source_name from source_info JSON where available
-- ===========================
UPDATE dictionary_entries
    SET source_name = JSON_UNQUOTE(JSON_EXTRACT(source_info, '$[0]'))
    WHERE source_info IS NOT NULL
    AND JSON_LENGTH(source_info) > 0
    AND source_name IS NULL;
