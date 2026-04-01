-- Add phonetic_key column for fuzzy Hebrew search
ALTER TABLE dictionary_entries ADD COLUMN phonetic_key VARCHAR(500) NULL AFTER hebrew_script_normalized;
CREATE INDEX idx_phonetic_key ON dictionary_entries(phonetic_key);
