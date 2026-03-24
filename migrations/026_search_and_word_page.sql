-- Migration 026: Search enhancements + Word page support + Notifications
-- Part of dictionary search & word page redesign

-- 1. FULLTEXT indexes for cross-script search (latin/cyrillic)
ALTER TABLE translations ADD FULLTEXT INDEX ft_latin (latin);
ALTER TABLE translations ADD FULLTEXT INDEX ft_cyrillic (cyrillic);

-- 2. Regular indexes for LIKE queries on latin/cyrillic
CREATE INDEX idx_trans_latin ON translations (latin(100));
CREATE INDEX idx_trans_cyrillic ON translations (cyrillic(100));

-- 3. Report type on suggestions (correction vs report vs alternative vs new)
ALTER TABLE translation_suggestions
  ADD COLUMN report_type ENUM('correction', 'report', 'alternative', 'new_translation')
  DEFAULT 'correction' AFTER status;

-- 4. Search context: what the user originally searched for when suggesting
ALTER TABLE translation_suggestions
  ADD COLUMN search_context VARCHAR(255) DEFAULT NULL AFTER report_type;

-- 5. Flagged translations (auto-flagged when downvotes exceed threshold)
ALTER TABLE translations
  ADD COLUMN flagged BOOLEAN DEFAULT FALSE;

-- 6. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('suggestion_approved', 'suggestion_rejected', 'entry_approved',
            'example_approved', 'upvote_received', 'comment_reply') NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_unread (user_id, is_read),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Word page: view tracking
CREATE TABLE IF NOT EXISTS word_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  view_date DATE NOT NULL,
  view_count INT DEFAULT 1,
  UNIQUE KEY uq_entry_date (entry_id, view_date),
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- 8. Word page: related words
CREATE TABLE IF NOT EXISTS related_words (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  related_entry_id INT NOT NULL,
  relation_type ENUM('root', 'synonym', 'antonym', 'derived', 'see_also') DEFAULT 'see_also',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_relation (entry_id, related_entry_id),
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  FOREIGN KEY (related_entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE
);

-- 9. Guest fingerprint for tracking anonymous contributions
ALTER TABLE translation_suggestions
  ADD COLUMN guest_fingerprint VARCHAR(64) DEFAULT NULL AFTER user_name;
