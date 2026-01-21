-- Migration 008: Add audio support to translation suggestions
-- Allows users to record pronunciation when submitting translation suggestions

-- Add audio_url column to store the path to the audio file
ALTER TABLE translation_suggestions
ADD COLUMN IF NOT EXISTS audio_url VARCHAR(255) NULL COMMENT 'Path to audio pronunciation file';

-- Add audio_duration column to store recording length
ALTER TABLE translation_suggestions
ADD COLUMN IF NOT EXISTS audio_duration INT NULL COMMENT 'Duration in seconds';
