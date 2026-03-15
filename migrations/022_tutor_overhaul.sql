-- ===========================
-- TUTOR OVERHAUL: New tables for structured learning
-- ===========================

-- Words assigned to curriculum units
CREATE TABLE IF NOT EXISTS unit_words (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unit_id VARCHAR(50) NOT NULL,
  entry_id INT NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  UNIQUE KEY unique_unit_word (unit_id, entry_id),
  INDEX idx_unit (unit_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Per-word mastery tracking (SRS - Leitner 5-box)
CREATE TABLE IF NOT EXISTS word_mastery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  entry_id INT NOT NULL,
  box INT DEFAULT 1,
  next_review DATETIME DEFAULT CURRENT_TIMESTAMP,
  times_correct INT DEFAULT 0,
  times_incorrect INT DEFAULT 0,
  last_reviewed DATETIME NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (entry_id) REFERENCES dictionary_entries(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_word (user_id, entry_id),
  INDEX idx_user_review (user_id, next_review)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Unit mastery levels (crowns: 0-5)
CREATE TABLE IF NOT EXISTS unit_mastery (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  unit_id VARCHAR(50) NOT NULL,
  mastery_level INT DEFAULT 0,
  best_score INT DEFAULT 0,
  attempts INT DEFAULT 0,
  completed_at TIMESTAMP NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_unit (user_id, unit_id),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily goals
CREATE TABLE IF NOT EXISTS user_daily_goals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  target_xp INT DEFAULT 10,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_goal (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Daily progress log
CREATE TABLE IF NOT EXISTS daily_progress (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  date DATE NOT NULL,
  xp_earned INT DEFAULT 0,
  words_learned INT DEFAULT 0,
  words_reviewed INT DEFAULT 0,
  lessons_completed INT DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_date (user_id, date),
  INDEX idx_user_date (user_id, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
