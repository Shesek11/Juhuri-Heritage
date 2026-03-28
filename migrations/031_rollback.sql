-- Rollback for Migration 031: Dictionary Schema Restructure
-- Run this to fully reverse the schema changes.

-- Reverse merge_log
ALTER TABLE merge_log CHANGE `deleted_hebrew_script` `deleted_term` VARCHAR(255) NULL;

-- Reverse FULLTEXT indexes
ALTER TABLE dictionary_entries DROP INDEX IF EXISTS `ft_hebrew_script`;
ALTER TABLE dictionary_entries ADD FULLTEXT INDEX `ft_term` (`hebrew_script`);
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_hebrew_script`;
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_latin_script`;
ALTER TABLE dialect_scripts DROP INDEX IF EXISTS `ft_cyrillic_script`;

-- Reverse field_sources
UPDATE field_sources SET field_name = 'hebrew' WHERE field_name = 'hebrew_short';
UPDATE field_sources SET field_name = 'latin' WHERE field_name = 'latin_script';
UPDATE field_sources SET field_name = 'cyrillic' WHERE field_name = 'cyrillic_script';
UPDATE field_sources SET field_name = 'russian' WHERE field_name = 'russian_short';
UPDATE field_sources SET field_name = 'definition' WHERE field_name = 'hebrew_long';
UPDATE field_sources SET field_name = 'pronunciation_guide' WHERE field_name = 'pronunciationGuide';

-- Reverse translation_suggestions
ALTER TABLE translation_suggestions CHANGE `suggested_hebrew_short` `suggested_hebrew` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_latin_script` `suggested_latin` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_cyrillic_script` `suggested_cyrillic` VARCHAR(255) NULL;
ALTER TABLE translation_suggestions CHANGE `suggested_russian_short` `suggested_russian` VARCHAR(500) NULL;

-- Recreate definitions table from hebrew_long
CREATE TABLE IF NOT EXISTS `definitions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `entry_id` INT NOT NULL,
  `definition` TEXT NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `dictionary_entries`(`id`) ON DELETE CASCADE,
  INDEX `idx_entry` (`entry_id`)
);
INSERT INTO definitions (entry_id, definition)
  SELECT id, hebrew_long FROM dictionary_entries
  WHERE hebrew_long IS NOT NULL AND hebrew_long != '';

-- Move pronunciation_guide back to dictionary_entries
ALTER TABLE dictionary_entries ADD COLUMN `pronunciation_guide` TEXT NULL;
UPDATE dictionary_entries de
  JOIN dialect_scripts ds ON de.id = ds.entry_id
  SET de.pronunciation_guide = ds.pronunciation_guide
  WHERE ds.pronunciation_guide IS NOT NULL AND ds.pronunciation_guide != '';
ALTER TABLE dialect_scripts DROP COLUMN `pronunciation_guide`;

-- Rename dialect_scripts back to translations
ALTER TABLE dialect_scripts CHANGE `hebrew_script` `hebrew` TEXT NULL;
ALTER TABLE dialect_scripts CHANGE `latin_script` `latin` TEXT NULL;
ALTER TABLE dialect_scripts CHANGE `cyrillic_script` `cyrillic` TEXT NULL;
RENAME TABLE `dialect_scripts` TO `translations`;

-- Recreate original FULLTEXT on translations
ALTER TABLE translations ADD FULLTEXT INDEX `ft_hebrew` (`hebrew`);
ALTER TABLE translations ADD FULLTEXT INDEX `ft_latin` (`latin`);
ALTER TABLE translations ADD FULLTEXT INDEX `ft_cyrillic` (`cyrillic`);

-- Drop new columns
ALTER TABLE dictionary_entries DROP COLUMN `hebrew_short`;
ALTER TABLE dictionary_entries DROP COLUMN `hebrew_long`;
ALTER TABLE dictionary_entries DROP COLUMN `russian_long`;
ALTER TABLE dictionary_entries DROP COLUMN `english_long`;

-- Rename columns back
ALTER TABLE dictionary_entries CHANGE `hebrew_script` `term` VARCHAR(255) NOT NULL;
ALTER TABLE dictionary_entries CHANGE `hebrew_script_normalized` `term_normalized` VARCHAR(255) NULL;
ALTER TABLE dictionary_entries CHANGE `russian_short` `russian` TEXT NULL;
ALTER TABLE dictionary_entries CHANGE `english_short` `english` TEXT NULL;

-- Recreate original FULLTEXT on dictionary_entries
ALTER TABLE dictionary_entries ADD FULLTEXT INDEX `ft_term` (`term`);
