-- 032_i18n_support.sql
-- Add internationalization support: user locale preference, feature flag translations, AI translation cache

-- User locale preference
ALTER TABLE users ADD COLUMN locale ENUM('he','en','ru') DEFAULT 'he';

-- Feature flag names in other languages
ALTER TABLE feature_flags
  ADD COLUMN name_en VARCHAR(255) NULL,
  ADD COLUMN name_ru VARCHAR(255) NULL;

-- AI translation cache for non-dictionary content (recipes, pages, marketplace, music)
-- Titles are auto-translated on creation; full content translated on user demand
-- original_hash allows stale detection when source content is updated
CREATE TABLE IF NOT EXISTS ai_translations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  content_type ENUM('recipe','page','vendor','music') NOT NULL,
  content_id VARCHAR(255) NOT NULL,
  field_name VARCHAR(100) NOT NULL,
  locale ENUM('en','ru') NOT NULL,
  original_hash CHAR(32) NOT NULL,
  translated_text TEXT NOT NULL,
  auto_translated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_translation (content_type, content_id, field_name, locale),
  INDEX idx_content_lookup (content_type, content_id, locale)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
