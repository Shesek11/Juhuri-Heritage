-- Migration 031: Dictionary Schema Restructure
-- Renames confusing columns, adds multilingual meaning fields,
-- renames translations→dialect_scripts, drops definitions table.
--
-- BACKUP: /tmp/juhuri_backup_pre_restructure_20260328_0222.sql
-- ROLLBACK: migrations/031_rollback.sql

-- =====================================================================
-- STEP 1: Rename dictionary_entries columns
-- =====================================================================
ALTER TABLE dictionary_entries CHANGE `term` `hebrew_script` VARCHAR(255) NOT NULL;
ALTER TABLE dictionary_entries CHANGE `term_normalized` `hebrew_script_normalized` VARCHAR(255) NULL;
ALTER TABLE dictionary_entries CHANGE `russian` `russian_short` TEXT NULL;
ALTER TABLE dictionary_entries CHANGE `english` `english_short` TEXT NULL;

-- =====================================================================
-- STEP 2: Add new meaning columns to dictionary_entries
-- =====================================================================
ALTER TABLE dictionary_entries ADD COLUMN `hebrew_short` TEXT NULL AFTER `part_of_speech`;
ALTER TABLE dictionary_entries ADD COLUMN `hebrew_long` TEXT NULL AFTER `hebrew_short`;
ALTER TABLE dictionary_entries ADD COLUMN `russian_long` TEXT NULL AFTER `russian_short`;
ALTER TABLE dictionary_entries ADD COLUMN `english_long` TEXT NULL AFTER `english_short`;

-- =====================================================================
-- STEP 3: Migrate translations.hebrew → dictionary_entries.hebrew_short
-- (translations.hebrew is actually Hebrew meaning, not script)
-- =====================================================================
UPDATE dictionary_entries de
  JOIN translations t ON de.id = t.entry_id
  SET de.hebrew_short = t.hebrew
  WHERE t.hebrew IS NOT NULL AND t.hebrew != '';

-- =====================================================================
-- STEP 4: Migrate definitions.definition → dictionary_entries.hebrew_long
-- =====================================================================
UPDATE dictionary_entries de
  JOIN definitions d ON de.id = d.entry_id
  SET de.hebrew_long = d.definition
  WHERE d.definition IS NOT NULL AND d.definition != '';

-- =====================================================================
-- STEP 5: Rename translations → dialect_scripts + rename columns
-- =====================================================================
RENAME TABLE `translations` TO `dialect_scripts`;
ALTER TABLE dialect_scripts CHANGE `hebrew` `hebrew_script` TEXT NULL;
ALTER TABLE dialect_scripts CHANGE `latin` `latin_script` TEXT NULL;
ALTER TABLE dialect_scripts CHANGE `cyrillic` `cyrillic_script` TEXT NULL;

-- =====================================================================
-- STEP 6: Move pronunciation_guide from entries to dialect_scripts
-- =====================================================================
ALTER TABLE dialect_scripts ADD COLUMN `pronunciation_guide` TEXT NULL AFTER `cyrillic_script`;

UPDATE dialect_scripts ds
  JOIN dictionary_entries de ON ds.entry_id = de.id
  SET ds.pronunciation_guide = de.pronunciation_guide
  WHERE de.pronunciation_guide IS NOT NULL AND de.pronunciation_guide != '';

ALTER TABLE dictionary_entries DROP COLUMN `pronunciation_guide`;

-- =====================================================================
-- STEP 7: Drop definitions table (data migrated to hebrew_long)
-- =====================================================================
DROP TABLE IF EXISTS `definitions`;

-- =====================================================================
-- STEP 8: Rename translation_suggestions columns
-- =====================================================================
ALTER TABLE translation_suggestions CHANGE `suggested_hebrew` `suggested_hebrew_short` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_latin` `suggested_latin_script` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_cyrillic` `suggested_cyrillic_script` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_russian` `suggested_russian_short` VARCHAR(500) NULL;

-- =====================================================================
-- STEP 9: Update field_sources field_name values
-- =====================================================================
UPDATE field_sources SET field_name = 'hebrew_short' WHERE field_name = 'hebrew';
UPDATE field_sources SET field_name = 'latin_script' WHERE field_name = 'latin';
UPDATE field_sources SET field_name = 'cyrillic_script' WHERE field_name = 'cyrillic';
UPDATE field_sources SET field_name = 'russian_short' WHERE field_name = 'russian';
UPDATE field_sources SET field_name = 'hebrew_long' WHERE field_name = 'definition';
UPDATE field_sources SET field_name = 'pronunciationGuide' WHERE field_name = 'pronunciation_guide';

-- =====================================================================
-- STEP 10: Recreate FULLTEXT indexes with correct names
-- =====================================================================
-- dictionary_entries indexes
ALTER TABLE dictionary_entries DROP INDEX IF EXISTS `ft_term`;
ALTER TABLE dictionary_entries ADD FULLTEXT INDEX `ft_hebrew_script` (`hebrew_script`);

-- dialect_scripts indexes (inherited from translations)
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_hebrew`;
ALTER TABLE dialect_scripts ADD FULLTEXT INDEX `ft_hebrew_script` (`hebrew_script`);
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_latin`;
ALTER TABLE dialect_scripts ADD FULLTEXT INDEX `ft_latin_script` (`latin_script`);
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_cyrillic`;
ALTER TABLE dialect_scripts ADD FULLTEXT INDEX `ft_cyrillic_script` (`cyrillic_script`);

-- =====================================================================
-- STEP 11: Update merge_log if exists
-- =====================================================================
ALTER TABLE merge_log CHANGE `deleted_term` `deleted_hebrew_script` VARCHAR(255) NULL;
