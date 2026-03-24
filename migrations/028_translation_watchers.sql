-- Migration 028: Translation watchers
-- Users can request a translation and get notified when it's added

CREATE TABLE IF NOT EXISTS translation_watchers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  entry_id INT NOT NULL,
  user_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notified BOOLEAN DEFAULT FALSE,
  UNIQUE KEY uq_watcher (entry_id, user_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
