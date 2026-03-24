-- Suggestion upvotes table for community reinforcement of pending suggestions
CREATE TABLE IF NOT EXISTS suggestion_votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suggestion_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_vote (suggestion_id, user_id),
    FOREIGN KEY (suggestion_id) REFERENCES translation_suggestions(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
