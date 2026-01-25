-- Migration: Add current_residence column to family_members
-- Adds a field for storing current living location for living people

ALTER TABLE family_members
ADD COLUMN IF NOT EXISTS current_residence VARCHAR(255)
COMMENT 'Current place of residence for living people'
AFTER death_place;
