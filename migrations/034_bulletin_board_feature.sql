-- Migration 034: Add Community Bulletin Board feature flag
INSERT INTO feature_flags
  (feature_key, name, name_en, name_ru, description, status, icon, link, sort_order, show_in_nav, show_in_footer)
VALUES
  ('bulletin_board_module', 'לוח מודעות קהילתי', 'Community Bulletin Board', 'Доска объявлений', 'שתפו הודעות, אירועים וחדשות עם חברי הקהילה.', 'coming_soon', 'Megaphone', '/bulletin-board', 7, 1, 1);
