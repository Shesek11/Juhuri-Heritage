-- Enhanced Recipe Tags with Categories
-- Comprehensive tag system for Juhuri recipes

-- Category: food_type (סוג מאכל)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('soup', 'מרק', 'food_type', '🍲', '#0891B2'),
('main_dish', 'מנה עיקרית', 'food_type', '🍽️', '#DC2626'),
('appetizer', 'מנה ראשונה', 'food_type', '🥗', '#16A34A'),
('side_dish', 'תוספת', 'food_type', '🥘', '#F59E0B'),
('dessert', 'קינוח', 'food_type', '🍰', '#DB2777'),
('pastry', 'מאפה', 'food_type', '🥐', '#F59E0B'),
('salad', 'סלט', 'food_type', '🥬', '#10B981'),
('drink', 'משקה', 'food_type', '🍹', '#8B5CF6'),
('snack', 'חטיף', 'food_type', '🍪', '#F97316'),
('bread', 'לחם', 'food_type', '🍞', '#92400E'),
('sauce', 'רוטב', 'food_type', '🥫', '#DC2626'),
('dip', 'מטבל', 'food_type', '🫙', '#059669'),
('jam', 'ריבה', 'food_type', '🍓', '#EC4899'),
('pickle', 'כבוש', 'food_type', '🥒', '#22C55E'),
('compote', 'קומפוט', 'food_type', '🍑', '#F472B6')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: meal_type (סוג ארוחה)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('breakfast', 'ארוחת בוקר', 'meal_type', '🌅', '#F59E0B'),
('brunch', 'בראנץ׳', 'meal_type', '☕', '#EAB308'),
('lunch', 'ארוחת צהריים', 'meal_type', '☀️', '#FCD34D'),
('dinner', 'ארוחת ערב', 'meal_type', '🌙', '#6366F1'),
('friday_night', 'ליל שבת', 'meal_type', '🕯️', '#7C3AED'),
('shabbat_lunch', 'צהריים שבת', 'meal_type', '📖', '#8B5CF6'),
('seuda_shlishit', 'סעודה שלישית', 'meal_type', '🌅', '#A855F7')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: ingredient_type (מרכיב עיקרי)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('beef', 'בקר', 'ingredient_type', '🥩', '#991B1B'),
('lamb', 'כבש', 'ingredient_type', '🐑', '#B91C1C'),
('chicken', 'עוף', 'ingredient_type', '🍗', '#B45309'),
('turkey', 'הודו', 'ingredient_type', '🦃', '#C2410C'),
('fish', 'דגים', 'ingredient_type', '🐟', '#0891B2'),
('salmon', 'סלמון', 'ingredient_type', '🐟', '#0284C7'),
('tuna', 'טונה', 'ingredient_type', '🐠', '#0369A1'),
('vegetarian', 'צמחוני', 'ingredient_type', '🥬', '#16A34A'),
('vegan', 'טבעוני', 'ingredient_type', '🌱', '#15803D'),
('dairy', 'חלבי', 'ingredient_type', '🥛', '#3B82F6'),
('eggs', 'ביצים', 'ingredient_type', '🥚', '#FDE047'),
('parve', 'פרווה', 'ingredient_type', '🌾', '#78716C'),
('rice', 'אורז', 'ingredient_type', '🍚', '#FCD34D'),
('pasta', 'פסטה', 'ingredient_type', '🍝', '#F59E0B'),
('legumes', 'קטניות', 'ingredient_type', '🫘', '#92400E'),
('beans', 'שעועית', 'ingredient_type', '🫘', '#78350F'),
('lentils', 'עדשים', 'ingredient_type', '🟤', '#7C2D12'),
('chickpeas', 'חומוס', 'ingredient_type', '🫘', '#A16207'),
('vegetables', 'ירקות', 'ingredient_type', '🥕', '#22C55E'),
('mushrooms', 'פטריות', 'ingredient_type', '🍄', '#65A30D'),
('eggplant', 'חציל', 'ingredient_type', '🍆', '#7C3AED'),
('zucchini', 'קישוא', 'ingredient_type', '🥒', '#10B981'),
('tomatoes', 'עגבניות', 'ingredient_type', '🍅', '#DC2626'),
('potatoes', 'תפוחי אדמה', 'ingredient_type', '🥔', '#A16207'),
('dough', 'בצק', 'ingredient_type', '🥟', '#D97706'),
('phyllo', 'בצק פילו', 'ingredient_type', '📄', '#CA8A04'),
('nuts', 'אגוזים', 'ingredient_type', '🌰', '#92400E'),
('walnuts', 'אגוזי מלך', 'ingredient_type', '🥜', '#78350F'),
('almonds', 'שקדים', 'ingredient_type', '🌰', '#A16207'),
('honey', 'דבש', 'ingredient_type', '🍯', '#F59E0B'),
('pomegranate', 'רימון', 'ingredient_type', '💎', '#DC2626'),
('dates', 'תמרים', 'ingredient_type', '🌴', '#92400E')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: occasion (אירועים וחגים)
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
('yartzeit', 'יארצייט', 'occasion', '🕯️', '#64748B'),
-- Seasonal & Cultural
('passover_seder', 'ליל הסדר', 'occasion', '🍷', '#DC2626'),
('rosh_hashanah_seder', 'סדר ראש השנה', 'occasion', '🍯', '#F59E0B'),
('friday_dinner', 'סעודת שבת', 'occasion', '🕎', '#6366F1'),
('festive', 'חגיגי', 'occasion', '🎊', '#EA580C'),
('everyday', 'יומיומי', 'occasion', '🏠', '#64748B'),
('guests', 'אירוח', 'occasion', '👥', '#3B82F6'),
('potluck', 'ארוחה משותפת', 'occasion', '🤝', '#10B981')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: difficulty (רמת קושי)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('very_easy', 'קל מאוד', 'difficulty', '⭐', '#22C55E'),
('easy', 'קל', 'difficulty', '✅', '#16A34A'),
('medium', 'בינוני', 'difficulty', '⚖️', '#F59E0B'),
('hard', 'מאתגר', 'difficulty', '🔥', '#DC2626'),
('expert', 'מומחה', 'difficulty', '👨‍🍳', '#991B1B')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: origin (מקור)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('juhuri', 'ג׳והורי', 'origin', '🇦🇿', '#DC2626'),
('mountain_jews', 'יהודי ההר', 'origin', '⛰️', '#991B1B'),
('caucasus', 'קווקזי', 'origin', '🏔️', '#059669'),
('azerbaijani', 'אזרבייג׳ני', 'origin', '🇦🇿', '#DC2626'),
('georgian', 'גאורגי', 'origin', '🇬🇪', '#DC2626'),
('dagestani', 'דאגסטני', 'origin', '🏔️', '#16A34A'),
('persian', 'פרסי', 'origin', '🇮🇷', '#059669'),
('bukharian', 'בוכרי', 'origin', '🕌', '#8B5CF6'),
('uzbek', 'אוזבקי', 'origin', '🇺🇿', '#3B82F6'),
('turkish', 'טורקי', 'origin', '🇹🇷', '#DC2626'),
('armenian', 'ארמני', 'origin', '🇦🇲', '#F97316'),
('ashkenazi', 'אשכנזי', 'origin', '🕍', '#6366F1'),
('sephardi', 'ספרדי', 'origin', '🏛️', '#DC2626'),
('yemenite', 'תימני', 'origin', '🇾🇪', '#10B981'),
('moroccan', 'מרוקאי', 'origin', '🇲🇦', '#DC2626'),
('iraqi', 'עיראקי', 'origin', '🇮🇶', '#059669'),
('traditional', 'מסורתי', 'origin', '👴', '#92400E'),
('modern', 'מודרני', 'origin', '✨', '#8B5CF6'),
('fusion', 'פיוז׳ן', 'origin', '🌈', '#EC4899')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: cooking_method (שיטת בישול)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('baked', 'אפוי', 'cooking_method', '🔥', '#F97316'),
('fried', 'מטוגן', 'cooking_method', '🍳', '#EAB308'),
('deep_fried', 'מטוגן בשמן עמוק', 'cooking_method', '🫕', '#F59E0B'),
('grilled', 'צלוי', 'cooking_method', '🔥', '#DC2626'),
('boiled', 'מבושל', 'cooking_method', '♨️', '#3B82F6'),
('steamed', 'מאודה', 'cooking_method', '💨', '#06B6D4'),
('slow_cooked', 'בישול איטי', 'cooking_method', '⏱️', '#92400E'),
('pressure_cooker', 'סיר לחץ', 'cooking_method', '⚡', '#DC2626'),
('instant_pot', 'אינסטנט פוט', 'cooking_method', '⚡', '#8B5CF6'),
('air_fryer', 'מטגנת אוויר', 'cooking_method', '🌪️', '#06B6D4'),
('raw', 'ללא בישול', 'cooking_method', '🥗', '#10B981'),
('no_cook', 'ללא בישול', 'cooking_method', '❄️', '#3B82F6'),
('stovetop', 'כיריים', 'cooking_method', '🔥', '#F97316'),
('oven', 'תנור', 'cooking_method', '🔥', '#DC2626'),
('microwave', 'מיקרוגל', 'cooking_method', '📡', '#8B5CF6'),
('braised', 'מבושל בנוזלים', 'cooking_method', '🥘', '#92400E'),
('roasted', 'קלוי', 'cooking_method', '🔥', '#EA580C'),
('smoked', 'מעושן', 'cooking_method', '💨', '#64748B'),
('fermented', 'מותסס', 'cooking_method', '🫙', '#059669')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: dietary (תזונה מיוחדת)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('kosher', 'כשר', 'dietary', '✡️', '#6366F1'),
('gluten_free', 'ללא גלוטן', 'dietary', '🌾', '#F59E0B'),
('sugar_free', 'ללא סוכר', 'dietary', '🚫', '#DC2626'),
('low_sugar', 'דל סוכר', 'dietary', '🍬', '#F59E0B'),
('low_carb', 'דל פחמימות', 'dietary', '🥗', '#16A34A'),
('keto', 'קטו', 'dietary', '🥑', '#10B981'),
('paleo', 'פליאו', 'dietary', '🦴', '#92400E'),
('vegan', 'טבעוני', 'dietary', '🌱', '#10B981'),
('vegetarian', 'צמחוני', 'dietary', '🥬', '#22C55E'),
('pescatarian', 'פסקטריאני', 'dietary', '🐟', '#0891B2'),
('dairy_free', 'ללא חלב', 'dietary', '🥛', '#3B82F6'),
('lactose_free', 'ללא לקטוז', 'dietary', '🚫', '#60A5FA'),
('nut_free', 'ללא אגוזים', 'dietary', '🥜', '#92400E'),
('egg_free', 'ללא ביצים', 'dietary', '🥚', '#FDE047'),
('low_fat', 'דל שומן', 'dietary', '🫒', '#84CC16'),
('low_sodium', 'דל נתרן', 'dietary', '🧂', '#64748B'),
('high_protein', 'עשיר חלבון', 'dietary', '💪', '#DC2626'),
('high_fiber', 'עשיר סיבים', 'dietary', '🌾', '#92400E'),
('healthy', 'בריא', 'dietary', '💪', '#22C55E'),
('whole30', 'Whole30', 'dietary', '🥗', '#16A34A'),
('mediterranean', 'ים תיכוני', 'dietary', '🫒', '#0891B2')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: season (עונה)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('spring', 'אביב', 'season', '🌸', '#EC4899'),
('summer', 'קיץ', 'season', '☀️', '#F59E0B'),
('autumn', 'סתיו', 'season', '🍂', '#B45309'),
('fall', 'סתיו', 'season', '🍁', '#C2410C'),
('winter', 'חורף', 'season', '❄️', '#3B82F6'),
('year_round', 'כל השנה', 'season', '🌍', '#64748B'),
('hot_weather', 'מזג אוויר חם', 'season', '🌡️', '#DC2626'),
('cold_weather', 'מזג אוויר קר', 'season', '🧊', '#0891B2')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);

-- Category: general (כללי)
INSERT INTO recipe_tags (name, name_hebrew, category, icon, color) VALUES
('quick', 'מהיר', 'general', '⚡', '#00CED1'),
('under_30_min', 'פחות מ-30 דקות', 'general', '⏱️', '#22C55E'),
('one_pot', 'סיר אחד', 'general', '🥘', '#F59E0B'),
('sheet_pan', 'תבנית אחת', 'general', '🍳', '#F97316'),
('make_ahead', 'הכנה מראש', 'general', '📅', '#8B5CF6'),
('freezer_friendly', 'ניתן להקפאה', 'general', '🧊', '#06B6D4'),
('leftovers', 'שאריות', 'general', '♻️', '#10B981'),
('comfort_food', 'אוכל נוחות', 'general', '🤗', '#F59E0B'),
('gourmet', 'גורמה', 'general', '🌟', '#FBBF24'),
('restaurant_style', 'סגנון מסעדה', 'general', '👨‍🍳', '#DC2626'),
('kid_friendly', 'ידידותי לילדים', 'general', '👶', '#EC4899'),
('budget_friendly', 'חסכוני', 'general', '💰', '#10B981'),
('crowd_pleaser', 'מוצלח לקהל', 'general', '👥', '#8B5CF6'),
('impressive', 'מרשים', 'general', '✨', '#F472B6'),
('beginner', 'למתחילים', 'general', '📚', '#22C55E'),
('family_recipe', 'מתכון משפחתי', 'general', '👨‍👩‍👧‍👦', '#DC2626'),
('grandmas_recipe', 'מתכון של סבתא', 'general', '👵', '#92400E')
ON DUPLICATE KEY UPDATE name_hebrew=VALUES(name_hebrew), icon=VALUES(icon), color=VALUES(color), category=VALUES(category);
