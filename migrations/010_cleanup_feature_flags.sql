-- Migration 010: Cleanup feature flags
-- Remove always-on features that don't need management
-- Add tutor_module as coming_soon

DELETE FROM feature_flags WHERE feature_key IN ('community_widgets', 'gamification', 'audio_recordings');

INSERT IGNORE INTO feature_flags (feature_key, name, description, status)
  VALUES ('tutor_module', 'מורה פרטי', 'שיעורים מונחי בינה מלאכותית', 'coming_soon');
