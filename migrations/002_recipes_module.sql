-- Migration: Recipes Module
-- Creates tables for the recipes system

-- Recipes table
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_juhuri VARCHAR(255),
    description TEXT,
    story TEXT,
    ingredients JSON NOT NULL,
    instructions JSON NOT NULL,
    prep_time INT,
    cook_time INT,
    servings INT,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'medium',
    region_id INT,
    user_id INT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    is_featured BOOLEAN DEFAULT FALSE,
    view_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (region_id) REFERENCES dialects(id) ON DELETE SET NULL
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recipe photos table
CREATE TABLE IF NOT EXISTS recipe_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    url VARCHAR(500) NOT NULL,
    is_main BOOLEAN DEFAULT FALSE,
    alt_text VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recipe tags/categories
CREATE TABLE IF NOT EXISTS recipe_tags (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    name_hebrew VARCHAR(100),
    icon VARCHAR(50),
    color VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recipe-tag relationship (many-to-many)
CREATE TABLE IF NOT EXISTS recipe_tag_map (
    recipe_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (recipe_id, tag_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES recipe_tags(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recipe likes/favorites
CREATE TABLE IF NOT EXISTS recipe_likes (
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, recipe_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Recipe comments
CREATE TABLE IF NOT EXISTS recipe_comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    recipe_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Insert default recipe tags
INSERT IGNORE INTO recipe_tags (name, name_hebrew, icon, color) VALUES
('meat', 'בשרי', 'beef', '#8B4513'),
('dairy', 'חלבי', 'milk', '#F5F5DC'),
('pareve', 'פרווה', 'leaf', '#228B22'),
('holiday', 'חגים', 'star', '#FFD700'),
('shabbat', 'שבת', 'candle', '#4169E1'),
('passover', 'פסח', 'wheat-off', '#DAA520'),
('rosh-hashana', 'ראש השנה', 'apple', '#DC143C'),
('appetizer', 'מנה ראשונה', 'salad', '#90EE90'),
('main-dish', 'מנה עיקרית', 'utensils', '#CD853F'),
('dessert', 'קינוח', 'cake', '#FF69B4'),
('soup', 'מרק', 'soup', '#FFA500'),
('bread', 'לחם ומאפים', 'croissant', '#D2691E'),
('traditional', 'מסורתי', 'scroll', '#8B0000'),
('quick', 'מהיר', 'zap', '#00CED1');

-- Add recipes_module feature flag if not exists
INSERT IGNORE INTO feature_flags (feature_key, name, description, status) VALUES
('recipes_module', 'מודול מתכונים', 'מאפשר גישה למתכונים קהילתיים', 'admin_only');

-- Index for faster queries
CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_recipes_region ON recipes(region_id);
CREATE INDEX idx_recipes_approved ON recipes(is_approved);
CREATE INDEX idx_recipes_featured ON recipes(is_featured);
