-- Migration: Add category support to recipe tags
-- This enables organizing tags into logical groups

-- Add category column to recipe_tags
ALTER TABLE recipe_tags ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general';

-- Add index for faster category filtering
CREATE INDEX IF NOT EXISTS idx_recipe_tags_category ON recipe_tags(category);

-- Update existing tags with categories (if any exist)
UPDATE recipe_tags SET category = 'ingredient_type' WHERE name IN ('meat', 'dairy', 'pareve');
UPDATE recipe_tags SET category = 'occasion' WHERE name IN ('holiday', 'shabbat', 'passover', 'rosh-hashana');
UPDATE recipe_tags SET category = 'food_type' WHERE name IN ('appetizer', 'main-dish', 'dessert', 'soup', 'bread');
UPDATE recipe_tags SET category = 'origin' WHERE name = 'traditional';
UPDATE recipe_tags SET category = 'difficulty' WHERE name = 'quick';
