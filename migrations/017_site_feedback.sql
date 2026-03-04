-- Migration 017: Site-wide feedback / suggestions box
-- Allows users to submit improvement ideas and bug reports

CREATE TABLE IF NOT EXISTS site_feedback (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category ENUM('suggestion','bug','content','other') DEFAULT 'suggestion',
    message TEXT NOT NULL,
    user_name VARCHAR(100),
    user_email VARCHAR(255),
    page_url VARCHAR(500),
    status ENUM('new','read','done','dismissed') DEFAULT 'new',
    admin_note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created (created_at)
);
