-- Enhanced Recipe Tags with Categories
-- Comprehensive tag system for Juhuri recipes

-- First, let's add a category column to recipe_tags if it doesn't exist
-- This would normally be done in a migration, but for now we'll handle both cases

-- Clear existing tags (optional - only if you want to start fresh)
-- DELETE FROM recipe_tag_map;
-- DELETE FROM recipe_tags;

-- Insert categorized tags
-- Category: food_type (סוג מאכל)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('soup', 'מרק', 'food_type', '🍲', '#0891B2'),
('main_dish', 'מנה עיקרית', 'food_type', '🍽️', '#DC2626'),
('appetizer', 'מנה ראשונה', 'food_type', '🥗', '#16A34A'),
('dessert', 'קינוח', 'food_type', '🍰', '#DB2777'),
('pastry', 'מאפה', 'food_type', '🥐', '#F59E0B'),
('salad', 'סלט', 'food_type', '🥬', '#10B981'),
('drink', 'משקה', 'food_type', '🍹', '#8B5CF6'),
('snack', 'חטיף', 'food_type', '🍪', '#F97316'),
('bread', 'לחם', 'food_type', '🍞', '#92400E'),
('sauce', 'רוטב', 'food_type', '🥫', '#DC2626')
ON DUPLICATE KEY UPDATE name=name;

-- Category: meal_type (סוג ארוחה)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('breakfast', 'ארוחת בוקר', 'meal_type', '🌅', '#F59E0B'),
('lunch', 'ארוחת צהריים', 'meal_type', '☀️', '#EAB308'),
('dinner', 'ארוחת ערב', 'meal_type', '🌙', '#6366F1'),
('friday_night', 'ליל שבת', 'meal_type', '🕯️', '#7C3AED')
ON DUPLICATE KEY UPDATE name=name;

-- Category: ingredient_type (מרכיב עיקרי)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('meat', 'בשרי', 'ingredient_type', '🥩', '#991B1B'),
('chicken', 'עוף', 'ingredient_type', '🍗', '#B45309'),
('fish', 'דגים', 'ingredient_type', '🐟', '#0891B2'),
('vegetarian', 'צמחוני', 'ingredient_type', '🥬', '#16A34A'),
('dairy', 'חלבי', 'ingredient_type', '🥛', '#3B82F6'),
('parve', 'פרווה', 'ingredient_type', '🌾', '#78716C'),
('rice', 'אורז', 'ingredient_type', '🍚', '#FCD34D'),
('legumes', 'קטניות', 'ingredient_type', '🫘', '#92400E'),
('vegetables', 'ירקות', 'ingredient_type', '🥕', '#22C55E'),
('dough', 'בצק', 'ingredient_type', '🥟', '#D97706')
ON DUPLICATE KEY UPDATE name=name;

-- Category: occasion (אירוע)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
-- Jewish Holidays
('rosh_hashanah', 'ראש השנה', 'occasion', '🍎', '#DC2626'),
('yom_kippur', 'יום כיפור', 'occasion', '🕊️', '#6366F1'),
('sukkot', 'סוכות', 'occasion', '🏕️', '#16A34A'),
('simchat_torah', 'שמחת תורה', 'occasion', '📜', '#8B5CF6'),
('hanukkah', 'חנוכה', 'occasion', '🕎', '#3B82F6'),
('tu_bishvat', 'ט״ו בשבט', 'occasion', '🌳', '#10B981'),
('purim', 'פורים', 'occasion', '🎭', '#EC4899'),
('pesach', 'פסח', 'occasion', '🍷', '#991B1B'),
('lag_baomer', 'ל״ג בעומר', 'occasion', '🔥', '#F97316'),
('shavuot', 'שבועות', 'occasion', '🌾', '#FBBF24'),
('tisha_bav', 'תשעה באב', 'occasion', '⚫', '#64748B'),
('shabbat', 'שבת', 'occasion', '🕯️', '#4F46E5'),
-- Life Events
('wedding', 'חתונה', 'occasion', '💍', '#F472B6'),
('brit_milah', 'ברית מילה', 'occasion', '👶', '#60A5FA'),
('bar_mitzvah', 'בר מצווה', 'occasion', '📖', '#8B5CF6'),
('bat_mitzvah', 'בת מצווה', 'occasion', '🌸', '#EC4899'),
('pidyon_haben', 'פדיון הבן', 'occasion', '🎁', '#FBBF24'),
('memorial', 'אזכרה', 'occasion', '🕯️', '#475569'),
-- Seasonal & Cultural
('passover_seder', 'ליל הסדר', 'occasion', '🍷', '#DC2626'),
('rosh_hashanah_seder', 'סדר ראש השנה', 'occasion', '🍯', '#F59E0B'),
('friday_dinner', 'סעודת שבת', 'occasion', '🕎', '#6366F1'),
('festive', 'חגיגי', 'occasion', '🎊', '#EA580C'),
('everyday', 'יומיומי', 'occasion', '🏠', '#64748B')
ON DUPLICATE KEY UPDATE name=name;

-- Category: difficulty (רמת קושי)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('very_easy', 'קל מאוד', 'difficulty', '⭐', '#22C55E'),
('easy', 'קל', 'difficulty', '✅', '#16A34A'),
('medium', 'בינוני', 'difficulty', '⚖️', '#F59E0B'),
('hard', 'מאתגר', 'difficulty', '🔥', '#DC2626'),
('expert', 'מומחה', 'difficulty', '👨‍🍳', '#991B1B')
ON DUPLICATE KEY UPDATE name=name;

-- Category: origin (מקור)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('juhuri', 'ג׳והורי', 'origin', '🇦🇿', '#DC2626'),
('caucasus', 'קווקזי', 'origin', '⛰️', '#059669'),
('azerbaijani', 'אזרבייג׳ני', 'origin', '🇦🇿', '#DC2626'),
('georgian', 'גאורגי', 'origin', '🇬🇪', '#DC2626'),
('dagestani', 'דאגסטני', 'origin', '🏔️', '#16A34A'),
('persian', 'פרסי', 'origin', '🇮🇷', '#059669'),
('bukharian', 'בוכרי', 'origin', '🕌', '#8B5CF6'),
('ashkenazi', 'אשכנזי', 'origin', '🕍', '#6366F1'),
('sephardi', 'ספרדי', 'origin', '🏛️', '#DC2626'),
('traditional', 'מסורתי', 'origin', '👴', '#059669'),
('modern', 'מודרני', 'origin', '✨', '#8B5CF6')
ON DUPLICATE KEY UPDATE name=name;

-- Category: cooking_method (שיטת בישול)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('baked', 'אפוי', 'cooking_method', '🔥', '#F97316'),
('fried', 'מטוגן', 'cooking_method', '🍳', '#EAB308'),
('grilled', 'צלוי', 'cooking_method', '🔥', '#DC2626'),
('boiled', 'מבושל', 'cooking_method', '♨️', '#3B82F6'),
('steamed', 'מאודה', 'cooking_method', '💨', '#06B6D4'),
('slow_cooked', 'בישול איטי', 'cooking_method', '⏱️', '#92400E'),
('pressure_cooker', 'סיר לחץ', 'cooking_method', '⚡', '#DC2626'),
('raw', 'ללא בישול', 'cooking_method', '🥗', '#10B981')
ON DUPLICATE KEY UPDATE name=name;

-- Category: dietary (תזונה מיוחדת)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('kosher', 'כשר', 'dietary', '✡️', '#6366F1'),
('gluten_free', 'ללא גלוטן', 'dietary', '🌾', '#F59E0B'),
('sugar_free', 'ללא סוכר', 'dietary', '🚫', '#DC2626'),
('low_carb', 'דל פחמימות', 'dietary', '🥗', '#16A34A'),
('vegan', 'טבעוני', 'dietary', '🌱', '#10B981'),
('healthy', 'בריא', 'dietary', '💪', '#22C55E')
ON DUPLICATE KEY UPDATE name=name;

-- Category: season (עונה)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('spring', 'אביב', 'season', '🌸', '#EC4899'),
('summer', 'קיץ', 'season', '☀️', '#F59E0B'),
('autumn', 'סתיו', 'season', '🍂', '#B45309'),
('winter', 'חורף', 'season', '❄️', '#3B82F6')
ON DUPLICATE KEY UPDATE name=name;
