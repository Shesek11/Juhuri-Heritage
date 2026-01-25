-- Create Mock Family Data - 4 Generations with Logical Relationships
-- This script creates a realistic family tree with all relationship types

-- First, clear existing data (optional - comment out if you want to keep existing data)
-- DELETE FROM parent_child_relationships;
-- DELETE FROM partnerships;
-- DELETE FROM family_members WHERE id > 1000; -- Only delete mock data

-- ===== GENERATION 0: Great-Grandparents (1920s-1940s) =====

-- Patriarch and Matriarch of the family (married)
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, death_date, is_alive, birth_place, biography, generation)
VALUES
(1001, 'דוד', 'כהן', 'male', '1925-03-15', '2005-12-20', false, 'דרבנט, דגסטן', 'הוא היה סבא רבא של המשפחה, עבד כסנדלר במשך 50 שנה', 0),
(1002, 'שרה', 'כהן', 'female', '1928-07-22', '2010-05-10', false, 'קובה, אזרבייג''ן', 'היא הייתה סבתא רבא, ידועה בבישול הג''והורי המסורתי שלה', 0);

-- Second couple (married, later divorced)
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, death_date, is_alive, birth_place, biography, generation)
VALUES
(1003, 'משה', 'לוי', NULL, 'male', '1930-01-10', '2015-08-15', false, 'באקו, אזרבייג''ן', 'סבא רבא מצד האמא, היה מורה למתמטיקה', 0),
(1004, 'רבקה', 'לוי', 'יעקובוב', 'female', '1932-11-05', NULL, true, 'נלצ''יק, קברדינו-בלקריה', 'סבתא רבא מצד האמא, עדיין בחיים', 0);

-- ===== GENERATION 1: Grandparents (1950s-1960s) =====

-- David & Sarah's children
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(2001, 'אברהם', 'כהן', NULL, 'male', '1950-06-18', true, 'דרבנט, דגסטן', 'בנם הבכור של דוד ושרה, עורך דין', 1),
(2002, 'מרים', 'כהן', 'לוי', 'female', '1952-09-25', true, 'באקו, אזרבייג''ן', 'בתם של משה ורבקה, נישאה לאברהם', 1),
(2003, 'יוסף', 'כהן', NULL, 'male', '1955-02-14', true, 'דרבנת, דגסטן', 'בנם השני של דוד ושרה, רופא', 1);

-- Yosef's first wife (divorced)
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(2004, 'רחל', 'גולדשטיין', 'דניאלוב', 'female', '1957-04-20', true, 'מחצ''קלה, דגסטן', 'אשתו הראשונה של יוסף, התגרשו ב-1985', 1);

-- Yosef's second wife (current)
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(2005, 'אסתר', 'כהן', 'יצחקוב', 'female', '1960-08-12', true, 'קובה, אזרבייג''ן', 'אשתו השנייה של יוסף, נישאו ב-1987', 1);

-- Moshe & Rebecca's other child
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(2006, 'דניאל', 'לוי', 'male', '1955-12-30', true, 'באקו, אזרבייג''ן', 'בנם של משה ורבקה, מהנדס', 1),
(2007, 'חנה', 'לוי', 'female', '1958-03-08', true, 'תל אביב, ישראל', 'אשתו של דניאל', 1);

-- ===== GENERATION 2: Parents (1970s-1990s) =====

-- Abraham & Miriam's children (biological)
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3001, 'שמואל', 'כהן', NULL, 'male', '1975-03-10', true, 'ירושלים, ישראל', 'בנם הבכור של אברהם ומרים, מהנדס תוכנה', 2),
(3002, 'דבורה', 'שפירא', 'כהן', 'female', '1978-07-22', true, 'תל אביב, ישראל', 'בתם של אברהם ומרים, מורה', 2),
(3003, 'לאה', 'כהן', NULL, 'female', '1982-11-15', true, 'חיפה, ישראל', 'בתם הצעירה של אברהם ומרים, רופאה', 2);

-- Shmuel's wife
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3004, 'תמר', 'כהן', 'אבני', 'female', '1976-05-18', true, 'ירושלים, ישראל', 'אשתו של שמואל, עורכת דין', 2);

-- Deborah's husband
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3005, 'בנימין', 'שפירא', 'male', '1975-09-30', true, 'רמת גן, ישראל', 'בעלה של דבורה, אדריכל', 2);

-- Yosef's children from first marriage (biological, half-siblings to later children)
INSERT INTO family_members (id, first_name, last_name, maiden_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3006, 'נועם', 'כהן', NULL, 'male', '1980-01-25', true, 'תל אביב, ישראל', 'בנו של יוסף מנישואיו הראשונים, מוזיקאי', 2),
(3007, 'מיכל', 'ברק', 'כהן', 'female', '1982-06-14', true, 'תל אביב, ישראל', 'בתו של יוסף מנישואיו הראשונים, אמנית', 2);

-- Yosef's children from second marriage (biological, half-siblings to earlier children)
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3008, 'אלי', 'כהן', 'male', '1990-04-20', true, 'ירושלים, ישראל', 'בנו של יוסף ואסתר מנישואיהם השניים', 2),
(3009, 'שירה', 'כהן', 'female', '1993-08-08', true, 'ירושלים, ישראל', 'בתם של יוסף ואסתר מנישואיהם השניים', 2);

-- Daniel & Hannah's children (including one adopted)
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3010, 'גיל', 'לוי', 'male', '1985-02-28', true, 'תל אביב, ישראל', 'בנם הביולוגי של דניאל וחנה', 2),
(3011, 'רוני', 'לוי', 'male', '1988-12-05', true, 'אתיופיה', 'בנם המאומץ של דניאל וחנה, אומץ ב-1990', 2);

-- Michal's husband
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(3012, 'אורי', 'ברק', 'male', '1980-11-22', true, 'חיפה, ישראל', 'בעלה של מיכל, גרפיקאי', 2);

-- ===== GENERATION 3: Current Generation - Children (2000s-2020s) =====

-- Shmuel & Tamar's children
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(4001, 'יונתן', 'כהן', 'male', '2005-04-12', true, 'ירושלים, ישראל', 'בנם הבכור של שמואל ותמר, תלמיד תיכון', 3),
(4002, 'נועה', 'כהן', 'female', '2008-09-20', true, 'ירושלים, ישראל', 'בתם של שמואל ותמר, תלמידת חטיבה', 3),
(4003, 'אריאל', 'כהן', 'male', '2012-01-15', true, 'ירושלים, ישראל', 'בנם הצעיר של שמואל ותמר', 3);

-- Benjamin & Deborah's children
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(4004, 'מאיה', 'שפירא', 'female', '2006-07-30', true, 'רמת גן, ישראל', 'בתם של בנימין ודבורה', 3),
(4005, 'עידו', 'שפירא', 'male', '2010-11-08', true, 'רמת גן, ישראל', 'בנם של בנימין ודבורה', 3);

-- Uri & Michal's children
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(4006, 'תום', 'ברק', 'male', '2010-03-25', true, 'חיפה, ישראל', 'בנם של אורי ומיכל', 3),
(4007, 'יעל', 'ברק', 'female', '2013-06-18', true, 'חיפה, ישראל', 'בתם של אורי ומיכל', 3);

-- Gil's children
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(4008, 'אביב', 'לוי', 'male', '2015-05-10', true, 'תל אביב, ישראל', 'בנו של גיל', 3);

-- Eli's children
INSERT INTO family_members (id, first_name, last_name, gender, birth_date, is_alive, birth_place, biography, generation)
VALUES
(4009, 'דניאלה', 'כהן', 'female', '2018-08-22', true, 'ירושלים, ישראל', 'בתו של אלי', 3);

-- ==========================================
-- PARTNERSHIPS (MARRIAGES/RELATIONSHIPS)
-- ==========================================

-- Generation 0 partnerships
INSERT INTO partnerships (person1_id, person2_id, status, start_date, marriage_place, notes)
VALUES
-- David & Sarah (married, both deceased)
(1001, 1002, 'widowed', '1948-06-10', 'דרבנט, דגסטן', 'נישאו 57 שנה עד למות דוד'),

-- Moshe & Rebecca (divorced)
(1003, 1004, 'divorced', '1952-03-20', 'באקו, אזרבייג''ן', 'התגרשו ב-1990 לאחר 38 שנות נישואין');

-- Generation 1 partnerships
INSERT INTO partnerships (person1_id, person2_id, status, start_date, marriage_place, notes)
VALUES
-- Abraham & Miriam (married)
(2001, 2002, 'married', '1974-08-15', 'ירושלים, ישראל', 'נישאו כמעט 50 שנה'),

-- Yosef & Rachel (first marriage, divorced)
(2003, 2004, 'divorced', '1978-05-20', 'מחצ''קלה, דגסטן', 'התגרשו ב-1985 לאחר 7 שנות נישואין'),

-- Yosef & Esther (second marriage, current)
(2003, 2005, 'married', '1987-11-15', 'ירושלים, ישראל', 'נישאו כ-37 שנים'),

-- Daniel & Hannah (married)
(2006, 2007, 'married', '1980-07-04', 'תל אביב, ישראל', 'נישאו מעל 40 שנה');

-- Generation 2 partnerships
INSERT INTO partnerships (person1_id, person2_id, status, start_date, marriage_place, notes)
VALUES
-- Shmuel & Tamar (married)
(3001, 3004, 'married', '2003-06-25', 'ירושלים, ישראל', 'נישאו כ-21 שנים'),

-- Benjamin & Deborah (married)
(3005, 3002, 'married', '2004-09-12', 'תל אביב, ישראל', 'נישאו 20 שנה'),

-- Uri & Michal (married)
(3012, 3007, 'married', '2008-05-18', 'חיפה, ישראל', 'נישאו כ-16 שנים');

-- ==========================================
-- PARENT-CHILD RELATIONSHIPS
-- ==========================================

-- Generation 0 → Generation 1
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, notes)
VALUES
-- David & Sarah's children
(1001, 2001, 'biological', 'דוד הוא אביו הביולוגי של אברהם'),
(1002, 2001, 'biological', 'שרה היא אמו הביולוגית של אברהם'),
(1001, 2003, 'biological', 'דוד הוא אביו הביולוגי של יוסף'),
(1002, 2003, 'biological', 'שרה היא אמו הביולוגית של יוסף'),

-- Moshe & Rebecca's children
(1003, 2002, 'biological', 'משה הוא אביה הביולוגי של מרים'),
(1004, 2002, 'biological', 'רבקה היא אמה הביולוגית של מרים'),
(1003, 2006, 'biological', 'משה הוא אביו הביולוגי של דניאל'),
(1004, 2006, 'biological', 'רבקה היא אמו הביולוגית של דניאל');

-- Generation 1 → Generation 2
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, notes)
VALUES
-- Abraham & Miriam's children (all biological)
(2001, 3001, 'biological', 'אברהם הוא אביו הביולוגי של שמואל'),
(2002, 3001, 'biological', 'מרים היא אמו הביולוגית של שמואל'),
(2001, 3002, 'biological', 'אברהם הוא אביה הביולוגי של דבורה'),
(2002, 3002, 'biological', 'מרים היא אמה הביולוגית של דבורה'),
(2001, 3003, 'biological', 'אברהם הוא אביה הביולוגי של לאה'),
(2002, 3003, 'biological', 'מרים היא אמה הביולוגית של לאה'),

-- Yosef's children from first marriage (biological, half-siblings)
(2003, 3006, 'biological', 'יוסף הוא אביו הביולוגי של נועם'),
(2004, 3006, 'biological', 'רחל היא אמו הביולוגית של נועם'),
(2003, 3007, 'biological', 'יוסף הוא אביה הביולוגי של מיכל'),
(2004, 3007, 'biological', 'רחל היא אמה הביולוגית של מיכל'),

-- Yosef's children from second marriage (biological, half-siblings)
(2003, 3008, 'biological', 'יוסף הוא אביו הביולוגי של אלי'),
(2005, 3008, 'biological', 'אסתר היא אמו הביולוגית של אלי'),
(2003, 3009, 'biological', 'יוסף הוא אביה הביולוגי של שירה'),
(2005, 3009, 'biological', 'אסתר היא אמה הביולוגית של שירה'),

-- Daniel & Hannah's children (one biological, one adopted)
(2006, 3010, 'biological', 'דניאל הוא אביו הביולוגי של גיל'),
(2007, 3010, 'biological', 'חנה היא אמו הביולוגית של גיל'),
(2006, 3011, 'adopted', 'דניאל הוא אביו המאמץ של רוני - אומץ ב-1990'),
(2007, 3011, 'adopted', 'חנה היא אמו המאמצת של רוני - אומץ ב-1990');

-- Generation 2 → Generation 3
INSERT INTO parent_child_relationships (parent_id, child_id, relationship_type, notes)
VALUES
-- Shmuel & Tamar's children
(3001, 4001, 'biological', 'שמואל הוא אביו הביולוגי של יונתן'),
(3004, 4001, 'biological', 'תמר היא אמו הביולוגית של יונתן'),
(3001, 4002, 'biological', 'שמואל הוא אביה הביולוגי של נועה'),
(3004, 4002, 'biological', 'תמר היא אמה הביולוגית של נועה'),
(3001, 4003, 'biological', 'שמואל הוא אביו הביולוגי של אריאל'),
(3004, 4003, 'biological', 'תמר היא אמו הביולוגית של אריאל'),

-- Benjamin & Deborah's children
(3005, 4004, 'biological', 'בנימין הוא אביה הביולוגי של מאיה'),
(3002, 4004, 'biological', 'דבורה היא אמה הביולוגית של מאיה'),
(3005, 4005, 'biological', 'בנימין הוא אביו הביולוגי של עידו'),
(3002, 4005, 'biological', 'דבורה היא אמו הביולוגית של עידו'),

-- Uri & Michal's children
(3012, 4006, 'biological', 'אורי הוא אביו הביולוגי של תום'),
(3007, 4006, 'biological', 'מיכל היא אמו הביולוגית של תום'),
(3012, 4007, 'biological', 'אורי הוא אביה הביולוגי של יעל'),
(3007, 4007, 'biological', 'מיכל היא אמה הביולוגית של יעל'),

-- Gil's child
(3010, 4008, 'biological', 'גיל הוא אביו הביולוגי של אביב'),

-- Eli's child
(3008, 4009, 'biological', 'אלי הוא אביה הביולוגי של דניאלה');

-- ==========================================
-- SUMMARY OF MOCK DATA
-- ==========================================
-- Generation 0: 4 people (2 couples - one married/widowed, one divorced)
-- Generation 1: 7 people (3 couples - one remarried after divorce)
-- Generation 2: 12 people (including adopted child, half-siblings from remarriage)
-- Generation 3: 9 people (current generation)
--
-- Total: 32 people across 4 generations
--
-- Relationship types included:
-- ✓ Biological parent-child
-- ✓ Adopted parent-child
-- ✓ Married partnerships
-- ✓ Divorced partnerships
-- ✓ Widowed partnerships
-- ✓ Remarriage (creating half-siblings)
-- ✓ Full siblings
-- ✓ Half-siblings (same father, different mothers)
