-- Production readiness: missing indexes
-- These improve query performance on frequently filtered/joined columns

-- Recipes: is_approved is in every public query WHERE clause
CREATE INDEX IF NOT EXISTS idx_recipes_is_approved ON recipes(is_approved);

-- Recipe photos: correlated subquery fetches main photo per recipe
CREATE INDEX IF NOT EXISTS idx_recipe_photos_main ON recipe_photos(recipe_id, is_main);

-- Recipe likes: COUNT(*) per recipe
CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe ON recipe_likes(recipe_id);

-- Recipe comments: COUNT(*) per recipe
CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe ON recipe_comments(recipe_id);

-- Translations: dialect filtering
CREATE INDEX IF NOT EXISTS idx_translations_dialect ON translations(dialect_id);

-- User progress: time-based queries
CREATE INDEX IF NOT EXISTS idx_user_progress_completed ON user_progress(completed_at);

-- Dictionary entries: status filtering (used in almost every query)
CREATE INDEX IF NOT EXISTS idx_dictionary_entries_status ON dictionary_entries(status);
