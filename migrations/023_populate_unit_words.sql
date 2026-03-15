-- Migration 023: Populate unit_words with real dictionary entries
-- Maps dictionary words to curriculum units for the Private Tutor

-- Clear existing data (idempotent)
DELETE FROM unit_words;

-- =============================================
-- Section 1: יסודות (Foundations)
-- =============================================

-- Unit 1: ברכות והיכרות (Greetings & Introductions)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_greetings', 93, 1),    -- שלום → שלום
('unit_greetings', 122, 2),   -- סור סלאמאת → שלום
('unit_greetings', 114, 3),   -- סבח-אחייבו → בוקר טוב
('unit_greetings', 117, 4),   -- שב אחייבו → ערב טוב
('unit_greetings', 118, 5),   -- שב חוש → לילה טוב
('unit_greetings', 104, 6),   -- סוחבושי → תודה
('unit_greetings', 105, 7),   -- סוחבושיט → תודה רבה
('unit_greetings', 91, 8),    -- חוש אומוריי → ברוך הבא
('unit_greetings', 92, 9),    -- חוש אומוריית → ברוכים הבאים
('unit_greetings', 95, 10),   -- הובייטו צ'וטאמי → מה שלומך?
('unit_greetings', 119, 11),  -- סאלאמת בושיט → תהיו בשלום
('unit_greetings', 115, 12),  -- רוז אחייבו → צהריים טובים
('unit_greetings', 94, 13),   -- צ'ו חאבר → מה קורה
('unit_greetings', 100, 14),  -- נום ט'ו צ'וטאמי → איך קוראים לך?
('unit_greetings', 102, 15);  -- נום מא → השם שלי...

-- Unit 2: מספרים 1-10 (Numbers)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_numbers', 20280, 1),   -- ז'אֶ → אחד
('unit_numbers', 167, 2),     -- דִי → שניים
('unit_numbers', 1059, 3),    -- סאֶסאֶ → שלוש
('unit_numbers', 17320, 4),   -- ג'וֹר → ארבע
('unit_numbers', 22920, 5),   -- פּאֶנצ' → חמש
('unit_numbers', 24443, 6),   -- שאֶש → שש
('unit_numbers', 873, 7),     -- חוֹפט → שבע
('unit_numbers', 131, 8),     -- חאֶשט → שמונה
('unit_numbers', 22525, 9),   -- ניה → תשע
('unit_numbers', 125, 10);    -- דוּדוּ → 2 (alternate form)

-- Unit 3: צבעים (Colors)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_colors', 636, 1),   -- גירמיזי → אדום
('unit_colors', 637, 2),   -- קוהו → כחול
('unit_colors', 638, 3),   -- זרד → צהוב
('unit_colors', 639, 4),   -- סאוז → ירוק
('unit_colors', 640, 5),   -- סיפי → לבן
('unit_colors', 641, 6),   -- סייה → שחור
('unit_colors', 622, 7),   -- גֶרְמִי → חום
('unit_colors', 642, 8),   -- מיחק'י → חום
('unit_colors', 16633, 9), -- בּאֶנאֶוש → סגול
('unit_colors', 684, 10);  -- זאֶרדאֶ → צהוב (alternate)

-- Unit 4: משפחה (Family)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_family', 443, 1),   -- פפה → אבא
('unit_family', 442, 2),   -- דדי → אמא
('unit_family', 444, 3),   -- קוֹק → בן
('unit_family', 446, 4),   -- דוחטר → ילדה/בת
('unit_family', 445, 5),   -- גדה → ילד/בן
('unit_family', 448, 6),   -- חאהר → אחות
('unit_family', 438, 7),   -- קלה בבה → סבא מצד אבא
('unit_family', 439, 8),   -- קלה דדיי → סבתא מצד אבא
('unit_family', 440, 9),   -- בבה חולו → סבא מצד אמא
('unit_family', 441, 10),  -- דדיי חולו → סבתא מצד אמא
('unit_family', 453, 11),  -- ללה → דוד מצד אבא
('unit_family', 452, 12),  -- אמה → דודה מצד אבא
('unit_family', 449, 13),  -- חולו → דוד מצד אמא
('unit_family', 451, 14),  -- חולה → דודה מצד אמא
('unit_family', 435, 15);  -- קיפלט → משפחה

-- =============================================
-- Section 2: חיי יום-יום (Daily Life)
-- =============================================

-- Unit 5: אוכל בסיסי (Basic Food)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_food_basic', 605, 1),   -- נוּן → לחם
('unit_food_basic', 767, 2),   -- אוב → מים
('unit_food_basic', 705, 3),   -- גוּשט → בשר
('unit_food_basic', 648, 4),   -- כֶּרְג → עוף
('unit_food_basic', 762, 5),   -- ג'אח → דג
('unit_food_basic', 707, 6),   -- חוֹז'אֶ → ביצה
('unit_food_basic', 606, 7),   -- מֶיְוֶוע → פירות
('unit_food_basic', 426, 8),   -- סִיבּ → תפוח
('unit_food_basic', 759, 9),   -- פּוֹמוֹדוּר → עגבנייה
('unit_food_basic', 760, 10),  -- חיור → מלפפון
('unit_food_basic', 758, 11),  -- פיוז → בצל
('unit_food_basic', 784, 12),  -- צ'וי → תה
('unit_food_basic', 815, 13),  -- רובונד → שמן
('unit_food_basic', 543, 14),  -- צ'י → אוכל
('unit_food_basic', 293, 15);  -- חוּרְדַא → לאכול

-- Unit 6: בבית (At Home)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_home', 1, 1),    -- חוּנַה → בית
('unit_home', 2, 2),    -- דֶר → דלת
('unit_home', 4, 3),    -- פֶּנְגֶ'רַה → חלון
('unit_home', 5, 4),    -- בּוּן → גג
('unit_home', 7, 5),    -- לַמְפּוּצְקֶה → מנורה
('unit_home', 12, 6),   -- דִיבַן → ספה
('unit_home', 15, 7),   -- שִׁילְחַן → שולחן
('unit_home', 21, 8),   -- אוֹטוֹג → מיטה
('unit_home', 23, 9),   -- לוֹחְצֶ'ג → ארון
('unit_home', 17, 10),  -- חַאמוּם → מקלחת
('unit_home', 18, 11),  -- גוּזְגִי → מראה
('unit_home', 19, 12),  -- קְרַנְט → ברז
('unit_home', 13, 13),  -- כּוֹלִינְצֶ'ה → שטיח
('unit_home', 9, 14),   -- פֶּרְדַה → וילון
('unit_home', 29, 15);  -- בּוֹלוּשׁ → כרית

-- Unit 7: הגוף (Body)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_body', 501, 1),   -- סֶרוֹ → ראש
('unit_body', 502, 2),   -- מוּיוֹ → שיער
('unit_body', 503, 3),   -- רוּי → פנים
('unit_body', 504, 4),   -- צ'וּמוֹ → עיניים
('unit_body', 508, 5),   -- גוּשׁוֹ → אוזניים
('unit_body', 511, 6),   -- זוּהוּן → לשון
('unit_body', 515, 7),   -- גֶרְדֶנוֹ → צוואר
('unit_body', 517, 8),   -- דוּשׁוֹ → כתפיים
('unit_body', 520, 9),   -- שוּרַאמוֹ → בטן
('unit_body', 527, 10),  -- פּוֹיוֹ → רגליים
('unit_body', 523, 11),  -- אֶנְגוֹשְׁטוֹ → אצבעות
('unit_body', 522, 12);  -- דַאסוֹ → כפות ידיים

-- Unit 8: בגדים (Clothing)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_clothing', 476, 1),   -- שַאִי → חולצה
('unit_clothing', 477, 2),   -- שׁוֹוֹל → מכנס
('unit_clothing', 490, 3),   -- בּוֹרְשֶׁי → שמלה
('unit_clothing', 498, 4),   -- יוּפְּכֶּא → חצאית
('unit_clothing', 479, 5),   -- שוֹפּכּאֶ → כובע
('unit_clothing', 480, 6),   -- שַׁארְף → צעיף
('unit_clothing', 483, 7),   -- כּוּרוּטְכֶּא → מעיל
('unit_clothing', 485, 8),   -- ז'ִיכֶּט → ג'קט
('unit_clothing', 489, 9),   -- עֶלְזֶ'ג → כפפות
('unit_clothing', 492, 10),  -- דְז'וּרוּבּ → גרביים
('unit_clothing', 494, 11),  -- מַאחְס → נעליים
('unit_clothing', 495, 12);  -- כְּרַאסוֹפְכִּי → נעלי ספורט

-- =============================================
-- Section 3: תרבות ומסורת (Culture & Tradition)
-- =============================================

-- Unit 9: שולחן השבת (Shabbat Table)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_shabbat', 166, 1),    -- שוֹבּוֹט → שבת
('unit_shabbat', 42, 2),     -- לַרְגַה → כף
('unit_shabbat', 44, 3),     -- וִילְקֶה → מזלג
('unit_shabbat', 45, 4),     -- קוֹרְדַה → סכין
('unit_shabbat', 46, 5),     -- בּוּרְמֶה → צלחת
('unit_shabbat', 47, 6),     -- פֶיְלַה → כוס
('unit_shabbat', 605, 7),    -- נוּן → לחם
('unit_shabbat', 1112, 8),   -- גודוש → קידוש
('unit_shabbat', 698, 9),    -- חאֶז'כּאֶל → בית כנסת
('unit_shabbat', 111, 10),   -- חוּדוֹ → אלוהים
('unit_shabbat', 15, 11),    -- שִׁילְחַן → שולחן
('unit_shabbat', 43, 12);    -- לַרְגַה צ'וֹיִי → כפית

-- Unit 10: חגים (Holidays)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_holidays', 889, 1),   -- מעיד → חג
('unit_holidays', 828, 2),   -- ניסוֹנוּ → פסח
('unit_holidays', 423, 3),   -- רוּשׁ אַשׁוֹנֶע → ראש השנה
('unit_holidays', 424, 4),   -- טַזַא סַל → שנה חדשה
('unit_holidays', 430, 5),   -- הוּבֶּע סַל → שנה טובה
('unit_holidays', 431, 6),   -- סימנטובו מיגיד אישמו → חג שמח
('unit_holidays', 432, 7),   -- מוֹזֶלְמֶנְדֶע סַל → שנה מוצלחת
('unit_holidays', 428, 8),   -- סִיבּ אַאַסַלִי → תפוח בדבש
('unit_holidays', 433, 9),   -- שתגיעו לשנים מאושרות
('unit_holidays', 121, 10),  -- חודו קומאק → השם יעזור
('unit_holidays', 170, 11),  -- סַאל → שנה
('unit_holidays', 429, 12);  -- סֶר זַ'רְג → ראש של דג

-- Unit 11: הכנסת אורחים (Hospitality)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_hospitality', 91, 1),    -- חוש אומוריי → ברוך הבא
('unit_hospitality', 92, 2),    -- חוש אומוריית → ברוכים הבאים
('unit_hospitality', 104, 3),   -- סוחבושי → תודה
('unit_hospitality', 105, 4),   -- סוחבושיט → תודה רבה
('unit_hospitality', 784, 5),   -- צ'וי → תה
('unit_hospitality', 47, 6),    -- פֶיְלַה → כוס
('unit_hospitality', 543, 7),   -- צ'י → אוכל
('unit_hospitality', 312, 8),   -- נוּשְטַא → לשבת
('unit_hospitality', 293, 9),   -- חוּרְדַא → לאכול
('unit_hospitality', 434, 10),  -- הודומייו חונה → אנשי הבית
('unit_hospitality', 119, 11),  -- סאלאמת בושיט → תהיו בשלום
('unit_hospitality', 120, 12);  -- סאלאמתא ראח → דרך צלחה

-- Unit 12: טבע וסביבה (Nature)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_nature', 645, 1),    -- סֶג → כלב
('unit_nature', 646, 2),    -- נַא-זוּ → חתול
('unit_nature', 650, 3),    -- גוֹב → פרה
('unit_nature', 654, 4),    -- אַסְפּ → סוס
('unit_nature', 614, 5),    -- וֹרוּש → גשם
('unit_nature', 617, 6),    -- וֶרְף → שלג
('unit_nature', 618, 7),    -- וֹרְוֹרִי → רוח
('unit_nature', 545, 8),    -- חוֹרי → אדמה
('unit_nature', 890, 9),    -- דריו → ים
('unit_nature', 895, 10),   -- ניקארה → נהר
('unit_nature', 939, 11),   -- אַסטאַר → כוכב
('unit_nature', 1057, 12);  -- צ'ושמה → ירח

-- =============================================
-- Section 4: ביטויים וחוכמה (Expressions & Wisdom)
-- =============================================

-- Unit 13: ביטויים יומיומיים (Daily Expressions)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_daily_expressions', 94, 1),    -- צ'ו חאבר → מה קורה
('unit_daily_expressions', 95, 2),    -- הובייטו צ'וטאמי → מה שלומך?
('unit_daily_expressions', 99, 3),    -- חובים → אנחנו בסדר
('unit_daily_expressions', 100, 4),   -- נום ט'ו צ'וטאמי → איך קוראים לך?
('unit_daily_expressions', 103, 5),   -- קיני ט'ו → מי אתה?
('unit_daily_expressions', 153, 6),   -- סַאאַת צֶ'נְדִי → מה השעה?
('unit_daily_expressions', 116, 7),   -- שחנגום אחייבו → אחר הצהריים
('unit_daily_expressions', 120, 8),   -- סאלאמתא ראח → דרך צלחה
('unit_daily_expressions', 564, 9),   -- צ'וֹי עֶ דֶם וַא → התה בהכנה
('unit_daily_expressions', 121, 10),  -- חודו קומאק → השם יעזור
('unit_daily_expressions', 96, 11),   -- הובושמו צ'וטאמי → מה שלומכם?
('unit_daily_expressions', 101, 12),  -- אישמו צ'וטאמית → איך אתם?
('unit_daily_expressions', 734, 13),  -- צ'ו סוחטני טו → מה אתה עושה
('unit_daily_expressions', 727, 14),  -- גדיי קיני טו → הבן של מי אתה
('unit_daily_expressions', 750, 15);  -- ברה החונה → לך הביתה

-- Unit 14: פתגמים (Proverbs)
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_proverbs', 430, 1),   -- הוּבֶּע סַל → שנה טובה
('unit_proverbs', 431, 2),   -- סימנטובו מיגיד אישמו → חג שמח
('unit_proverbs', 432, 3),   -- מוֹזֶלְמֶנְדֶע סַל → שנה מוצלחת
('unit_proverbs', 433, 4),   -- שתגיעו לשנים מאושרות
('unit_proverbs', 428, 5),   -- סִיבּ אַאַסַלִי → תפוח בדבש
('unit_proverbs', 429, 6),   -- סֶר זַ'רְג → ראש של דג
('unit_proverbs', 119, 7),   -- סאלאמת בושיט → תהיו בשלום
('unit_proverbs', 120, 8),   -- סאלאמתא ראח → דרך צלחה
('unit_proverbs', 121, 9),   -- חודו קומאק → השם יעזור
('unit_proverbs', 437, 10);  -- קלטהו → המבוגרים מאיתנו

-- Unit 15: שירים ושירות (Songs)
-- Reuse culturally significant words from across sections
INSERT INTO unit_words (unit_id, entry_id, display_order) VALUES
('unit_songs', 93, 1),     -- שלום → שלום
('unit_songs', 435, 2),    -- קיפלט → משפחה
('unit_songs', 442, 3),    -- דדי → אמא
('unit_songs', 443, 4),    -- פפה → אבא
('unit_songs', 1, 5),      -- חוּנַה → בית
('unit_songs', 111, 6),    -- חוּדוֹ → אלוהים
('unit_songs', 767, 7),    -- אוב → מים
('unit_songs', 605, 8),    -- נוּן → לחם
('unit_songs', 939, 9),    -- אַסטאַר → כוכב
('unit_songs', 890, 10);   -- דריו → ים
