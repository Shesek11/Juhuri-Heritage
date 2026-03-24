-- Normalize abbreviated POS values to full form
UPDATE dictionary_entries SET part_of_speech = 'adjective' WHERE part_of_speech = 'adj';
UPDATE dictionary_entries SET part_of_speech = 'adverb' WHERE part_of_speech = 'adv';
UPDATE dictionary_entries SET part_of_speech = 'preposition' WHERE part_of_speech = 'prep';
UPDATE dictionary_entries SET part_of_speech = 'number' WHERE part_of_speech = 'num';
UPDATE dictionary_entries SET part_of_speech = 'pronoun' WHERE part_of_speech = 'pron';
UPDATE dictionary_entries SET part_of_speech = 'interjection' WHERE part_of_speech = 'interj';
UPDATE dictionary_entries SET part_of_speech = 'conjunction' WHERE part_of_speech = 'conj';

-- Clean pronunciation_guide trailing numbers/colons (e.g. "xuna1" → "xuna")
UPDATE dictionary_entries
SET pronunciation_guide = REGEXP_REPLACE(pronunciation_guide, '[0-9:]+$', '')
WHERE pronunciation_guide REGEXP '[0-9:]+$';
