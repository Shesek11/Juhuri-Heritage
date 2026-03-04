-- Migration 016: Community examples / proverbs system
-- Allows users to suggest proverbs, sayings and blessings with word-linking

CREATE TABLE IF NOT EXISTS community_examples (
    id INT AUTO_INCREMENT PRIMARY KEY,
    entry_id INT NULL,           -- linked entry (NULL if standalone)
    origin TEXT NOT NULL,         -- proverb in original language
    translated TEXT,              -- translation
    transliteration TEXT,         -- latin transliteration
    user_id INT NULL,
    user_name VARCHAR(100),
    status ENUM('pending','approved','rejected') DEFAULT 'pending',
    source_type ENUM('ai','community') DEFAULT 'community',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE SET NULL,
    INDEX idx_entry_status (entry_id, status),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS example_word_links (
    id INT AUTO_INCREMENT PRIMARY KEY,
    example_id INT NOT NULL,
    entry_id INT NOT NULL,
    FOREIGN KEY (example_id) REFERENCES community_examples(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
    UNIQUE INDEX idx_example_entry (example_id, entry_id)
);
